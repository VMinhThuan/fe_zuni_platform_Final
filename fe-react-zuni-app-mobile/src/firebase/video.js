import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
  Dimensions,
  SafeAreaView,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices, RTCView } from 'react-native-webrtc';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSocket } from '../../contexts/socket.context';
import { useCurrentApp } from '../../contexts/app.context';

// Đặt filterH264 ở đầu file, ngoài component
function filterH264(sdp) {
  const lines = sdp.split('\r\n');
  const mLineIndex = lines.findIndex(line => line.startsWith('m=video'));
  if (mLineIndex === -1) return sdp;
  let bestPayload = null;
  lines.forEach(line => {
    if (line.startsWith('a=rtpmap:')) {
      const match = line.match(/^a=rtpmap:(\d+) H264\/90000/);
      if (match) {
        const pt = match[1];
        const fmtpLine = lines.find(l => l.startsWith(`a=fmtp:${pt}`));
        if (
          fmtpLine &&
          fmtpLine.includes('packetization-mode=1') &&
          (fmtpLine.includes('profile-level-id=42e01f') || fmtpLine.includes('profile-level-id=42001f'))
        ) {
          bestPayload = pt;
        }
      }
    }
  });
  if (!bestPayload) {
    lines.forEach(line => {
      if (line.startsWith('a=rtpmap:')) {
        const match = line.match(/^a=rtpmap:(\d+) H264\/90000/);
        if (match) {
          const pt = match[1];
          const fmtpLine = lines.find(l => l.startsWith(`a=fmtp:${pt}`));
          if (
            fmtpLine &&
            fmtpLine.includes('packetization-mode=0') &&
            (fmtpLine.includes('profile-level-id=42e01f') || fmtpLine.includes('profile-level-id=42001f'))
          ) {
            bestPayload = pt;
          }
        }
      }
    });
  }
  if (!bestPayload) return sdp;
  const mLine = lines[mLineIndex];
  const mLineParts = mLine.split(' ');
  const newMLine = mLineParts.slice(0, 3).join(' ') + ' ' + bestPayload;
  lines[mLineIndex] = newMLine;
  const filteredLines = lines.filter(line => {
    if (line.startsWith('a=rtpmap:') || line.startsWith('a=fmtp:')) {
      const pt = line.match(/^a=(?:rtpmap|fmtp):(\d+)/);
      if (pt && pt[1] !== bestPayload) return false;
    }
    return true;
  });
  return filteredLines.join('\r\n');
}

