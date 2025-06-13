import { useEffect, useRef, useState } from "react";
import {
  IoCall,
  IoVideocam,
  IoMic,
  IoMicOff,
  IoVideocamOff,
} from "react-icons/io5";
import { FaPhoneSlash } from "react-icons/fa";
import { useSocket } from "../../contexts/socket.context";
import { useCurrentApp } from "../../contexts/app.context";
import { toast } from "react-toastify";

const VideoCallModal = ({
  isOpen,
  onClose,
  receiver,
  isCallee,
  offer,
  from,
  callId,
}) => {
  console.log("[MODAL] Mở với props:", {
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
  const [callStatus, setCallStatus] = useState("idle"); // idle, calling, connected, ended
  const [iceServers, setIceServers] = useState([
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ]);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const isCallerRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (isCallee) {
        console.log("[CALLEE] Modal mở với isCallee=true, chờ xử lý offer");
        // Người nhận sẽ không gọi initializeCall ở đây
        // Sẽ khởi tạo khi nhận incoming-call trong useEffect khác
      } else {
        console.log("[CALLER] Modal mở với isCallee=false, gọi initializeCall");
        isCallerRef.current = true;
        initializeCall();
      }
    }
    return () => {
      cleanupCall();
    };
  }, [isOpen]);

  // Lắng nghe cấu hình ICE servers từ server
  useEffect(() => {
    if (!socket) return;

    const handleIceServers = (servers) => {
      console.log("Nhận cấu hình ICE servers:", servers);
      setIceServers(servers);
    };

    socket.on("ice-servers", handleIceServers);

    return () => {
      socket.off("ice-servers", handleIceServers);
    };
  }, [socket]);

  // Thêm useEffect để lắng nghe các sự kiện liên quan đến cuộc gọi
  useEffect(() => {
    if (!socket) return;

    console.log("[MODAL] Đăng ký các listeners cho sự kiện cuộc gọi");
    console.log(
      "[MODAL] Socket connected:",
      socket.connected,
      "Socket ID:",
      socket.id
    );
    console.log(
      "[MODAL] isCallerRef.current:",
      isCallerRef.current,
      "isCallee:",
      isCallee
    );

    const handleCallAccepted = async (data) => {
      console.log("[CALLER] Nhận call-accepted:", data);
      try {
        const answer = data.answer;
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        setCallStatus("connected");

        // Sau khi peer connection đã sẵn sàng, add các ICE candidate pending (cả caller và callee)
        if (pendingCandidatesRef.current.length > 0) {
          console.log(
            "[CALLER] Thêm các pending ICE candidates, số lượng:",
            pendingCandidatesRef.current.length
          );
          for (const candidate of pendingCandidatesRef.current) {
            try {
              await peerConnectionRef.current.addIceCandidate(candidate);
            } catch (err) {
              console.error("[CALLER] Lỗi khi add pending ICE candidate:", err);
            }
          }
          pendingCandidatesRef.current = [];
        }
      } catch (error) {
        console.error("[CALLER] Lỗi khi xử lý answer:", error);
        toast.error("Lỗi khi thiết lập kết nối");
        handleEndCall();
      }
    };

    const handleIceCandidate = async (data) => {
      console.log("[MODAL] Nhận ICE candidate từ:", data.from);
      try {
        if (!data.candidate) {
          console.log("[MODAL] Không có candidate trong dữ liệu");
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
            "[MODAL] Chưa có remoteDescription, thêm vào pending candidates"
          );
          pendingCandidatesRef.current.push(candidateObj);
        } else {
          console.log(
            "[MODAL] Đã có remoteDescription, thêm candidate ngay lập tức"
          );
          await peerConnectionRef.current.addIceCandidate(candidateObj);
        }
      } catch (error) {
        console.error("[MODAL] Lỗi khi thêm ICE candidate:", error);
      }
    };

    const handleCallBusy = () => {
      toast.error("Người dùng đang bận");
      handleEndCall();
    };

    const handleCallTimeout = () => {
      toast.error("Không có phản hồi từ người dùng");
      handleEndCall();
    };

    const handleCallError = (data) => {
      toast.error(data.error || "Đã xảy ra lỗi trong cuộc gọi");
      handleEndCall();
    };

    const handleCallEnded = (data) => {
      console.log("[MODAL] Nhận call-ended từ:", data.from);
      toast.info("Cuộc gọi đã kết thúc");
      cleanupCall();
      onClose();
    };

    const handleCallRejected = (data) => {
      console.log(
        "[MODAL] Cuộc gọi bị từ chối bởi:",
        data.from,
        "lý do:",
        data.reason
      );
      console.log(
        "[MODAL] isCallerRef.current:",
        isCallerRef.current,
        "isCallee:",
        isCallee
      );

      // Chỉ hiển thị thông báo nếu là người gọi (caller)
      if (isCallerRef.current && !isCallee) {
        toast.info(
          `Cuộc gọi bị từ chối ${
            data.reason === "user_rejected" ? "bởi người nhận" : ""
          }`
        );
        console.log("[MODAL] Hiển thị toast thông báo từ chối cho người gọi");
      }

      // Thông báo ra console để debug
      console.log(
        "[MODAL] Đang dọn dẹp tài nguyên và đóng modal sau khi bị từ chối"
      );

      cleanupCall();
      onClose();
    };

    socket.on("call-accepted", handleCallAccepted);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("call-busy", handleCallBusy);
    socket.on("call-timeout", handleCallTimeout);
    socket.on("call-error", handleCallError);
    socket.on("call-ended", handleCallEnded);
    socket.on("call-rejected", handleCallRejected);

    return () => {
      console.log("[MODAL] Hủy đăng ký các listeners cho sự kiện cuộc gọi");
      socket.off("call-accepted", handleCallAccepted);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("call-busy", handleCallBusy);
      socket.off("call-timeout", handleCallTimeout);
      socket.off("call-error", handleCallError);
      socket.off("call-ended", handleCallEnded);
      socket.off("call-rejected", handleCallRejected);
    };
  }, [socket, isCallee]);

  // Nếu là callee, khi modal mở và có offer thì mới thực hiện signaling
  useEffect(() => {
    if (isOpen && isCallee && offer && from) {
      console.log("[CALLEE] Đang xử lý offer từ:", from);
      console.log("[CALLEE] Offer data:", offer);

      (async () => {
        try {
          if (!peerConnectionRef.current) {
            console.log("[CALLEE] Tạo mới RTCPeerConnection");
            const configuration = { iceServers };
            const peerConnection = new RTCPeerConnection(configuration);
            peerConnectionRef.current = peerConnection;

            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });
            localStreamRef.current = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
            stream.getTracks().forEach((track) => {
              peerConnection.addTrack(track, stream);
            });

            peerConnection.onicecandidate = (event) => {
              if (event.candidate) {
                console.log("[CALLEE] Gửi ICE candidate:", event.candidate);
                socket.emit("ice-candidate", {
                  candidate: event.candidate,
                  to: from,
                });
              }
            };
            peerConnection.ontrack = (event) => {
              console.log("[CALLEE] Nhận track từ remote");
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
              }
            };
            peerConnection.oniceconnectionstatechange = () => {
              console.log(
                "[CALLEE] ICE state change:",
                peerConnection.iceConnectionState
              );
              if (peerConnection.iceConnectionState === "failed") {
                toast.error("Mất kết nối với người dùng");
                handleEndCall();
              }
            };
          }

          console.log("[CALLEE] Đang setRemoteDescription với offer");
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(offer)
          );

          console.log("[CALLEE] Đang tạo answer");
          const answer = await peerConnectionRef.current.createAnswer();

          console.log("[CALLEE] Đang setLocalDescription với answer");
          await peerConnectionRef.current.setLocalDescription(answer);

          console.log("[CALLEE] Đang gửi accept-call đến:", from);
          socket.emit("accept-call", {
            answer,
            to: from,
            from: currentUser.userId,
          });
          setCallStatus("connected");
        } catch (err) {
          console.error("[CALLEE] Lỗi khi xử lý incoming-call:", err);
          toast.error("Không thể thiết lập cuộc gọi");
          handleEndCall();
        }
      })();
    } else if (isOpen && isCallee) {
      console.log(
        "[CALLEE] Không đủ thông tin để xử lý - offer:",
        !!offer,
        "from:",
        !!from
      );
    }
  }, [isOpen, isCallee, offer, from, iceServers, currentUser?.userId]);

  const initializeCall = async () => {
    try {
      console.log("[CALLER] Bắt đầu initializeCall");

      // Lấy stream từ camera và microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Tạo peer connection với cấu hình ICE servers từ server
      const configuration = {
        iceServers,
      };

      console.log(
        "[CALLER] Tạo RTCPeerConnection với cấu hình:",
        configuration
      );
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Thêm local stream vào peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Xử lý ICE candidate
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[CALLER] Gửi ICE candidate đến:", receiver.userId);
          socket.emit("ice-candidate", {
            candidate: event.candidate,
            to: receiver.userId,
          });
        }
      };

      // Xử lý khi nhận được remote stream
      peerConnection.ontrack = (event) => {
        console.log("[CALLER] Nhận track từ remote");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Xử lý lỗi kết nối
      peerConnection.oniceconnectionstatechange = () => {
        console.log(
          "[CALLER] ICE connection state change:",
          peerConnection.iceConnectionState
        );
        if (peerConnection.iceConnectionState === "failed") {
          toast.error("Mất kết nối với người dùng");
          handleEndCall();
        }
      };

      // Tạo và gửi offer
      console.log("[CALLER] Tạo offer");
      const offer = await peerConnection.createOffer();
      console.log("[CALLER] SetLocalDescription với offer");
      await peerConnection.setLocalDescription(offer);

      console.log("[CALLER] Gửi call-user đến:", receiver.userId);
      socket.emit("call-user", {
        offer,
        to: receiver.userId,
        from: currentUser.userId,
        fromName: currentUser.fullName,
        fromAvatar: currentUser.avatar,
      });

      setCallStatus("calling");
    } catch (error) {
      console.error("[CALLER] Lỗi khi khởi tạo cuộc gọi:", error);
      toast.error("Không thể truy cập camera/microphone");
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
    setCallStatus("idle");
  };

  const handleEndCall = () => {
    console.log("[MODAL] Kết thúc cuộc gọi");

    if (socket && peerConnectionRef.current) {
      // Xác định ID của đối phương dựa trên vai trò của người dùng
      const targetUserId = isCallee ? from : receiver?.userId;

      if (targetUserId) {
        console.log("[MODAL] Gửi end-call đến:", targetUserId);
        socket.emit("end-call", {
          to: targetUserId,
          from: currentUser?.userId,
        });
      } else {
        console.error(
          "[MODAL] Không thể xác định ID đối phương để kết thúc cuộc gọi"
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-75 animate-fade-in">
      <div className="bg-white rounded-lg p-4 w-[800px] h-[600px] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Cuộc gọi video với {receiver.fullName}
          </h2>
          <button
            onClick={handleEndCall}
            className="text-red-500 hover:text-red-700"
          >
            <FaPhoneSlash size={24} />
          </button>
        </div>

        <div className="flex-1 relative bg-gray-900 rounded-lg overflow-hidden">
          {/* Remote video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Local video */}
          <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          {/* Call status */}
          {callStatus === "calling" && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded">
              Đang gọi...
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full ${
              isMuted ? "bg-red-500" : "bg-gray-200"
            }`}
          >
            {isMuted ? <IoMicOff size={24} /> : <IoMic size={24} />}
          </button>
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${
              isVideoOff ? "bg-red-500" : "bg-gray-200"
            }`}
          >
            {isVideoOff ? (
              <IoVideocamOff size={24} />
            ) : (
              <IoVideocam size={24} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallModal;