const VideoCallModal = ({
  isOpen,
  onClose,
  receiver,
  isCallee,
  offer,
  from,
  callId,
  fromName,
  fromAvatar,
}) => {
  console.log('[MODAL] Mở với props:', {
    isOpen,
    isCallee,
    hasOffer: !!offer,
    hasFrom: !!from,
    hasCallId: !!callId,
  });

  const { socket } = useSocket();
  const { user: currentUser } = useCurrentApp();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, connected, ended
  const [iceServers, setIceServers] = useState([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    {
      urls: 'turn:numb.viagenie.ca',
      credential: 'muazkh',
      username: 'webrtc@live.com'
    }
  ]);

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const isCallerRef = useRef(false);
  const [noRemoteStream, setNoRemoteStream] = useState(false);
  const [isAccepted, setIsAccepted] = useState(!isCallee);
  const [callDuration, setCallDuration] = useState(0); // giây
  const [timerInterval, setTimerInterval] = useState(null);
  const [cameraType, setCameraType] = useState('front'); // 'front' | 'back'

  // Pulse animation quanh avatar khi đang đổ chuông
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (callStatus === 'calling' || callStatus === 'ringing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [callStatus]);

  useEffect(() => {
    if (isOpen) {
      if (isCallee) {
        setIsAccepted(false);
        setCallStatus('ringing');
      } else {
        setIsAccepted(true);
        setCallStatus('calling');
        isCallerRef.current = true;
        initializeCall();
      }
      setIsVideoOff(false);
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) videoTrack.enabled = true;
      }
    } else {
      setIsAccepted(!isCallee);
      setCallStatus('idle');
    }
    return () => {
      cleanupCall();
    };
  }, [isOpen]);

  // Lắng nghe cấu hình ICE servers từ server
  useEffect(() => {
    if (!socket) return;

    const handleIceServers = (servers) => {
      console.log('Nhận cấu hình ICE servers:', servers);
      setIceServers(servers);
    };

    socket.on('ice-servers', handleIceServers);

    return () => {
      socket.off('ice-servers', handleIceServers);
    };
  }, [socket]);

  // Thêm useEffect để lắng nghe các sự kiện liên quan đến cuộc gọi
  useEffect(() => {
    if (!socket) return;

    console.log('[MODAL] Đăng ký các listeners cho sự kiện cuộc gọi');
    console.log(
      '[MODAL] Socket connected:',
      socket.connected,
      'Socket ID:',
      socket.id
    );
    console.log(
      '[MODAL] isCallerRef.current:',
      isCallerRef.current,
      'isCallee:',
      isCallee
    );

    const handleCallAccepted = async (data) => {
      console.log('[CALLER] Nhận call-accepted:', data);
      try {
        const answer = data.answer;
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        setCallStatus('connected');

        // Sau khi peer connection đã sẵn sàng, add các ICE candidate pending (cả caller và callee)
        if (pendingCandidatesRef.current.length > 0) {
          console.log(
            '[CALLER] Thêm các pending ICE candidates, số lượng:',
            pendingCandidatesRef.current.length
          );
          for (const candidate of pendingCandidatesRef.current) {
            try {
              await peerConnectionRef.current.addIceCandidate(candidate);
            } catch (err) {
              console.error('[CALLER] Lỗi khi add pending ICE candidate:', err);
            }
          }
          pendingCandidatesRef.current = [];
        }
      } catch (error) {
        console.error('[CALLER] Lỗi khi xử lý answer:', error);
        Alert.alert('Lỗi', 'Lỗi khi thiết lập kết nối');
        handleEndCall();
      }
    };

    const handleIceCandidate = async (data) => {
      console.log('[MODAL] Nhận ICE candidate từ:', data.from);
      try {
        if (!data.candidate) {
          console.log('[MODAL] Không có candidate trong dữ liệu');
          return;
        }

        const candidateObj = new RTCIceCandidate(data.candidate);

        // Nếu chưa có remoteDescription, lưu vào pending
        if (
          !peerConnectionRef.current ||
          !peerConnectionRef.current.remoteDescription ||
          !peerConnectionRef.current.remoteDescription.type
        ) {
          console.log(
            '[MODAL] Chưa có remoteDescription, thêm vào pending candidates'
          );
          pendingCandidatesRef.current.push(candidateObj);
        } else {
          console.log(
            '[MODAL] Đã có remoteDescription, thêm candidate ngay lập tức'
          );
          await peerConnectionRef.current.addIceCandidate(candidateObj);
        }
      } catch (error) {
        console.error('[MODAL] Lỗi khi thêm ICE candidate:', error);
      }
    };

    const handleCallBusy = () => {
      Alert.alert('Thông báo', 'Người dùng đang bận');
      handleEndCall();
    };

    const handleCallTimeout = () => {
      Alert.alert('Thông báo', 'Không có phản hồi từ người dùng');
      handleEndCall();
    };

    const handleCallError = (data) => {
      Alert.alert('Lỗi', data.error || 'Đã xảy ra lỗi trong cuộc gọi');
      handleEndCall();
    };

    const handleCallEnded = (data) => {
      console.log('[MODAL] Nhận call-ended từ:', data.from);
      Alert.alert('Thông báo', 'Cuộc gọi đã kết thúc');
      cleanupCall();
      onClose();
    };

    const handleCallRejected = (data) => {
      console.log(
        '[MODAL] Cuộc gọi bị từ chối bởi:',
        data.from,
        'lý do:',
        data.reason
      );
      console.log(
        '[MODAL] isCallerRef.current:',
        isCallerRef.current,
        'isCallee:',
        isCallee
      );

      // Chỉ hiển thị thông báo nếu là người gọi (caller)
      if (isCallerRef.current && !isCallee) {
        Alert.alert(
          'Thông báo',
          `Cuộc gọi bị từ chối ${
            data.reason === 'user_rejected' ? 'bởi người nhận' : ''
          }`
        );
        console.log('[MODAL] Hiển thị toast thông báo từ chối cho người gọi');
      }

      // Thông báo ra console để debug
      console.log(
        '[MODAL] Đang dọn dẹp tài nguyên và đóng modal sau khi bị từ chối'
      );

      cleanupCall();
      onClose();
    };

    socket.on('call-accepted', handleCallAccepted);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('call-busy', handleCallBusy);
    socket.on('call-timeout', handleCallTimeout);
    socket.on('call-error', handleCallError);
    socket.on('call-ended', handleCallEnded);
    socket.on('call-rejected', handleCallRejected);

    return () => {
      console.log('[MODAL] Hủy đăng ký các listeners cho sự kiện cuộc gọi');
      socket.off('call-accepted', handleCallAccepted);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('call-busy', handleCallBusy);
      socket.off('call-timeout', handleCallTimeout);
      socket.off('call-error', handleCallError);
      socket.off('call-ended', handleCallEnded);
      socket.off('call-rejected', handleCallRejected);
    };
  }, [socket, isCallee]);

  // Nếu là callee, chỉ khi đã accept mới thực hiện nhận cuộc gọi
  useEffect(() => {
    if (isOpen && isCallee && offer && from && isAccepted) {
      console.log('[CALLEE] Đang xử lý offer từ:', from);
      console.log('[CALLEE] Offer data:', offer);

      (async () => {
        try {
          // Kiểm tra offer hợp lệ
          if (!offer || typeof offer !== 'object' || !offer.type || !offer.sdp) {
            console.error('[CALLEE] Offer không hợp lệ:', offer);
            Alert.alert('Lỗi', 'Offer không hợp lệ, không thể thiết lập cuộc gọi!');
            handleEndCall();
            return;
          }

          // --- FILTER SDP CHỈ GIỮ H264 ---
          const normalizedOffer = {
            type: offer.type,
            sdp: filterH264(offer.sdp.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'))
          };

          if (!peerConnectionRef.current) {
            console.log('[CALLEE] Tạo mới RTCPeerConnection');
            const configuration = { 
              iceServers,
              iceCandidatePoolSize: 10,
              bundlePolicy: 'max-bundle',
              rtcpMuxPolicy: 'require',
              iceTransportPolicy: 'all',
              sdpSemantics: 'unified-plan'
            };
            const peerConnection = new RTCPeerConnection(configuration);
            peerConnectionRef.current = peerConnection;

            const stream = await mediaDevices.getUserMedia({
              video: {
                mandatory: {
                  minWidth: 640,
                  minHeight: 480,
                  minFrameRate: 30,
                },
                facingMode: 'user',
                optional: [{ sourceId: true }],
              },
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              },
            });
            // Đảm bảo luôn bật tất cả video track khi lấy stream
            if (stream) {
              stream.getVideoTracks().forEach(track => { track.enabled = true; });
            }
            localStreamRef.current = stream;

            stream.getTracks().forEach((track) => {
              console.log('[CALLEE] Thêm track vào peer connection:', track.kind);
              peerConnection.addTrack(track, stream);
            });

            peerConnection.onicecandidate = (event) => {
              if (event.candidate) {
                console.log('[CALLEE] Gửi ICE candidate:', event.candidate);
                socket.emit('ice-candidate', {
                  candidate: event.candidate,
                  to: from,
                });
              }
            };
            
            peerConnection.ontrack = (event) => {
              console.log('[CALLEE] Nhận track từ remote', event);
              if (event.streams && event.streams[0]) {
                console.log('[CALLEE] Đã nhận remote stream:', event.streams[0].getTracks().map(t => t.kind));
                remoteStreamRef.current = event.streams[0];
                setCallStatus('connected');
                setNoRemoteStream(false);
              } else {
                console.log('[CALLEE] Không có stream trong event.track!');
              }
            };
            
            peerConnection.oniceconnectionstatechange = () => {
              console.log(
                '[CALLEE] ICE state change:',
                peerConnection.iceConnectionState
              );
              if (peerConnection.iceConnectionState === 'failed') {
                Alert.alert('Thông báo', 'Mất kết nối với người dùng');
                handleEndCall();
              }
            };

            peerConnection.onconnectionstatechange = () => {
              console.log('[CALLEE] Connection state:', peerConnection.connectionState);
            };

            peerConnection.onsignalingstatechange = () => {
              console.log('[CALLEE] Signaling state:', peerConnection.signalingState);
            };
          }

          console.log('[CALLEE] Đang setRemoteDescription với offer:', normalizedOffer);
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(normalizedOffer)
          );
          console.log('[CALLEE] setRemoteDescription thành công');

          // Sau khi setRemoteDescription, add các pending ICE candidate
          if (pendingCandidatesRef.current.length > 0) {
            for (const candidate of pendingCandidatesRef.current) {
              try {
                await peerConnectionRef.current.addIceCandidate(candidate);
              } catch (err) {
                console.error('[CALLEE] Lỗi khi add pending ICE candidate:', err);
              }
            }
            pendingCandidatesRef.current = [];
          }

          console.log('[CALLEE] Đang tạo answer...');
          let answer = await peerConnectionRef.current.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
            voiceActivityDetection: true
          });
          console.log('[CALLEE] Đã tạo answer:', answer);          

          console.log('[CALLEE] Đang setLocalDescription với answer');
          await peerConnectionRef.current.setLocalDescription(answer);
          console.log('[CALLEE] Đã setLocalDescription với answer');

          console.log('[CALLEE] Đang gửi accept-call đến:', from);
          socket.emit('accept-call', {
            answer,
            to: from,
            from: currentUser.userId,
          });
          console.log('[CALLEE] Đã gửi accept-call với answer:', answer);
          setCallStatus('connected');
        } catch (err) {
          console.error('[CALLEE] Lỗi khi xử lý incoming-call:', err);
          Alert.alert('Thông báo', 'Không thể thiết lập cuộc gọi');
          handleEndCall();
        }
      })();
    } else if (isOpen && isCallee) {
      console.log(
        '[CALLEE] Không đủ thông tin để xử lý - offer:',
        !!offer,
        'from:',
        !!from
      );
    }
  }, [isOpen, isCallee, offer, from, iceServers, currentUser?.userId, isAccepted]);

  // Bắt đầu/stop timer khi connected
  useEffect(() => {
    if (callStatus === 'connected') {
      setCallDuration(0);
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      setTimerInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (timerInterval) clearInterval(timerInterval);
      setTimerInterval(null);
      setCallDuration(0);
    }
  }, [callStatus]);

  // Định dạng thời gian mm:ss
  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Xoay camera
  const switchCamera = async () => {
    if (!localStreamRef.current) return;
    try {
      // Tìm video track hiện tại
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (!videoTrack) return;
      // Xoay camera bằng cách lấy lại stream với facingMode khác
      const newType = cameraType === 'front' ? 'back' : 'front';
      const newStream = await mediaDevices.getUserMedia({
        video: {
          facingMode: newType === 'front' ? 'user' : 'environment',
          mandatory: {
            minWidth: 640,
            minHeight: 480,
            minFrameRate: 30,
          },
        },
        audio: true,
      });
      // Thay thế video track trong peer connection
      const newVideoTrack = newStream.getVideoTracks()[0];
      // Giữ nguyên trạng thái bật/tắt camera
      if (newVideoTrack) newVideoTrack.enabled = !isVideoOff;
      if (peerConnectionRef.current && newVideoTrack) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      }
      // Dừng track cũ, gán stream mới
      videoTrack.stop();
      localStreamRef.current.removeTrack(videoTrack);
      localStreamRef.current.addTrack(newVideoTrack);
      setCameraType(newType);
    } catch (err) {
      console.error('Lỗi khi xoay camera:', err);
    }
  };

  const initializeCall = async () => {
    try {
      console.log('[CALLER] Bắt đầu initializeCall');

      // Lấy stream từ camera và microphone
      const stream = await mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Đảm bảo luôn bật tất cả video track khi lấy stream
      if (stream) {
        stream.getVideoTracks().forEach(track => { track.enabled = true; });
        stream.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
      }

      localStreamRef.current = stream;

      // Tạo peer connection với cấu hình ICE servers từ server
      const configuration = {
        iceServers,
      };

      console.log(
        '[CALLER] Tạo RTCPeerConnection với cấu hình:',
        configuration
      );
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Thêm local stream vào peer connection (cả audio và video)
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Xử lý ICE candidate
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[CALLER] Gửi ICE candidate đến:', receiver.userId);
          socket.emit('ice-candidate', {
            candidate: event.candidate,
            to: receiver.userId,
          });
        }
      };

      // Xử lý khi nhận được remote stream
      peerConnection.ontrack = (event) => {
        console.log('[CALLER] Nhận track từ remote');
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          setCallStatus('connected');
        }
      };

      // Xử lý lỗi kết nối
      peerConnection.oniceconnectionstatechange = () => {
        console.log(
          '[CALLER] ICE connection state change:',
          peerConnection.iceConnectionState
        );
        if (peerConnection.iceConnectionState === 'failed') {
          Alert.alert('Thông báo', 'Mất kết nối với người dùng');
          handleEndCall();
        }
      };

      // Tạo và gửi offer
      console.log('[CALLER] Tạo offer');
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        voiceActivityDetection: true
      });
      console.log('[CALLER] SetLocalDescription với offer');
      await peerConnection.setLocalDescription(offer);

      console.log('[CALLER] Gửi call-user đến:', receiver.userId);
      socket.emit('call-user', {
        offer,
        to: receiver.userId,
        from: currentUser.userId,
        fromName: currentUser.fullName,
        fromAvatar: currentUser.avatar,
      });

      setCallStatus('calling');
    } catch (error) {
      console.error('[CALLER] Lỗi khi khởi tạo cuộc gọi:', error);
      Alert.alert('Thông báo', 'Không thể truy cập camera/microphone');
      onClose();
    }
  };

  const cleanupCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    pendingCandidatesRef.current = [];
    isCallerRef.current = false;
    setCallStatus('idle');
  };

  const handleEndCall = () => {
    console.log('[MODAL] Kết thúc cuộc gọi');

    if (socket && peerConnectionRef.current) {
      // Xác định ID của đối phương dựa trên vai trò của người dùng
      const targetUserId = isCallee ? from : receiver?.userId;

      if (targetUserId) {
        console.log('[MODAL] Gửi end-call đến:', targetUserId);
        socket.emit('end-call', {
          to: targetUserId,
          from: currentUser?.userId,
        });
      } else {
        console.error(
          '[MODAL] Không thể xác định ID đối phương để kết thúc cuộc gọi'
        );
      }
    }

    // Dọn dẹp tài nguyên và đóng modal
    cleanupCall();
    onClose();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!isVideoOff);
      }
    }
  };

  // Hàm accept/từ chối cho callee
  const handleAccept = () => {
    setIsAccepted(true);
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = true;
    }
    setIsVideoOff(false);
  };
  const handleReject = () => {
    if (socket && from) {
      socket.emit('reject-call', {
        to: from,
        from: currentUser.userId,
        reason: 'user_rejected',
      });
    }
    onClose && onClose();
  };

  if (!isOpen) return null;

  // Nếu là callee và chưa accept, hiển thị giao diện chờ đồng ý/từ chối
  if (isCallee && !isAccepted) {
    return (
      <Modal
        visible={isOpen}
        animationType="fade"
        onRequestClose={handleReject}
        transparent={true}
      >
        <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }] }>
          <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center', width: 320 }}>
            <Image source={fromAvatar ? { uri: fromAvatar } : require('../../assets/images/defaultAvatar.jpg')} style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 16 }} />
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>{fromName || 'Người gọi'}</Text>
            <Text style={{ color: '#666', marginBottom: 24 }}>đang gọi video cho bạn</Text>
            <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
              <TouchableOpacity
                onPress={handleAccept}
                style={{ flex: 1, backgroundColor: '#22c55e', borderRadius: 8, padding: 14, marginRight: 8, alignItems: 'center' }}
              >
                <Image source={require('../../assets/icons/call_accept.png')} style={{ width: 24, height: 24, tintColor: '#fff' }} />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Chấp nhận</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReject}
                style={{ flex: 1, backgroundColor: '#ef4444', borderRadius: 8, padding: 14, marginLeft: 8, alignItems: 'center' }}
              >
                <Image source={require('../../assets/icons/call_decline.png')} style={{ width: 24, height: 24, tintColor: '#fff', alignSelf: 'center', backgroundColor: 'transparent' }} />
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Từ chối</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      onRequestClose={handleEndCall}
      transparent={false}
    >
      <SafeAreaView style={styles.container}>
        {/* Overlay avatar, tên, trạng thái, back, xoay camera */}
        {callStatus !== 'connected' ? (
          <View style={[styles.overlayTop]}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}>
              <Image source={require('../../assets/icons/arrowLeftIcon.png')} style={{ width: 32, height: 32, tintColor: '#fff' }} />
            </TouchableOpacity>
            <View style={styles.avatarBlock}>
              <Animated.View style={[styles.avatarPulse, { transform: [{ scale: pulseAnim }] }] }>
                <Image
                  source={receiver?.avatar ? { uri: receiver.avatar } : require('../../assets/images/defaultAvatar.jpg')}
                  style={styles.avatarLarge}
                />
              </Animated.View>
              <Text style={styles.callerName}>{receiver?.fullName || ''}</Text>
              <Text style={styles.callerStatus}>Đang đổ chuông</Text>
            </View>
            <TouchableOpacity style={styles.switchCamButton} onPress={switchCamera}>
              <Image source={require('../../assets/icons/switch_camera.png')} style={{ width: 28, height: 28, tintColor: '#fff' }} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.connectedHeader]}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}>
              <Image source={require('../../assets/icons/arrowLeftIcon.png')} style={{ width: 32, height: 32, tintColor: '#fff' }} />
            </TouchableOpacity>
            <View style={styles.connectedHeaderCenter}>
              <Text style={styles.connectedTitle}>{receiver?.fullName || 'Zuni'}</Text>
              <Text style={styles.connectedTimer}>{formatDuration(callDuration)}</Text>
            </View>
            <TouchableOpacity style={styles.switchCamButton} onPress={switchCamera}>
              <Image source={require('../../assets/icons/switch_camera.png')} style={{ width: 28, height: 28, tintColor: '#fff' }} />
            </TouchableOpacity>
          </View>
        )}

        {/* Video background */}
        <View style={styles.videoContainer}>
          {/* Nếu chưa connected, luôn hiển thị local video (nếu có), không hiện overlay "Đã tắt camera" khi đang gọi */}
          {callStatus !== 'connected' ? (
            localStreamRef.current ? (
              <RTCView
                streamURL={localStreamRef.current.toURL()}
                style={styles.remoteVideo}
                objectFit="cover"
                mirror={true}
              />
            ) : (
              <View style={[styles.remoteVideo, { backgroundColor: '#222' }]} />
            )
          ) : (
            // Khi đã connected, hiển son Nightthị remote video full màn hình hoặc avatar nếu remote tắt camera
            remoteStreamRef.current && remoteStreamRef.current.getVideoTracks && remoteStreamRef.current.getVideoTracks().length > 0 && remoteStreamRef.current.getVideoTracks()[0].enabled ? (
              <RTCView
                streamURL={remoteStreamRef.current.toURL()}
                style={styles.remoteVideo}
                objectFit="cover"
                mirror={false}
              />
            ) : (
              <View style={[styles.remoteVideo, { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }]}> 
                {/* Avatar lớn ở giữa */}
                <Image
                  source={receiver?.avatar ? { uri: receiver.avatar } : require('../../assets/images/defaultAvatar.jpg')}
                  style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#fff', marginBottom: 16 }}
                />
                {/* Thông báo tắt camera */}
                <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                  <Image source={require('../../assets/icons/videooff.png')} style={{ width: 20, height: 20, tintColor: '#fff', marginRight: 8 }} />
                  <Text style={{ color: '#fff', fontSize: 16 }}>{receiver?.fullName || 'Người dùng'} đang tắt camera</Text>
                </View>
              </View>
            )
          )}

          {/* Local video nhỏ góc phải dưới chỉ khi đã connected */}
          {callStatus === 'connected' && (
            <View style={styles.localVideoContainer}>
              {localStreamRef.current && !isVideoOff ? (
                <RTCView
                  streamURL={localStreamRef.current.toURL()}
                  style={styles.localVideo}
                  objectFit="cover"
                  mirror={true}
                />
              ) : (
                <View style={[styles.localVideo, { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }]}> 
                  <Image source={require('../../assets/icons/videooff.png')} style={{ width: 32, height: 32, tintColor: '#fff' }} />
                  <Text style={{ color: '#fff', marginTop: 8 }}>Đã tắt camera</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Control bar dưới cùng */}
        <View style={styles.controlBar}>
          <TouchableOpacity onPress={toggleVideo} style={styles.controlCircle}>
            {isVideoOff ? (
              <View style={styles.iconOffWrapper}>
                <Image source={require('../../assets/icons/videoon.png')} style={styles.iconOffImage} />
                <View style={styles.iconSlash} />
              </View>
            ) : (
              <Image source={require('../../assets/icons/videoon.png')} style={{ width: 28, height: 28, tintColor: '#fff' }} />
            )}
            <Text style={styles.controlLabel}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleMute} style={styles.controlCircle}>
            {isMuted ? (
              <View style={styles.iconOffWrapper}>
                <Image source={require('../../assets/icons/micon.png')} style={styles.iconOffImage} />
                <View style={styles.iconSlash} />
              </View>
            ) : (
              <Image source={require('../../assets/icons/micon.png')} style={{ width: 28, height: 28, tintColor: '#fff' }} />
            )}
            <Text style={styles.controlLabel}>Mic</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEndCall} style={[styles.controlCircle, styles.endCallCircle]}>
            <Image source={require('../../assets/icons/call_end.png')} style={{ width: 32, height: 32}} />
            <Text style={styles.controlLabel}>Kết thúc</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlCircle}>
            <Image source={require('../../assets/icons/more.png')} style={{ width: 28, height: 28, tintColor: '#fff' }} />
            <Text style={styles.controlLabel}>Thêm</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  avatarBlock: {
    flex: 1,
    alignItems: 'center',
    marginTop: 12,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#fff',
    marginBottom: 8,
  },
  callerName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  callerStatus: {
    color: '#fff',
    fontSize: 16,
    marginTop: 2,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 36,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 4,
  },
  switchCamButton: {
    position: 'absolute',
    right: 16,
    top: 36,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    padding: 4,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222',
  },
  localVideoContainer: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    width: 96,
    height: 128,
    backgroundColor: '#444',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 20,
  },
  localVideo: {
    flex: 1,
  },
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
  },
  controlCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  endCallCircle: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlLabel: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  connectedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 32,
    paddingBottom: 12,
    backgroundColor: 'transparent', // Không nền đen
  },
  connectedHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  connectedTimer: {
    color: '#7fff7f',
    fontSize: 16,
    marginTop: 2,
    textAlign: 'center',
  },
  avatarPulse: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 48,
    padding: 8,
    marginBottom: 8,
  },
  iconOffWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconOffImage: {
    width: 28,
    height: 28,
    tintColor: '#fff',
  },
  iconSlash: {
    position: 'absolute',
    width: 36,
    height: 3.5,
    backgroundColor: '#111',
    borderRadius: 2,
    top: 22 - 1.75,
    left: 4,
    transform: [{ rotate: '-25deg' }],
    opacity: 0.95,
  },
});

export default VideoCallModal; 