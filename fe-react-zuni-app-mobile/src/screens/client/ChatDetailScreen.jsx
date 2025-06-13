import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Dimensions,
  Linking,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
  PermissionsAndroid,
  Keyboard,
  StatusBar,
} from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/AntDesign';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Video from 'react-native-video';
import {
  getUserByIdApi,
  sendFriendRequestApi,
  checkSentFriendRequestApi,
  checkReceivedFriendRequestApi,
  createConversationApi,
  getMessagesApi,
  sendMessageApi,
  getConversationsApi,
  acceptFriendRequestApi,
  rejectFriendRequestApi,
  uploadMessageImageApi,
  uploadMessageFileApi,
  getReactionsForMessagesApi,
  getUserStatusApi,
  updateUserStatusApi,
  deleteMessageApi,
} from '../../services/api';
import { useCurrentApp } from '../../contexts/app.context';
import { useSocket } from '../../contexts/socket.context';
import defaultAvatar from '../../assets/images/defaultAvatar.jpg';
import { useNavigation, useIsFocused, useFocusEffect, useRoute } from '@react-navigation/native';
import EmojiPicker from '../../components/emoji/EmojiPicker';
import CreateGroupModal from '../../components/CreateGroupScreen';
import filePdfIcon from '../../assets/icons/file-pdf.png';
import fileWordIcon from '../../assets/icons/file-word.png';
import fileExcelIcon from '../../assets/icons/file-excel.png';
import fileArchiveIcon from '../../assets/icons/file-archive.png';
import fileAudioIcon from '../../assets/icons/file-audio.png';
import fileVideoIcon from '../../assets/icons/file-video.png';
import fileCodeIcon from '../../assets/icons/file-code.png';
import fileImageIcon from '../../assets/icons/file-image.png';
import fileDefaultIcon from '../../assets/icons/file.png';
import arrowLeftIcon from '../../assets/icons/arrowLeftIcon.png';
import heartIcon from '../../assets/icons/heart.png';
import stickerIcon from '../../assets/icons/sticker.png';
import videoIcon from '../../assets/icons/video.png';
import moreIcon from '../../assets/icons/more.png';
import viewColumnIcon from '../../assets/icons/view-column.png';
import smileyIcon from '../../assets/icons/smiley.png';
import sendIcon from '../../assets/icons/send.png';
import likeIcon from '../../assets/icons/like.png';
import VideoCallModal from '../../components/modal/VideoCallModal';
import IncomingCallModal from '../../components/modal/IncomingCallModal';
import chevronUpIcon from '../../assets/icons/chevron-up.png';
import chevronDownIcon from '../../assets/icons/chevron-down.png';
import { Modal as RNModal } from 'react-native';
import { BlurView } from '@react-native-community/blur'; // Nếu chưa có thì dùng View với màu mờ
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';

const { width, height } = Dimensions.get('window');

// Constants
const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB (aligned with web app)
const VIDEO_MAX_SIZE = 30 * 1024 * 1024; // 30MB

// Utility functions
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Thêm hàm xử lý URL có dấu tiếng Việt đặt ở ngoài component
const safeImageUrl = (url) => {
  if (!url) return '';

  try {
    // Xóa các ký tự tiếng Việt không được mã hóa đúng cách
    const sanitizedUrl = url.replace(/bãi/g, 'bai')
      .replace(/dứa/g, 'dua')
      .replace(/vũng/g, 'vung')
      .replace(/tàu/g, 'tau')
      .replace(/ivivu/g, 'ivivu');

    // Tạo URL mới và trả về
    return sanitizedUrl;
  } catch (error) {
    console.error('Error processing image URL:', error, 'Original URL:', url);
    return url;
  }
};

const getFileIconImage = (fileExt) => {
  switch (fileExt) {
    case 'pdf': return filePdfIcon;
    case 'doc':
    case 'docx': return fileWordIcon;
    case 'xls':
    case 'xlsx': return fileExcelIcon;
    case 'zip':
    case 'rar': return fileArchiveIcon;
    case 'mp3': return fileAudioIcon;
    case 'mp4': return fileVideoIcon;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'html':
    case 'css':
    case 'json': return fileCodeIcon;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif': return fileImageIcon;
    default: return fileDefaultIcon;
  }
};

const SafeTouchableOpacity = (props) => {
  const {
    accessibilityElementsHidden,
    accessibilityLabel,
    accessibilityLabelledBy,
    accessibilityLiveRegion,
    ...rest
  } = props;

  const safeProps = {};

  if (typeof accessibilityElementsHidden === 'boolean') {
    safeProps.accessibilityElementsHidden = accessibilityElementsHidden;
  }

  if (typeof accessibilityLabel === 'string') safeProps.accessibilityLabel = accessibilityLabel;
  if (typeof accessibilityLabelledBy === 'string') safeProps.accessibilityLabelledBy = accessibilityLabelledBy;
  if (["none", "polite", "assertive"].includes(accessibilityLiveRegion)) {
    safeProps.accessibilityLiveRegion = accessibilityLiveRegion;
  }

  return <TouchableOpacity {...safeProps} {...rest} />;
};


const ChatDetailScreen = ({ route, navigation }) => {
  const { id } = route.params || {};
  const { user: currentUser, notificationApi, setCurrentUser, messageApi } = useCurrentApp();
  const { socket } = useSocket();
  const [chatUser, setChatUser] = useState(route.params?.chatUser || null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isImagePickerActive, setIsImagePickerActive] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasSentRequest, setHasSentRequest] = useState(false);
  const [hasReceivedRequest, setHasReceivedRequest] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState(false);
  const [likedMessages, setLikedMessages] = useState({});
  const [messageReactions, setMessageReactions] = useState({});
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [selectedMessageReactions, setSelectedMessageReactions] = useState(null);
  const [reactedUserDetails, setReactedUserDetails] = useState({});
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [chatUserTyping, setChatUserTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDataFetched, setIsDataFetched] = useState(false);
  const isFocused = useIsFocused();
  const messageBubbleRefs = useRef({});

  const scrollViewRef = useRef(null);
  const messageInputRef = useRef(null);

  const [showVideoCall, setShowVideoCall] = useState({
    isOpen: false,
    isCallee: false,
    offer: null,
    from: null,
    callId: null,
  });
  const [incomingCall, setIncomingCall] = useState(null);

  const [searchMode, setSearchMode] = useState(route.params?.searchMode || false);
  const [searchKeyword, setSearchKeyword] = useState(route.params?.searchKeyword || '');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [justExitedSearchMode, setJustExitedSearchMode] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [actionSheetPosition, setActionSheetPosition] = useState({ x: 0, y: 0 });

  // Thêm state để xác định nhóm vừa tạo và là nhóm trưởng
  const [isNewlyCreatedGroup, setIsNewlyCreatedGroup] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [recordTime, setRecordTime] = useState('00:00');
  const [recordedFile, setRecordedFile] = useState(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [isPlayingRecord, setIsPlayingRecord] = useState(false);
  const [recordedPath, setRecordedPath] = useState(null);

  const audioRecorderPlayer = useRef(new AudioRecorderPlayer()).current;

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      let permission;
      if (Platform.Version >= 33) {
        permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
      } else {
        permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      }

      const granted = await PermissionsAndroid.request(
        permission,
        {
          title: 'Quyền truy cập thư viện ảnh',
          message: 'Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh.',
          buttonNeutral: 'Hỏi lại sau',
          buttonNegative: 'Hủy',
          buttonPositive: 'Đồng ý',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Error requesting storage permission:', err);
      return false;
    }
  };

  const fetchMessageReactions = async () => {
    if (!conversationId || messages.length === 0) return;

    try {
      const messageIds = messages.map((msg) => msg.messageId).filter(Boolean);
      if (messageIds.length === 0) return;
      const res = await getReactionsForMessagesApi(messageIds);
      if (res.data?.status) {
        setMessageReactions(res.data?.data.reactions);
        // Đếm số lượng từng loại reaction cho mỗi message
        const reactionsCount = {};
        Object.entries(res.data?.data.reactions).forEach(([messageId, reactions]) => {
          const typeCount = {};
          Object.values(reactions).forEach(r => {
            if (r.type) typeCount[r.type] = (typeCount[r.type] || 0) + (r.count || 1);
          });
          reactionsCount[messageId] = typeCount;
        });
        setLikedMessages(reactionsCount);
      }
    } catch (error) {
      console.error('Lỗi khi tải reactions:', error);
    }
  };

  const fetchMessages = useCallback(async (convId) => {
    let fetchTimeout = null;
    try {
      // Đặt timeout cho việc fetching để tránh loading vô hạn
      fetchTimeout = setTimeout(() => {
        setIsInitialLoading(false);
        notificationApi.error({ message: 'Tải tin nhắn quá thời gian. Vui lòng thử lại sau.' });
      }, 15000); // 15 seconds timeout

      const res = await getMessagesApi(convId);

      // Xóa timeout khi đã nhận được response
      if (fetchTimeout) {
        clearTimeout(fetchTimeout);
        fetchTimeout = null;
      }

      if (res.data?.status && Array.isArray(res.data?.data?.messages)) {
        const uniqueMessages = [];
        const messageMap = new Map();

        res.data?.data.messages.forEach((msg) => {
          if (!messageMap.has(msg.messageId)) {
            messageMap.set(msg.messageId, true);
            const messageWithSender = {
              ...msg,
              sender: {
                id: msg.senderId || msg.sender?.id,
                name: msg.sender?.name || currentUser?.fullName,
                avatar: msg.sender?.avatar || currentUser?.avatar || defaultAvatar,
              },
            };
            uniqueMessages.push(messageWithSender);
          }
        });

        setMessages(uniqueMessages);
        scrollToBottom();
      } else {
        console.error('Invalid messages response:', res);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      notificationApi.error({ message: 'Không thể tải tin nhắn' });
      setMessages([]);
    } finally {
      // Đảm bảo xóa timeout nếu có
      if (fetchTimeout) {
        clearTimeout(fetchTimeout);
      }
      setIsInitialLoading(false);
    }
  }, [notificationApi, currentUser]);

  const checkFriendRequestStatus = useCallback(async (userId) => {
    try {
      const [sentRes, receivedRes] = await Promise.all([
        checkSentFriendRequestApi(userId),
        checkReceivedFriendRequestApi(userId),
      ]);

      if (sentRes.data?.status) {
        setHasSentRequest(sentRes.data.hasSentRequest);
      }

      if (receivedRes.data?.status) {
        setHasReceivedRequest(receivedRes.data?.data.hasReceivedRequest);
      }
    } catch (error) {
      console.error('Error checking friend request status:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsInitialLoading(true);

      const conversationsRes = await getConversationsApi();
      const existingGroupConversation = conversationsRes.data?.data?.find(
        (conv) => conv.conversationId === id && conv.type === 'group'
      );

      if (existingGroupConversation) {
        setChatUser({
          userId: existingGroupConversation.conversationId,
          fullName: existingGroupConversation.name || 'Nhóm chat',
          admin: existingGroupConversation.admin,
          
          avatar: existingGroupConversation.avatar,
          isGroup: true,
          participants: existingGroupConversation.participants,
          isFriend: true,
        });

        setConversationId(existingGroupConversation.conversationId);
        await fetchMessages(existingGroupConversation.conversationId);
        setIsDataFetched(true);
        setIsInitialLoading(false);
        return;
      }

      const res = await getUserByIdApi(id);
      if (res.data?.status) {
        const userData = {
          ...res.data?.data,
          isFriend: currentUser?.contacts?.includes(res.data?.data.userId),
        };
        setChatUser(userData);

        if (!userData.isFriend) {
          await checkFriendRequestStatus(res.data?.data.userId);
        }

        const participants = [currentUser?.userId, res.data?.data.userId].sort();
        const conversationKey = `private_${participants.join('_')}`;

        let conversationId;
        const existingPrivateConversation = conversationsRes.data?.data?.find(
          (conv) =>
            conv.participants.includes(currentUser?.userId) &&
            conv.participants.includes(res.data?.data.userId) &&
            conv.type === 'private'
        );

        if (existingPrivateConversation) {
          conversationId = existingPrivateConversation.conversationId;
        } else {
          const convRes = await createConversationApi({
            participants,
            type: 'private',
            conversationId: conversationKey,
          });

          if (convRes.data?.status && convRes.data?.data?.conversationId) {
            conversationId = convRes.data?.data.conversationId;
          } else {
            throw new Error('Không thể tạo cuộc trò chuyện');
          }
        }

        setConversationId(conversationId);
        await fetchMessages(conversationId);
        setIsDataFetched(true);
      } else {
        throw new Error('Không tìm thấy người dùng hoặc nhóm chat');
      }
    } catch (error) {
      console.error('App - Error fetching data:', error);
      notificationApi.error({ message: 'Có lỗi xảy ra khi tải dữ liệu' });
      navigation.goBack();
    } finally {
      setIsInitialLoading(false);
    }
  }, [id, currentUser?.userId, currentUser?.contacts, fetchMessages, checkFriendRequestStatus, notificationApi, navigation]);

  useEffect(() => {
    if (!socket) return;
    // Log mọi event socket nhận được
    const logAnyEvent = (event, ...args) => {
      console.log('[SOCKET][onAny] Event:', event, 'Args:', args);
    };
    socket.onAny(logAnyEvent);
    return () => {
      socket.offAny(logAnyEvent);
    };
  }, [socket]);

  useEffect(() => {
    if (id === currentUser?.userId) {
      notificationApi.error({
        message: 'Bạn không thể chat với chính mình',
      });
      navigation.goBack();
      return;
    }

    if (id && currentUser?.userId) {
      fetchData();
    }
    // Nếu vừa tạo nhóm và là nhóm trưởng, set lại isNewlyCreatedGroup
    if (route?.params?.justCreatedGroup && route?.params?.creatorId === currentUser?.userId) {
      setIsNewlyCreatedGroup(true);
    }
  }, [id, currentUser?.userId, notificationApi, navigation, isFocused, isDataFetched]);

  useEffect(() => {
    if (!socket || !conversationId || !currentUser?.userId) {
      return;
    }

    const handleConnect = () => {
      setIsSocketConnected(true);
      socket.emit('join-conversation', {
        conversationId,
        userId: currentUser?.userId,
      });
      socket.emit('user-status', {
        userId: currentUser?.userId,
        status: 'online',
      });
      updateUserStatusApi({ isOnline: true });
    };

    const handleDisconnect = () => {
      setIsSocketConnected(false);
      updateUserStatusApi({
        isOnline: false,
        lastActive: new Date().toISOString(),
      });
    };

    const handleReceiveMessage = (data) => {
      // Kiểm tra dữ liệu hợp lệ
      if (!data || !data.messageId) {
        console.log('Dữ liệu tin nhắn không hợp lệ:', data);
        return;
      }

      // Chỉ xử lý tin nhắn của cuộc hội thoại hiện tại
      if (data.conversationId === conversationId) {
        setMessages((prev) => {
          // Tránh thêm tin nhắn trùng lặp
          const messageExists = prev.some((msg) => msg.messageId === data.messageId);
          if (messageExists) {
            return prev;
          }

          // Chuẩn bị dữ liệu tin nhắn
          const isSelf = String(data.senderId) === String(currentUser?.userId) || (data.sender && String(data.sender?.id) === String(currentUser?.userId));
          const newMessage = {
            ...data,
            content: data.content || data.url || '',
            sender: isSelf
              ? {
                id: currentUser?.userId,
                name: currentUser?.fullName,
                avatar: currentUser?.avatar,
              }
              : {
                id: data.senderId || data.sender?.id,
                name: data.sender?.name || data.senderName || chatUser?.fullName || 'Unknown',
                avatar: data.sender?.avatar || data.senderAvatar || chatUser?.avatar || defaultAvatar,
              },
            type: data.type || 'text',
            metadata: data.metadata || null,
            createdAt: data.createdAt || Date.now(),
          };

          // Thêm tin nhắn mới vào danh sách
          const updatedMessages = [...prev, newMessage];
          // Đảm bảo cuộn xuống khi có tin nhắn mới
          setTimeout(() => {
            scrollToBottom();
          }, 100);
          return updatedMessages;
        });
      }
    };

    const handleMessageReaction = (data) => {
      if (data.messageId && data.reactions) {
        setMessageReactions((prev) => ({
          ...prev,
          [data.messageId]: data.reactions,
        }));

        const totalLikes = Object.values(data.reactions).reduce(
          (sum, reaction) => sum + reaction.count,
          0
        );

        setLikedMessages((prev) => ({
          ...prev,
          [data.messageId]: totalLikes,
        }));
      }
    };

    const handleUserStatusChange = (data) => {
      if (data.userId === chatUser?.userId && !chatUser?.isGroup) {
        setChatUser((prev) => {
          if (
            prev.isOnline === (data.status === 'online') &&
            prev.lastActive === (data.status === 'offline' ? new Date().toISOString() : prev.lastActive)
          ) {
            return prev;
          }
          return {
            ...prev,
            isOnline: data.status === 'online',
            lastActive: data.status === 'offline' ? new Date().toISOString() : prev.lastActive,
          };
        });
      }
    };

    const handleUserTyping = (data) => {
      if (data.userId === chatUser?.userId && data.conversationId === conversationId) {
        setChatUserTyping(true);
      }
    };

    const handleUserStopTyping = (data) => {
      if (data.userId === chatUser?.userId && data.conversationId === conversationId) {
        setChatUserTyping(false);
      }
    };

    // Đăng ký các sự kiện socket
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('receive-message', handleReceiveMessage);
    socket.on('message-reaction', handleMessageReaction);
    socket.on('user-status-change', handleUserStatusChange);
    socket.on('user-typing', handleUserTyping);
    socket.on('user-stop-typing', handleUserStopTyping);

    // Nếu socket đã kết nối, gọi handleConnect ngay lập tức
    if (socket.connected) {
      handleConnect();
    }

    // Cleanup khi unmount
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('receive-message', handleReceiveMessage);
      socket.off('message-reaction', handleMessageReaction);
      socket.off('user-status-change', handleUserStatusChange);
      socket.off('user-typing', handleUserTyping);
      socket.off('user-stop-typing', handleUserStopTyping);

      if (socket?.connected) {
        socket.emit('leave-conversation', {
          conversationId,
          userId: currentUser?.userId,
        });
        socket.emit('user-status', {
          userId: currentUser?.userId,
          status: 'offline',
          lastActive: new Date().toISOString(),
        });
      }

      updateUserStatusApi({
        isOnline: false,
        lastActive: new Date().toISOString(),
      });
    };
  }, [socket, conversationId, currentUser?.userId, chatUser?.userId, chatUser?.isGroup, chatUser?.fullName, chatUser?.avatar]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    console.log('[DEBUG] Đăng ký socket listeners cho conversationId:', conversationId);
    console.log('[DEBUG] Current chatUser:', chatUser);

    // Lắng nghe sự kiện member-added
    const handleMemberAdded = (data) => {
      console.log('[DEBUG] APP nhận event member-added:', data);
      if (data.conversationId === conversationId) {
        console.log('[DEBUG] data.participants từ event:', data.participants);
        
        // Cập nhật state ngay lập tức
        setChatUser(prev => {
          const newState = {
            ...prev,
            participants: data.participants,
            totalMembers: data.participants.length
          };
          console.log('[DEBUG] ChatUser state mới sau member-added:', newState);
          return newState;
        });

        // Cập nhật navigation params để truyền dữ liệu sang ChatInfo
        navigation.setParams({
          chatUser: {
            ...chatUser,
            participants: data.participants,
            totalMembers: data.participants.length
          }
        });

        // Thêm tin nhắn hệ thống nếu có
        if (data.message) {
          setMessages(prev => {
            const newMessages = [...prev, data.message];
            console.log('[DEBUG] Messages mới sau member-added:', newMessages.length);
            return newMessages;
          });
        }
      }
    };

    // Lắng nghe sự kiện member-removed
    const handleMemberRemoved = (data) => {
      console.log('[DEBUG] APP nhận event member-removed:', data);
      if (data.conversationId === conversationId) {
        // Kiểm tra xem người dùng hiện tại có bị xóa không
        if (data.removedMembers && data.removedMembers.includes(currentUser?.userId)) {
          navigation.navigate('HomeScreen');
          return;
        }

        // Cập nhật state ngay lập tức
        setChatUser(prev => {
          const updatedParticipants = prev.participants.filter(
            p => !data.removedMembers.includes(p.userId)
          );
          const newState = {
            ...prev,
            participants: updatedParticipants,
            totalMembers: updatedParticipants.length
          };
          console.log('[DEBUG] ChatUser state mới sau member-removed:', newState);
          return newState;
        });

        // Cập nhật navigation params để truyền dữ liệu sang ChatInfo
        navigation.setParams({
          chatUser: {
            ...chatUser,
            participants: data.participants,
            totalMembers: data.participants.length
          }
        });

        if (data.message) {
          setMessages(prev => {
            const newMessages = [...prev, data.message];
            console.log('[DEBUG] Messages mới sau member-removed:', newMessages.length);
            return newMessages;
          });
        }
      }
    };

    // Lắng nghe sự kiện member-left
    const handleMemberLeft = (data) => {
      console.log('[DEBUG] APP nhận event member-left:', data);
      if (data.conversationId === conversationId) {
        // Kiểm tra xem người rời nhóm có phải là người dùng hiện tại không
        if (data.userId === currentUser?.userId) {
          navigation.navigate('HomeScreen');
          return;
        }

        if (data.conversation) {
          console.log("[DEBUG] Cập nhật lại admin và participants:", {
            newAdmin: data.conversation.admin,
            newParticipants: data.conversation.participants,
            totalMembers: data.conversation.participants.length,
          });

          // Cập nhật state ngay lập tức
          setChatUser(prev => {
            const newState = {
              ...prev,
              admin: data.conversation.admin,
              participants: data.conversation.participants,
              totalMembers: data.conversation.participants.length
            };
            console.log('[DEBUG] ChatUser state mới sau member-left:', newState);
            return newState;
          });

          // Cập nhật navigation params để truyền dữ liệu sang ChatInfo
          navigation.setParams({
            chatUser: {
              ...chatUser,
              admin: data.conversation.admin,
              participants: data.conversation.participants,
              totalMembers: data.conversation.participants.length
            }
          });
        }

        if (data.message) {
          setMessages(prev => {
            const newMessages = [...prev, data.message];
            console.log('[DEBUG] Messages mới sau member-left:', newMessages.length);
            return newMessages;
          });
        }
      }
    };

    // Đăng ký các listeners
    socket.on('member-added', handleMemberAdded);
    socket.on('member-removed', handleMemberRemoved);
    socket.on('member-left', handleMemberLeft);

    // Cleanup khi unmount
    return () => {
      console.log('[DEBUG] Cleanup socket listeners');
      socket.off('member-added', handleMemberAdded);
      socket.off('member-removed', handleMemberRemoved);
      socket.off('member-left', handleMemberLeft);
    };
  }, [socket, conversationId, chatUser?.conversationId]);

  useEffect(() => {
    if (messages.length > 0 && conversationId) {
      fetchMessageReactions();
    }
  }, [messages.length, conversationId]);

  useEffect(() => {
    if (chatUser && !isInitialLoading) {
      messageInputRef.current?.focus();
    }
  }, [chatUser, isInitialLoading]);

  useEffect(() => {
    if (currentUser?.contacts && chatUser?.userId && !chatUser?.isGroup) {
      const isFriend = currentUser?.contacts.includes(chatUser.userId);
      setChatUser((prev) => ({
        ...prev,
        isFriend,
      }));
    }
  }, [currentUser?.contacts, chatUser?.userId]);

  useEffect(() => {
    if (
      chatUser &&
      !chatUser.isGroup &&
      (chatUser.isOnline === undefined || chatUser.lastActive === undefined)
    ) {
      const fetchUserStatus = async () => {
        try {
          const statusRes = await getUserStatusApi(chatUser.userId);
          if (statusRes.data?.status) {
            setChatUser((prev) => ({
              ...prev,
              isOnline: statusRes.data?.data.isOnline,
              lastActive: statusRes.data?.data.lastActive,
            }));
          } else {
            setChatUser((prev) => ({
              ...prev,
              isOnline: false,
              lastActive: new Date().toISOString(),
            }));
          }
        } catch (error) {
          console.error('App - Lỗi khi lấy trạng thái người dùng:', error);
          setChatUser((prev) => ({
            ...prev,
            isOnline: false,
            lastActive: new Date().toISOString(),
          }));
        }
      };

      fetchUserStatus();
    }
  }, [chatUser?.userId, chatUser?.isGroup]);

  useEffect(() => {
    if (!socket) return;

    const handleFriendRequestAccepted = (data) => {
      const isCurrentUserInvolved =
        data.friendId === currentUser?.userId ||
        data.accepterId === currentUser?.userId;
      const isChatUserInvolved =
        data.friendId === chatUser?.userId ||
        data.accepterId === chatUser?.userId;

      if (isCurrentUserInvolved || isChatUserInvolved) {
        setChatUser((prev) => ({
          ...prev,
          isFriend: true,
        }));

        setCurrentUser((prev) => {
          const newContacts = [...(prev.contacts || [])];
          if (!newContacts.includes(chatUser?.userId)) {
            newContacts.push(chatUser?.userId);
          }
          return {
            ...prev,
            contacts: newContacts,
          };
        });

        setHasSentRequest(false);
        setHasReceivedRequest(false);
      }
    };

    const handleFriendRequestRejected = (data) => {
      const isCurrentUserInvolved =
        data.friendId === currentUser?.userId ||
        data.rejecterId === currentUser?.userId;
      const isChatUserInvolved =
        data.friendId === chatUser?.userId ||
        data.rejecterId === chatUser?.userId;

      if (isCurrentUserInvolved || isChatUserInvolved) {
        setChatUser((prev) => ({
          ...prev,
          isFriend: false,
        }));

        setHasSentRequest(false);
        setHasReceivedRequest(false);
      }
    };

    const handleFriendRemoved = (data) => {
      const isCurrentUserInvolved =
        data.to === currentUser?.userId || data.friendId === currentUser?.userId;
      const isChatUserInvolved =
        data.removerId === chatUser?.userId || data.friendId === chatUser?.userId;

      if (isCurrentUserInvolved || isChatUserInvolved) {
        setChatUser((prev) => ({
          ...prev,
          isFriend: false,
        }));

        setHasSentRequest(false);
        setHasReceivedRequest(false);

        setCurrentUser((prev) => {
          const updatedContacts =
            prev.contacts?.filter(
              (id) => id !== data.friendId && id !== data.removerId
            ) || [];
          return {
            ...prev,
            contacts: updatedContacts,
          };
        });

        checkFriendRequestStatus(chatUser?.userId);
      }
    };

    socket.on('friend-request-accepted', handleFriendRequestAccepted);
    socket.on('friend-request-rejected', handleFriendRequestRejected);
    socket.on('friend-removed', handleFriendRemoved);

    return () => {
      socket.off('friend-request-accepted', handleFriendRequestAccepted);
      socket.off('friend-request-rejected', handleFriendRequestRejected);
      socket.off('friend-removed', handleFriendRemoved);
    };
  }, [socket, chatUser?.userId, currentUser?.userId, checkFriendRequestStatus]);

  // Thêm useFocusEffect để xử lý khi focus lại màn hình - Di chuyển lên trước điều kiện return
  useFocusEffect(
    useCallback(() => {

      // Khi quay lại màn hình, đảm bảo các trạng thái loading được reset
      if (isImagePickerActive) {
        setIsImagePickerActive(false);
      }

      // Đảm bảo không hiển thị loading screen khi quay lại từ màn hình khác
      if (isInitialLoading && messages.length > 0) {
        setIsInitialLoading(false);
      }

      return () => {
        // Cleanup khi unfocus
      };
    }, [isImagePickerActive, isInitialLoading, messages.length])
  );

  // Logging function to track component rendering - Di chuyển lên trước điều kiện return
  useEffect(() => {
  }, [isInitialLoading, isUploadingImage, isImagePickerActive, messages.length, conversationId, chatUser]);

  // Add useEffect to handle media selected from ImagePickerScreen
  useEffect(() => {
    // Handle selected media from ImagePickerScreen navigation
    if (route.params?.selectedMedia) {
      const selectedMedia = route.params.selectedMedia;

      // Reset the params to avoid processing the media multiple times
      navigation.setParams({ selectedMedia: null });

      // Reset các trạng thái trước khi bắt đầu upload
      setIsImagePickerActive(false);
      setIsUploadingImage(true);

      // Process the selected media
      handleSelectedMedia(selectedMedia);
    }
  }, [route.params?.selectedMedia, navigation]);

  // Add this function to check states and reset them if needed
  const checkAndResetUploadStates = useCallback(() => {
    // Nếu isUploadingImage hoặc isImagePickerActive đang true nhưng không còn quá trình upload nào
    // thì reset lại để có thể tiếp tục gửi ảnh/file
    if (isUploadingImage || isImagePickerActive) {
      console.log('Đang reset trạng thái upload do phát hiện trạng thái không đúng');
      setIsUploadingImage(false);
      setIsImagePickerActive(false);
    }
  }, [isUploadingImage, isImagePickerActive]);

  // Thêm effect để kiểm tra và reset trạng thái mỗi khi component được render lại
  useEffect(() => {
    const resetTimer = setTimeout(() => {
      checkAndResetUploadStates();
    }, 500);

    return () => clearTimeout(resetTimer);
  }, [checkAndResetUploadStates]);

  // Thêm useEffect để lắng nghe các sự kiện liên quan đến cuộc gọi
  useEffect(() => {
    // Chỉ đăng ký khi socket đã connect và có userId
    if (!socket || socket.disconnected || !currentUser?.userId) {
      console.log('[CALL] Không có socket hoặc socket chưa connect để đăng ký listener call events');
      return;
    }
    console.log('[CALL] Đăng ký listeners cho video call events ở socket:', socket.id);

    // Đảm bảo join lại room khi mount (phòng trường hợp app chưa join)
    if (conversationId && currentUser?.userId) {
      console.log('[CALL][DEBUG] Join lại room khi mount:', conversationId, currentUser?.userId);
      socket.emit('join-conversation', {
        conversationId,
        userId: currentUser?.userId,
      });
    }

    // Log tất cả các sự kiện socket liên quan đến call
    socket.onAny((event, ...args) => {
      if (['incoming-call', 'call-user', 'call-busy', 'call-ended', 'call-error', 'call-rejected', 'accept-call'].includes(event)) {
        console.log('[SOCKET][DEBUG] Sự kiện:', event, 'Dữ liệu:', args);
      }
    });

    // Các listeners cho video call
    const handleIncomingCall = (data) => {
      console.log('[CHAT][DEBUG] Nhận incoming-call:', data);
      if (!data) {
        console.warn('[CHAT][DEBUG] incoming-call nhận được data rỗng!');
        return;
      }

      // Kiểm tra xem modal gọi video đã mở chưa
      if (showVideoCall.isOpen) {
        console.log('[CHAT] Đã có modal gọi video đang mở, bỏ qua incoming-call mới');
        socket.emit('reject-call', {
          to: data.from,
          from: currentUser?.userId,
          reason: 'busy',
        });
        return;
      }

      if (incomingCall) {
        console.log('[CHAT] Đang xử lý incomingCall khác, bỏ qua incoming-call mới');
        socket.emit('reject-call', {
          to: data.from,
          from: currentUser?.userId,
          reason: 'busy',
        });
        return;
      }

      // CHUẨN HÓA DỮ LIỆU INCOMING CALL
      let offer = null;
      if (data.offer) {
        if (typeof data.offer === 'object' && data.offer.type && data.offer.sdp) {
          offer = {
            type: String(data.offer.type),
            sdp: String(data.offer.sdp)
          };
        } else if (typeof data.offer === 'string') {
          try {
            const parsedOffer = JSON.parse(data.offer);
            if (parsedOffer.type && parsedOffer.sdp) {
              offer = {
                type: String(parsedOffer.type),
                sdp: String(parsedOffer.sdp)
              };
            }
          } catch (e) {
            console.error('[CHAT] Lỗi parse offer:', e);
          }
        }
      }

      const from = typeof data.from === 'string' ? data.from : (data.from?.userId || null);
      const callId = typeof data.callId === 'string' ? data.callId : (data.callId?.toString() || null);

      console.log('[CHAT][DEBUG] Đã chuẩn hóa dữ liệu incoming call:', {
        offer,
        from,
        callId
      });

      setIncomingCall({
        ...data,
        offer,
        from,
        callId,
      });
    };

    const handleCallBusy = () => {
      console.log('[CALL] Nhận call-busy, reset showVideoCall');
      Alert.alert('Thông báo', 'Người kia đang bận hoặc đã có cuộc gọi khác!');
      setShowVideoCall({
        isOpen: false,
        isCallee: false,
        offer: null,
        from: null,
        callId: null,
      });
      setIncomingCall(null);
    };

    const handleCallEnded = () => {
      console.log('[CALL] Nhận call-ended, reset showVideoCall');
      Alert.alert('Thông báo', 'Cuộc gọi đã kết thúc hoặc bị ngắt kết nối!');
      setShowVideoCall({
        isOpen: false,
        isCallee: false,
        offer: null,
        from: null,
        callId: null,
      });
      setIncomingCall(null);
    };

    const handleCallError = (data) => {
      console.log('[CALL] Nhận call-error, reset showVideoCall');
      Alert.alert('Lỗi', data.error || 'Có lỗi xảy ra trong cuộc gọi');
      setShowVideoCall({
        isOpen: false,
        isCallee: false,
        offer: null,
        from: null,
        callId: null,
      });
      setIncomingCall(null);
    };

    // Thêm listener xử lý khi cuộc gọi bị từ chối
    const handleCallRejected = (data) => {
      console.log('[CALL] Nhận call-rejected, reset showVideoCall');
      setShowVideoCall({
        isOpen: false,
        isCallee: false,
        offer: null,
        from: null,
        callId: null,
      });
      setIncomingCall(null);
      Alert.alert('Thông báo', 'Cuộc gọi đã bị từ chối');
    };

    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-busy', handleCallBusy);
    socket.on('call-ended', handleCallEnded);
    socket.on('call-error', handleCallError);
    socket.on('call-rejected', handleCallRejected);

    // Cleanup listener khi socket hoặc userId thay đổi
    return () => {
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-busy', handleCallBusy);
      socket.off('call-ended', handleCallEnded);
      socket.off('call-error', handleCallError);
      socket.off('call-rejected', handleCallRejected);
      console.log(
        '[CALL] Cleanup listeners cho video call events ở socket:',
        socket.id
      );
    };
  }, [
    socket,
    socket?.id,
    currentUser?.userId,
    showVideoCall.isOpen,
    incomingCall,
  ]);

  // Hàm yêu cầu quyền truy cập camera và mic
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const cameraGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Quyền truy cập camera',
            message: 'Ứng dụng cần quyền truy cập camera để thực hiện cuộc gọi video',
            buttonNeutral: 'Hỏi sau',
            buttonNegative: 'Từ chối',
            buttonPositive: 'Đồng ý',
          }
        );

        const micGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Quyền truy cập microphone',
            message: 'Ứng dụng cần quyền truy cập microphone để thực hiện cuộc gọi video',
            buttonNeutral: 'Hỏi sau',
            buttonNegative: 'Từ chối',
            buttonPositive: 'Đồng ý',
          }
        );

        return (
          cameraGranted === PermissionsAndroid.RESULTS.GRANTED &&
          micGranted === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.error('Lỗi khi yêu cầu quyền truy cập:', err);
        return false;
      }
    }

    return true; // iOS xử lý quyền truy cập tự động khi sử dụng getUserMedia
  };

  // Sửa lại hàm handleVideoCall để giống web: chỉ cần setShowVideoCall({ isOpen: true, isCallee: false }) khi đủ điều kiện
  const handleVideoCall = () => {
    console.log('BẤM VIDEO CALL');
    // Kiểm tra đang có cuộc gọi không
    const isInCall = showVideoCall.isOpen || incomingCall;
    if (isInCall) {
      Alert.alert('Thông báo', 'Bạn đang trong một cuộc gọi khác');
      return;
    }
    if (chatUser?.isFriend || chatUser?.isGroup) {
      // Đảm bảo không có modal nào khác mở
      setIncomingCall(null);
      console.log('[CALL] Bấm gọi video, mở modal với isOpen=true');
      setShowVideoCall({ isOpen: true, isCallee: false, offer: null, from: null, callId: null });

    } else {
      Alert.alert('Thông báo', 'Bạn chỉ có thể gọi video với bạn bè');
    }
  };

  // Sửa lại hàm handleAcceptCall để yêu cầu quyền
  const handleAcceptCall = async () => {
    // Yêu cầu quyền trước khi chấp nhận cuộc gọi
    const permissionsGranted = await requestPermissions();

    if (permissionsGranted) {
      // CHUẨN HÓA DỮ LIỆU KHI SET SHOWVIDEOCALL
      let offer = null;
      if (incomingCall?.offer) {
        if (typeof incomingCall.offer === 'object' && incomingCall.offer.type && incomingCall.offer.sdp) {
          offer = {
            type: String(incomingCall.offer.type),
            sdp: String(incomingCall.offer.sdp)
          };
        } else if (typeof incomingCall.offer === 'string') {
          try {
            const parsedOffer = JSON.parse(incomingCall.offer);
            if (parsedOffer.type && parsedOffer.sdp) {
              offer = {
                type: String(parsedOffer.type),
                sdp: String(parsedOffer.sdp)
              };
            }
          } catch (e) {
            console.error('[CHAT] Lỗi parse offer khi accept:', e);
          }
        }
      }

      const from = typeof incomingCall?.from === 'string' ? incomingCall.from : (incomingCall?.from?.userId || null);
      const callId = typeof incomingCall?.callId === 'string' ? incomingCall.callId : (incomingCall?.callId?.toString() || null);

      console.log('[CHAT][DEBUG] Đã chuẩn hóa dữ liệu khi accept call:', {
        offer,
        from,
        callId
      });

      setShowVideoCall({
        isOpen: true,
        isCallee: true,
        offer,
        from,
        callId,
      });
      setIncomingCall(null); // Clear state khi đã accept
    } else {
      Alert.alert(
        'Quyền bị từ chối',
        'Bạn cần cấp quyền truy cập camera và microphone để thực hiện cuộc gọi video'
      );
      // Từ chối cuộc gọi vì không có quyền
      handleRejectCall();
    }
  };

  // Xử lý từ chối cuộc gọi đến
  const handleRejectCall = () => {
    // Khi người nhận (callee) nhấn nút từ chối
    console.log(
      '[CHAT] Gửi reject-call, người nhận từ chối:',
      incomingCall
    );
    console.log(
      '[CHAT] Socket connected:',
      socket.connected,
      'Socket ID:',
      socket.id
    );

    // to: ID của người gọi - người cần nhận thông báo từ chối
    // from: ID của người nhận - người đang từ chối
    socket.emit('reject-call', {
      to: incomingCall.from,
      from: currentUser?.userId,
      reason: 'user_rejected',
    });

    // Hiển thị thông báo cho người nhận (người từ chối)
    Alert.alert('Thông báo', 'Bạn đã từ chối cuộc gọi');
    setIncomingCall(null);
    setShowVideoCall({ isOpen: false, isCallee: false, offer: null, from: null, callId: null });
  };

  const isInCall = showVideoCall.isOpen || incomingCall;

  useEffect(() => {
    if (route.params?.searchMode) setSearchMode(true);
  }, [route.params?.searchMode]);

  useEffect(() => {
    if (searchMode && searchKeyword.trim() && messages.length > 0) {
      const keyword = searchKeyword.trim().toLowerCase();
      const results = messages
        .map((msg, idx) => {
          // Tìm trong content và tên file nếu có
          let found = false;
          let fileName = '';
          if (msg.metadata) {
            try {
              const meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
              fileName = meta.fileName || '';
            } catch { }
          }
          if (
            (typeof msg.content === 'string' && msg.content.toLowerCase().includes(keyword)) ||
            (fileName && fileName.toLowerCase().includes(keyword))
          ) {
            found = true;
          }
          return found ? { msg, idx, fileName } : null;
        })
        .filter(Boolean);
      setSearchResults(results);
      setCurrentSearchIndex(results.length > 0 ? 0 : -1);
    } else {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
    }
  }, [searchKeyword, searchMode, messages]);

  const handleSearch = (text) => {
    setSearchKeyword(text);
  };
  const handleNextResult = () => {
    if (searchResults.length === 0) return;
    setCurrentSearchIndex((prev) => (prev + 1) % searchResults.length);
    // Scroll to message
    const idx = searchResults[(currentSearchIndex + 1) % searchResults.length]?.idx;
    if (typeof idx === 'number') {
      scrollViewRef.current?.scrollToIndex({ index: idx, animated: true });
    }
  };
  const handlePrevResult = () => {
    if (searchResults.length === 0) return;
    setCurrentSearchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    // Scroll to message
    const idx = searchResults[(currentSearchIndex - 1 + searchResults.length) % searchResults.length]?.idx;
    if (typeof idx === 'number') {
      scrollViewRef.current?.scrollToIndex({ index: idx, animated: true });
    }
  };
  const handleCloseSearch = () => {
    setSearchMode(false);
    setSearchKeyword('');
    setSearchResults([]);
    setCurrentSearchIndex(-1);
    setJustExitedSearchMode(true);
  };

  // Xử lý nút back trên header
  const handleHeaderBack = () => {
    if (justExitedSearchMode) {
      setJustExitedSearchMode(false);
      // Quay về ChatListScreen (hoặc màn trước chat)
      navigation.navigate('HomeScreen');
    } else if (isNewlyCreatedGroup) {
      // Nếu vừa tạo nhóm, back về HomeScreen
      navigation.navigate('HomeScreen');
    } else {
      navigation.goBack();
    }
  };

  useEffect(() => {
    if (route.params?.chatUser) {
      setChatUser(route.params.chatUser);
    }
  }, [route.params?.chatUser]);
  useEffect(() => {
    if (!showRecordModal) {
      setIsPlayingRecord(false);
      audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removePlayBackListener();
    }
  }, [showRecordModal]);
  // Socket listener cho sự kiện xóa tin nhắn
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleMessageDeleted = (data) => {
      console.log("Received message-deleted event:", data);
      if (data.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.messageId === data.messageId
              ? { ...msg, isDeleted: true, content: "Tin nhắn đã được thu hồi" }
              : msg
          )
        );
      }
    };

    socket.on("message-deleted", handleMessageDeleted);

    return () => {
      socket.off("message-deleted", handleMessageDeleted);
    };
  }, [socket, conversationId]);

  const displayName = chatUser?.nickname || chatUser?.fullName || 'Người dùng';
  console.log('[DEBUG] Render header participants:', chatUser?.participants?.length, chatUser?.participants);

  if (isInitialLoading && !isUploadingImage && !isImagePickerActive) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#0068ff" />
      </View>
    );
  }
  if (!chatUser && !isUploadingImage && !isImagePickerActive) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.errorText}>Không tìm thấy người dùng hoặc nhóm chat</Text>
      </View>
    );
  }

  const createNewConversation = async () => {
    try {
      const convRes = await createConversationApi({
        participants: [currentUser?.userId, chatUser.userId],
        type: 'private',
      });

      if (convRes.data?.status && convRes.data?.data?.conversationId) {
        const newConversationId = convRes.data?.data.conversationId;
        setConversationId(newConversationId);

        if (socket?.connected) {
          socket.emit('join-conversation', {
            conversationId: newConversationId,
            userId: currentUser?.userId,
            chatUserId: chatUser.userId,
          });
        }

        return newConversationId;
      }
      throw new Error('Không thể tạo cuộc trò chuyện');
    } catch (error) {
      console.error('App - Error creating conversation:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const tempMessageId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      if (!conversationId) {
        throw new Error('Không tìm thấy cuộc trò chuyện');
      }

      const messageData = {
        conversationId,
        senderId: currentUser?.userId,
        receiverId: chatUser?.isGroup ? null : chatUser.userId,
        type: 'text',
        content: newMessage.trim(),
        ...(chatUser?.isGroup && {
          senderName: currentUser?.fullName,
          senderAvatar: currentUser?.avatar,
          isGroupMessage: true,
        }),
      };

      const tempMessage = {
        ...messageData,
        messageId: tempMessageId,
        createdAt: Date.now(),
        status: 'sending',
        sender: {
          id: currentUser?.userId,
          name: currentUser?.fullName,
          avatar: currentUser?.avatar,
        },
      };

      setMessages((prev) => [...prev, tempMessage]);
      scrollToBottom();
      setNewMessage('');
      messageInputRef.current?.focus();

      const messageResponse = await sendMessageApi(messageData);

      if (messageResponse.data?.status && messageResponse.data?.data) {
        const finalMessage = {
          ...messageData,
          messageId: messageResponse.data?.data.messageId,
          createdAt: messageResponse.data?.data.createdAt,
          status: 'sent',
          sender: {
            id: currentUser?.userId,
            name: currentUser?.fullName,
            avatar: currentUser?.avatar,
          },
        };

        setMessages((prev) =>
          prev.map((msg) => (msg.messageId === tempMessageId ? finalMessage : msg))
        );

        if (socket?.connected) {
          socket.emit('send-message', {
            ...finalMessage,
            conversationId,
            to: chatUser?.isGroup ? null : chatUser.userId,
            isGroupMessage: chatUser?.isGroup,
          });
        }
      } else {
        throw new Error(messageResponse.data?.message || 'Gửi tin nhắn thất bại');
      }
    } catch (error) {
      console.error('App - Error sending message:', error);
      setMessages((prev) => prev.filter((msg) => msg.messageId !== tempMessageId));
      notificationApi.error({ message: error.message || 'Gửi tin nhắn thất bại' });
    }
  };

  const handleSendLike = async () => {
    if (!chatUser?.isFriend && !chatUser?.isGroup) return;

    let currentConversationId = conversationId;
    if (!currentConversationId) {
      currentConversationId = await createNewConversation();
    }

    const tempMessageId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageData = {
      conversationId: currentConversationId,
      senderId: currentUser?.userId,
      type: 'text',
      content: '👍',
      ...(chatUser?.isGroup
        ? {
          senderName: currentUser?.fullName,
          senderAvatar: currentUser?.avatar,
          isGroupMessage: true,
        }
        : { receiverId: chatUser.userId }),
    };

    const tempMessage = {
      ...messageData,
      messageId: tempMessageId,
      createdAt: Date.now(),
      status: 'sending',
      sender: {
        id: currentUser?.userId,
        name: currentUser?.fullName,
        avatar: currentUser?.avatar,
      },
    };

    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottom();

    try {
      const messageResponse = await sendMessageApi(messageData);
      if (messageResponse.data?.status && messageResponse.data?.data) {
        const finalMessage = {
          ...messageData,
          messageId: messageResponse.data?.data.messageId,
          createdAt: messageResponse.data?.data.createdAt,
          status: 'sent',
          sender: {
            id: currentUser?.userId,
            name: currentUser?.fullName,
            avatar: currentUser?.avatar,
          },
        };

        setMessages((prev) =>
          prev.map((msg) => (msg.messageId === tempMessageId ? finalMessage : msg))
        );

        if (socket?.connected) {
          socket.emit('send-message', {
            ...finalMessage,
            conversationId: currentConversationId,
            to: chatUser?.isGroup ? null : chatUser.userId,
            isGroupMessage: chatUser?.isGroup,
          });
        }
      } else {
        throw new Error(messageResponse.data?.message || 'Gửi tin nhắn thất bại');
      }
    } catch (error) {
      console.error('App - Error sending like:', error);
      setMessages((prev) => prev.filter((msg) => msg.messageId !== tempMessageId));
      notificationApi.error({ message: error.message || 'Gửi tin nhắn thất bại' });
    }
  };

  const handleSendRequest = async () => {
    if (!chatUser?.userId) return;

    setSending(true);
    try {
      const res = await sendFriendRequestApi(chatUser.userId);
      if (res.data?.status) {
        notificationApi.success({ message: res.data?.message || 'Đã gửi lời mời kết bạn' });
        setHasSentRequest(true);

        if (socket?.connected) {
          socket.emit('send-friend-request', {
            receiverId: chatUser.userId,
            senderId: currentUser?.userId,
            senderName: currentUser?.fullName,
            senderAvatar: currentUser?.avatar,
          });
        }
      } else {
        notificationApi.error({ message: res.data?.message || 'Không thể gửi lời mời kết bạn' });
      }
    } catch (error) {
      console.error('App - Error sending friend request:', error);
      notificationApi.error({ message: 'Có lỗi xảy ra khi gửi lời mời kết bạn' });
    } finally {
      setSending(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!chatUser?.userId) return;

    setAccepting(true);
    try {
      const res = await acceptFriendRequestApi(chatUser.userId);
      if (res.data?.status) {
        messageApi.success({ message: res.data?.message || 'Đã chấp nhận lời mời kết bạn' });
        setHasReceivedRequest(false);
        setChatUser((prev) => ({
          ...prev,
          isFriend: true,
        }));

        setCurrentUser((prev) => ({
          ...prev,
          contacts: [...(prev.contacts || []), chatUser.userId],
        }));

        if (socket?.connected) {
          socket.emit('friend-request-accepted', {
            friendId: chatUser.userId,
            accepterId: currentUser?.userId,
          });
        }
      } else {
        messageApi.error({ message: res.data?.message || 'Không thể chấp nhận lời mời kết bạn' });
      }
    } catch (error) {
      console.error('App - Error accepting friend request:', error);
      messageApi.error({ message: 'Có lỗi xảy ra khi chấp nhận lời mời kết bạn' });
    } finally {
      setAccepting(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!chatUser?.userId) return;

    setRejecting(true);
    try {
      const res = await rejectFriendRequestApi(chatUser.userId);
      if (res.data?.status) {
        messageApi.success({ message: res.data?.message || 'Đã từ chối lời mời kết bạn' });
        setHasReceivedRequest(false);

        if (socket?.connected) {
          socket.emit('friend-request-rejected', {
            friendId: chatUser.userId,
            rejecterId: currentUser?.userId,
          });
        }
      } else {
        messageApi.error({ message: res.data?.message || 'Không thể từ chối lời mời kết bạn' });
      }
    } catch (error) {
      console.error('App - Error rejecting friend request:', error);
      messageApi.error({ message: 'Có lỗi xảy ra khi từ chối lời mời kết bạn' });
    } finally {
      setRejecting(false);
    }
  };

  const handleLikeMessage = (messageId, emojiKey = 'heart') => {
    setMessageReactions((prev) => {
      const updated = { ...prev };
      if (!updated[messageId]) {
        updated[messageId] = {};
      }
      // Ghi đè loại reaction của user này thành loại mới
      updated[messageId][currentUser?.userId] = {
        type: emojiKey,
        count: 1,
      };
      return updated;
    });

    // Đếm lại likedMessages cho message này
    setLikedMessages((prev) => {
      const msgReactions = (messageReactions[messageId] || {});
      // Tạo bản copy và cập nhật loại mới cho user này
      const newReactions = { ...msgReactions, [currentUser?.userId]: { type: emojiKey, count: 1 } };
      // Đếm số lượng từng loại
      const typeCount = {};
      Object.values(newReactions).forEach(r => {
        if (r.type) typeCount[r.type] = (typeCount[r.type] || 0) + 1;
      });
      return {
        ...prev,
        [messageId]: typeCount,
      };
    });

    if (socket?.connected && conversationId) {
      socket.emit('react-message', {
        messageId,
        conversationId,
        userId: currentUser?.userId,
        type: emojiKey,
        action: 'add',
      });
    }
  };

  const handleOpenReactionModal = async (messageId) => {
    if (messageReactions[messageId]) {
      const userIds = Object.keys(messageReactions[messageId]);
      const userDetails = {};
      try {
        const fetchPromises = userIds.map(async (userId) => {
          if (userId === currentUser?.userId) {
            userDetails[userId] = {
              userId,
              fullName: currentUser?.fullName || 'Bạn',
              avatar: currentUser?.avatar || defaultAvatar,
            };
            return;
          }
          if (userId === chatUser?.userId) {
            userDetails[userId] = {
              userId,
              fullName: chatUser.fullName,
              avatar: chatUser.avatar || defaultAvatar,
            };
            return;
          }
          try {
            const userResponse = await getUserByIdApi(userId);
            if (userResponse.data?.status) {
              userDetails[userId] = {
                userId,
                fullName: userResponse.data?.data.fullName,
                avatar: userResponse.data?.data.avatar || defaultAvatar,
              };
            }
          } catch (error) {
            console.error(`App - Không thể lấy thông tin người dùng ${userId}`, error);
            userDetails[userId] = {
              userId,
              fullName: userId,
              avatar: defaultAvatar,
            };
          }
        });
        await Promise.all(fetchPromises);
        setReactedUserDetails(userDetails);
        setSelectedMessageReactions({
          messageId,
          reactions: messageReactions[messageId],
        });
        setShowReactionModal(true);
      } catch (error) {
        console.error('App - Lỗi khi lấy thông tin người dùng:', error);
      }
    }
  };

  const handleTyping = () => {
    if (!socket || !conversationId || (!chatUser?.isFriend && !chatUser?.isGroup)) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { conversationId, userId: currentUser?.userId });
    }

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    const timeout = setTimeout(() => {
      setIsTyping(false);
      socket.emit('stop-typing', { conversationId, userId: currentUser?.userId });
    }, 2000);

    setTypingTimeout(timeout);
  };

  const handleInputChange = (text) => {
    setNewMessage(text);
    handleTyping();
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage((prev) => prev + emoji);
    messageInputRef.current?.focus();
    setShowEmojiPicker(false);
  };

  const handleImageSelect = async () => {
    if (!chatUser?.isFriend && !chatUser?.isGroup) {
      notificationApi.error({ message: 'Không thể gửi ảnh cho người này' });
      return;
    }

    // Đảm bảo các trạng thái upload được reset trước khi bắt đầu
    setIsUploadingImage(false);
    setIsImagePickerActive(true);

    try {
      navigation.navigate('ImagePickerScreen', {
        mediaType: 'photo',
        maxFileSize: IMAGE_MAX_SIZE,
        onSelectMedia: handleSelectedMedia,
      });
    } catch (error) {
      console.error('Error navigating to image picker:', error);
      notificationApi.error({ message: 'Không thể mở thư viện ảnh' });
      setIsImagePickerActive(false);
    }
  };

  const handleFileSelect = async () => {
    if (!chatUser?.isFriend && !chatUser?.isGroup) {
      notificationApi.error({ message: 'Không thể gửi file cho người này' });
      return;
    }

    setIsUploadingImage(false);
    setIsImagePickerActive(true);

    try {
      let convId = conversationId;
      // Nếu chưa có conversationId, tạo mới trước khi mở FilePickerScreen
      if (!convId) {
        const convRes = await createConversationApi({
          participants: [currentUser?.userId, chatUser.userId],
          type: chatUser?.isGroup ? 'group' : 'direct',
        });
        if (convRes.data?.status && convRes.data?.data?.conversationId) {
          convId = convRes.data.data.conversationId;
          setConversationId(convId);
        } else {
          notificationApi.error({ message: 'Không thể tạo cuộc trò chuyện' });
          setIsImagePickerActive(false);
          return;
        }
      }
      navigation.navigate('FilePickerScreen', {
        conversationId: String(convId),
        senderId: String(currentUser?.userId), // Đảm bảo luôn truyền ID người dùng hiện tại
        receiverId: chatUser?.isGroup ? null : String(chatUser.userId),
        onSendMessage: (newMessage) => {
          // Khi nhận được message mới, thêm vào danh sách tin nhắn
          const messageWithSender = {
            ...newMessage,
            sender: {
              id: currentUser?.userId,
              name: currentUser?.fullName,
              avatar: currentUser?.avatar || defaultAvatar,
            },
          };
          setMessages(prev => [messageWithSender, ...prev]);
        },
        maxFileSize: VIDEO_MAX_SIZE,
      });
    } catch (error) {
      console.error('Error navigating to file picker:', error);
      notificationApi.error({ message: 'Không thể mở trình chọn file' });
      setIsImagePickerActive(false);
    }
  };

  // Hàm xử lý sau khi chọn media từ ImagePickerScreen hoặc FilePickerScreen
  const handleSelectedMedia = async (media) => {
    console.log('[DEBUG] handleSelectedMedia - media:', media);
    if (!chatUser?.isFriend && !chatUser?.isGroup) {
      notificationApi.error({ message: 'Không thể gửi media cho người này' });
      setIsUploadingImage(false);
      setIsImagePickerActive(false);
      return;
    }
    if (!media) {
      setIsUploadingImage(false);
      setIsImagePickerActive(false);
      return;
    }

    console.log('Received media for upload:', media);

    // Kiểm tra kích thước file
    const fileSize = media.fileSize || 0;
    const isImage = media.isImage || (media.type && media.type.startsWith('image'));
    const maxSize = isImage ? IMAGE_MAX_SIZE : VIDEO_MAX_SIZE;

    if (fileSize > maxSize) {
      notificationApi.error({
        message: `File quá lớn. Tối đa ${formatFileSize(maxSize)} cho ${isImage ? 'hình ảnh' : 'file'}`
      });
      setIsUploadingImage(false);
      setIsImagePickerActive(false);
      return;
    }

    // Kiểm tra URI hợp lệ
    if (!media.uri) {
      notificationApi.error({ message: 'Đường dẫn file không hợp lệ' });
      setIsUploadingImage(false);
      setIsImagePickerActive(false);
      return;
    }

    try {
      // Tạo temporary ID cho message
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      let uploadTimeout = null;

      if (!conversationId) {
        throw new Error('Không tìm thấy cuộc trò chuyện');
      }

      // Xác định loại message dựa trên file
      const isVideo = media.isVideo || (media.type && media.type.startsWith('video'));
      const isAudio = media.isAudio || (media.type && media.type.startsWith('audio'));

      const messageType = isImage ? 'image' : 'file';
      const fileExt = media.fileExt || media.fileName?.split('.').pop().toLowerCase() || 'unknown';

      // Xử lý tên file để loại bỏ dấu tiếng Việt
      let fileName = media.fileName || `${isVideo ? 'video' : isImage ? 'image' : 'file'}_${Date.now()}.${fileExt}`;
      // Loại bỏ dấu tiếng Việt trong tên file
      fileName = fileName.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-zA-Z0-9\._-]/g, '-');

      // Tạo metadata dựa trên thông tin file
      const metadata = {
        fileName: fileName,
        fileSize: media.fileSize || 0,
        mimeType: media.type || 'application/octet-stream',
        fileExt: fileExt,
        originalUpload: true,
        messageText: newMessage.trim(),
        width: media.width || 0,
        height: media.height || 0,
        timestamp: Date.now(),
        isImage,
        isVideo,
        isAudio
      };

      // Hiển thị message tạm thời
      const tempMessage = {
        messageId: tempId,
        conversationId,
        senderId: currentUser?.userId,
        type: messageType,
        content: 'Đang tải...',
        createdAt: Date.now(),
        status: 'sending',
        metadata: JSON.stringify(metadata),
        sender: {
          id: currentUser?.userId,
          name: currentUser?.fullName,
          avatar: currentUser?.avatar,
        },
      };

      setMessages((prev) => [...prev, tempMessage]);
      scrollToBottom();

      // Đặt timeout để tránh loading vô hạn
      uploadTimeout = setTimeout(() => {
        setIsUploadingImage(false);
        setIsImagePickerActive(false);
        setMessages((prev) => prev.filter((msg) => msg.messageId !== tempId));
        notificationApi.error({ message: 'Tải lên quá thời gian. Vui lòng thử lại sau.' });
      }, 30000); // 30 giây timeout

      // Upload file
      setIsUploadingImage(true);
      setIsImagePickerActive(false);
      console.log('[DEBUG] Starting upload...', { isUploadingImage: true, isImagePickerActive: false });

      // Chuẩn bị FormData để upload
      const formData = new FormData();

      // Xử lý chính xác URI, đặc biệt cho content URI trên Android
      let fileUri = media.uri;
      console.log('Original URI:', fileUri);

      // Xử lý file cho form data upload
      const fileType = media.type || (isVideo ? 'video/mp4' : isImage ? 'image/jpeg' : 'application/octet-stream');

      // Đầu tiên, kiểm tra xem URI là content:// hay file://
      if (Platform.OS === 'android' && fileUri.includes('content://')) {
        // Đối với URI content://, không bao gồm tiền tố file://
        if (fileUri.startsWith('file://')) {
          fileUri = fileUri.replace('file://', '');
        }
        console.log('Using content URI directly:', fileUri);
      } else if (Platform.OS === 'android') {
        // Đảm bảo URI file:// trên Android được xử lý đúng
        if (fileUri.startsWith('file://')) {
          fileUri = fileUri.replace('file://', '');
        }
        console.log('Using file path on Android:', fileUri);
      } else {
        // iOS
        console.log('Using URI on iOS:', fileUri);
      }

      // Tạo đối tượng file với thông tin đầy đủ
      const fileObject = {
        uri: Platform.OS === 'android' ? fileUri : fileUri,
        type: fileType,
        name: fileName,
      };

      console.log('File object for upload:', fileObject);

      // Chọn trường name phù hợp dựa trên loại file
      const uploadField = isImage ? 'image' : 'file';

      // Thêm file vào form data
      formData.append(uploadField, fileObject);
      formData.append('conversationId', conversationId);
      formData.append('fileName', fileName);
      formData.append('fileType', fileType);
      formData.append('fileSize', media.fileSize || 0);
      formData.append('metadata', JSON.stringify(metadata));

      if (newMessage.trim()) {
        formData.append('messageText', newMessage.trim());
      }

      // Chọn API endpoint phù hợp
      const uploadFunction = isImage ? uploadMessageImageApi : uploadMessageFileApi;

      let response;
      try {
        console.log('[DEBUG] Calling upload API, waiting for response...');
        response = await uploadFunction(formData);
        if (uploadTimeout) {
          clearTimeout(uploadTimeout);
          uploadTimeout = null;
        }
        console.log('[DEBUG] Upload response received:', response.data);
        if (!response.data?.status) {
          throw new Error(response.data?.message || 'Upload thất bại');
        }
      } catch (uploadError) {
        console.error('[DEBUG] Network error during upload:', uploadError);
        if (uploadError.response) {
          console.error('[DEBUG] Lỗi từ server:', uploadError.response.data);
          console.error('[DEBUG] Status code:', uploadError.response.status);
        } else if (uploadError.request) {
          console.error('[DEBUG] Không nhận được phản hồi từ server, request:', typeof uploadError.request);
        } else {
          console.error('[DEBUG] Lỗi khi thiết lập request:', uploadError.message);
        }
        throw new Error(`[DEBUG] Lỗi mạng: ${uploadError.message}`);
      }

      // Xử lý response sau khi upload
      const fileUrl = response.data?.data.url || response.data?.data.content;
      if (!fileUrl) {
        throw new Error('Không nhận được URL file từ server');
      }

      console.log('File uploaded successfully, URL:', fileUrl);

      // Kiểm tra xem uploadMessageImageApi đã tạo message trong database chưa
      if (response.data?.data?.messageId) {
        console.log('[DEBUG] Message đã được tạo bởi API upload, không cần gọi sendMessageApi');
        // Tạo finalMessage từ message có sẵn
        const finalMessage = {
          ...response.data?.data,
          content: fileUrl,
          type: messageType,
          status: 'sent',
          senderId: currentUser?.userId,
          createdAt: response.data?.data.createdAt || Date.now(),
          sender: {
            id: currentUser?.userId,
            name: currentUser?.fullName,
            avatar: currentUser?.avatar,
          },
          metadata: response.data?.data.metadata || JSON.stringify(metadata),
        };
        setMessages((prev) =>
          prev.map((msg) => (msg.messageId === tempId ? finalMessage : msg))
        );
        // Emit socket cho file (debug)
        if (socket?.connected && finalMessage.messageId && messageType === 'file') {
          const socketData = {
            ...finalMessage,
            conversationId,
            to: chatUser?.isGroup ? null : chatUser.userId,
            isGroupMessage: chatUser?.isGroup,
            type: messageType,
            senderId: currentUser?.userId,
            senderName: currentUser?.fullName,
            senderAvatar: currentUser?.avatar,
            messageId: finalMessage.messageId,
            content: fileUrl,
            metadata: finalMessage.metadata,
          };
          console.log('[DEBUG] App - Emit socket event sau khi gửi FILE thành công:', socketData);
          socket.emit('send-message', socketData);
          socket.emit('send-message-success', {
            ...socketData,
            senderName: currentUser?.fullName || 'Người dùng',
            senderAvatar: currentUser?.avatar || '',
            isSender: true, // Thêm trường này để phân biệt đây là tin nhắn của người gửi
            sender: {
              id: currentUser?.userId,
              name: currentUser?.fullName,
              avatar: currentUser?.avatar,
            },
          });
        } else if (socket?.connected && finalMessage.messageId && messageType === 'image') {
          const socketData = {
            ...finalMessage,
            conversationId,
            to: chatUser?.isGroup ? null : chatUser.userId,
            isGroupMessage: chatUser?.isGroup,
            type: messageType,
            senderId: currentUser?.userId,
            senderName: currentUser?.fullName,
            senderAvatar: currentUser?.avatar,
            messageId: finalMessage.messageId,
            content: fileUrl,
            metadata: finalMessage.metadata,
          };
          console.log('[DEBUG] App - Emit socket event sau khi gửi ẢNH thành công:', socketData);
          socket.emit('send-message', socketData);
          socket.emit('send-message-success', {
            ...socketData,
            senderName: currentUser?.fullName || 'Người dùng',
            senderAvatar: currentUser?.avatar || '',
            isSender: true, // Thêm trường này để phân biệt đây là tin nhắn của người gửi
            sender: {
              id: currentUser?.userId,
              name: currentUser?.fullName,
              avatar: currentUser?.avatar,
            },
          });
        } else {
          console.log('[DEBUG] Không emit socket vì không đủ điều kiện:', { connected: socket?.connected, messageId: finalMessage.messageId, messageType });
        }
        if (newMessage.trim()) {
          setNewMessage('');
        }
      } else {
        // Trường hợp API upload không tạo message, ta cần gọi sendMessageApi
        console.log('Upload API không tạo message, cần gọi sendMessageApi');
        // Gửi message với URL đã upload
        const messageData = {
          conversationId,
          senderId: currentUser?.userId,
          receiverId: chatUser?.isGroup ? null : chatUser.userId,
          type: messageType,
          content: fileUrl,
          metadata: JSON.stringify(metadata),
          ...(chatUser?.isGroup
            ? {
              senderName: currentUser?.fullName,
              senderAvatar: currentUser?.avatar,
              isGroupMessage: true,
            }
            : {}),
        };
        try {
          console.log('[DEBUG] Sending message with uploaded file data:', messageData);
          const messageResponse = await sendMessageApi(messageData);
          console.log('[DEBUG] Message API response:', messageResponse.data);
          if (!messageResponse.data?.status) {
            throw new Error(messageResponse.data?.message || 'Gửi tin nhắn thất bại');
          }
          // Cập nhật message thành công
          const finalMessage = {
            ...messageResponse.data?.data,
            content: fileUrl,
            type: messageType,
            status: 'sent',
            senderId: currentUser?.userId,
            createdAt: messageResponse.data?.data.createdAt || Date.now(),
            sender: {
              id: currentUser?.userId,
              name: currentUser?.fullName,
              avatar: currentUser?.avatar,
            },
            metadata: JSON.stringify(metadata),
          };
          setMessages((prev) =>
            prev.map((msg) => (msg.messageId === tempId ? finalMessage : msg))
          );
          if (socket?.connected && finalMessage.messageId && messageType === 'file') {
            const socketData = {
              ...finalMessage,
              conversationId,
              to: chatUser?.isGroup ? null : chatUser.userId,
              isGroupMessage: chatUser?.isGroup,
              type: messageType,
              senderId: currentUser?.userId,
              senderName: currentUser?.fullName,
              senderAvatar: currentUser?.avatar,
              messageId: finalMessage.messageId,
              content: fileUrl,
              metadata: finalMessage.metadata,
            };
            console.log('[DEBUG] App - Emit socket event sau khi gửi FILE (API không tạo message):', socketData);
            socket.emit('send-message', socketData);
            socket.emit('send-message-success', {
              ...socketData,
              senderName: currentUser?.fullName || 'Người dùng',
              senderAvatar: currentUser?.avatar || '',
              isSender: true, // Thêm trường này để phân biệt đây là tin nhắn của người gửi
              sender: {
                id: currentUser?.userId,
                name: currentUser?.fullName,
                avatar: currentUser?.avatar,
              },
            });
          } else if (socket?.connected && finalMessage.messageId && messageType === 'image') {
            const socketData = {
              ...finalMessage,
              conversationId,
              to: chatUser?.isGroup ? null : chatUser.userId,
              isGroupMessage: chatUser?.isGroup,
              type: messageType,
              senderId: currentUser?.userId,
              senderName: currentUser?.fullName,
              senderAvatar: currentUser?.avatar,
              messageId: finalMessage.messageId,
              content: fileUrl,
              metadata: finalMessage.metadata,
            };
            console.log('[DEBUG] App - Emit socket event sau khi gửi ẢNH (API không tạo message):', socketData);
            socket.emit('send-message', socketData);
            socket.emit('send-message-success', {
              ...socketData,
              senderName: currentUser?.fullName || 'Người dùng',
              senderAvatar: currentUser?.avatar || '',
              isSender: true, // Thêm trường này để phân biệt đây là tin nhắn của người gửi
              sender: {
                id: currentUser?.userId,
                name: currentUser?.fullName,
                avatar: currentUser?.avatar,
              },
            });
          } else {
            console.log('[DEBUG] Không emit socket (API không tạo message) vì không đủ điều kiện:', { connected: socket?.connected, messageId: finalMessage.messageId, messageType });
          }
          if (newMessage.trim()) {
            setNewMessage('');
          }
        } catch (messageError) {
          console.error('[DEBUG] Lỗi khi gửi tin nhắn sau khi upload:', messageError);
          throw new Error(`[DEBUG] Lỗi gửi tin nhắn: ${messageError.message}`);
        }
      }

      console.log('[DEBUG] Message sent successfully');
      scrollToBottom();
    } catch (error) {
      console.error('[DEBUG] App - Error sending media:', error);
      setMessages((prev) => prev.filter((msg) => msg.messageId !== tempId));
      notificationApi.error({ message: 'Không thể gửi file: ' + (error.message || 'Lỗi không xác định') });
    } finally {
      // Đảm bảo xóa timeout nếu vẫn tồn tại
      if (uploadTimeout) {
        clearTimeout(uploadTimeout);
      }
      console.log('[DEBUG] Upload finished, resetting states');
      setIsUploadingImage(false);
      setIsImagePickerActive(false);
    }
  };

  const handleCreateGroup = async (groupData) => {
    try {
      notificationApi.success({
        message: 'Tạo nhóm chat thành công',
      });
      handleCloseCreateGroupModal();
      if (groupData && groupData.conversationId) {
        setIsNewlyCreatedGroup(true);
        // Tạo tin nhắn hệ thống đầu tiên giống Zalo
        const introMessage = {
          messageId: `intro_${Date.now()}`,
          conversationId: groupData.conversationId,
          type: 'system',
          content: `Nhóm "${groupData.name || 'Nhóm chat'}" được tạo. Bắt đầu chia sẻ những câu chuyện thú vị cùng nhau!`,
          createdAt: new Date().toISOString(),
          isSystem: true,
        };
        const joinMessage = {
          messageId: `join_${Date.now()}`,
          conversationId: groupData.conversationId,
          type: 'system',
          content: `${currentUser.fullName} đã tạo nhóm và thêm ${(groupData.participants || []).filter(id => id !== currentUser.userId).length > 0 ? (groupData.participants || []).filter(id => id !== currentUser.userId).length + ' thành viên' : 'bạn'} vào nhóm`,
          createdAt: new Date().toISOString(),
          isSystem: true,
        };
        // Thêm vào messages nếu đang ở đúng màn hình nhóm vừa tạo
        if (conversationId === groupData.conversationId) {
          setMessages((prev) => [...prev, introMessage, joinMessage]);
          setTimeout(() => scrollToBottom(), 200);
        }
        if (socket?.connected) {
          socket.emit('send-message', introMessage);
          socket.emit('send-message', joinMessage);
        }
        setTimeout(() => {
          navigation.navigate('ChatDetail', {
            id: groupData.conversationId,
            justCreatedGroup: true,
            creatorId: currentUser.userId,
            participantsWithInfo: groupData.participantsWithInfo || [], // truyền thêm danh sách user có fullName
          });
        }, 100);
      }
    } catch (error) {
      notificationApi.error({
        message: 'Không thể tạo nhóm',
      });
    }
  };

  // Highlight keyword in message or fileName
  const highlightKeyword = (text, keyword) => {
    if (!keyword) return <Text>{text}</Text>;
    const regex = new RegExp(`(${keyword})`, 'gi');
    const parts = String(text).split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <Text key={i} style={{ backgroundColor: '#fff59d' }}>{part}</Text>
      ) : (
        <Text key={i}>{part}</Text>
      )
    );
  };

  const renderMessage = ({ item: msg, index }) => {
    // Đảm bảo so sánh đúng ID người gửi với ID người dùng hiện tại
    const isSender = String(msg.senderId) === String(currentUser?.userId) ||
      (msg.sender && String(msg.sender?.id) === String(currentUser?.userId));

    const isFirstMessage = index === 0;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar =
      !isSender &&
      (!prevMessage || prevMessage.sender?.id !== msg.sender?.id);
    const hasReactions = messageReactions[msg.messageId];
    const currentUserHasReacted =
      hasReactions && Object.values(hasReactions).some(r => r.userId === currentUser?.userId);

    // Kiểm tra tin nhắn đã bị xóa
    if (msg.isDeleted) {
      return (
        <View
          style={[
            styles.messageContainer,
            isSender ? styles.messageRight : styles.messageLeft,
            !isFirstMessage && !isSender && prevMessage?.sender?.id === msg.sender?.id
              ? { marginTop: 1, marginBottom: 5 }
              : { marginTop: 3, marginBottom: 15 },
          ]}
        >
          {!isSender && (
            <View style={styles.avatarContainer}>
              {(showAvatar || chatUser?.isGroup) && (
                <Image
                  source={msg.sender?.avatar ? { uri: msg.sender.avatar } : defaultAvatar}
                  style={styles.avatar}
                />
              )}
            </View>
          )}
          <View style={styles.messageWrapper}>
            <View
              style={[
                styles.messageBubble,
                isSender ? styles.senderBubble : styles.receiverBubble,
                { backgroundColor: '#f0f0f0' },
              ]}
            >
              <Text style={{ fontStyle: 'italic', color: '#666' }}>
                {msg.content}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    // Phân tích metadata nếu có
    let metadata = {};
    if (msg.metadata) {
      try {
        metadata = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
      } catch (e) {
        console.error('App - Error parsing metadata:', e);
      }
    }

    let isImage = msg.type === 'image';
    let isVideo = false;
    let isAudio = false;

    if (msg.type === 'file' && metadata) {
      const fileExt = metadata.fileExt?.toLowerCase();
      const mimeType = metadata.mimeType?.toLowerCase();
      isImage = metadata.isImage ||
        (fileExt && ['jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) ||
        (mimeType && mimeType.startsWith('image/'));
      isVideo = metadata.isVideo ||
        (fileExt && ['mp4', 'mov', 'avi'].includes(fileExt)) ||
        (mimeType && mimeType.startsWith('video/'));
      isAudio = metadata.isAudio ||
        (fileExt && ['mp3', 'wav', 'ogg'].includes(fileExt)) ||
        (mimeType && mimeType.startsWith('audio/'));
    }

    // Lấy text message kèm theo nếu có
    let messageText = '';
    if (metadata) {
      messageText = metadata.messageText || '';
    }

    let fileName = '';
    if (msg.metadata) {
      try {
        const meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
        fileName = meta.fileName || '';
      } catch { }
    }

    // Hiển thị các icon reaction và số lượng từng loại
    const reactionCounts = likedMessages[msg.messageId] || {};
    const reactionIcons = [
      { key: 'heart', icon: heartIcon },
      { key: 'haha', icon: require('../../assets/icons/haha.png') },
      { key: 'wow', icon: require('../../assets/icons/wow.png') },
      { key: 'cry', icon: require('../../assets/icons/cry.png') },
      { key: 'angry', icon: require('../../assets/icons/angry.png') },
      { key: 'like', icon: likeIcon },
    ];
    // Lấy danh sách các loại reaction đã được react, sắp xếp theo số lượng giảm dần, ưu tiên theo thứ tự reactionIcons
    const sortedReactions = reactionIcons
      .map(i => ({ ...i, count: reactionCounts[i.key] || 0 }))
      .filter(i => i.count > 0)
      .sort((a, b) => b.count - a.count || reactionIcons.findIndex(x => x.key === a.key) - reactionIcons.findIndex(x => x.key === b.key));
    // Lấy icon cuối cùng user này vừa react (nếu là sender)
    let lastUserReact = null;
    const msgReactions = messageReactions[msg.messageId] || {};
    if (isSender) {
      const userReact = msgReactions[currentUser?.userId];
      if (userReact) {
        if (Array.isArray(userReact)) {
          lastUserReact = userReact[userReact.length - 1]?.type;
        } else {
          lastUserReact = userReact.type;
        }
      }
    }

    if (msg.type === 'system' || msg.isSystem) {
      return (
        <View style={{ alignItems: 'center', marginVertical: 10 }}>
          <View style={{ backgroundColor: '#f1f2f4', borderRadius: 12, padding: 10, maxWidth: '90%' }}>
            <Text style={{ color: '#222', fontWeight: '500', textAlign: 'center' }}>{msg.content}</Text>
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageContainer,
          isSender ? styles.messageRight : styles.messageLeft,
          !isFirstMessage && !isSender && prevMessage?.sender?.id === msg.sender?.id
            ? { marginTop: 1, marginBottom: 5 }
            : { marginTop: 3, marginBottom: 15 },
        ]}
      >
        {!isSender && (
          <View style={styles.avatarContainer}>
            {(showAvatar || chatUser?.isGroup) && (
              <Image
                source={msg.sender?.avatar ? { uri: msg.sender.avatar } : defaultAvatar}
                style={styles.avatar}
              />
            )}
          </View>
        )}

        <View style={styles.messageWrapper}>
          <Pressable
            ref={ref => { if (ref) messageBubbleRefs.current[msg.messageId] = ref; }}
            style={[
              styles.messageBubble,
              isSender ? styles.senderBubble : styles.receiverBubble,
            ]}
            onPress={event => {
              console.log('Press message', msg);
              setSelectedMessage(msg);
              setActionSheetPosition({ x: 0, y: Dimensions.get('window').height / 3 });
              setActionSheetVisible(true);
            }}
          >
            {!isSender && chatUser?.isGroup && (!prevMessage || prevMessage.sender?.id !== msg.sender?.id) && (
              <Text style={styles.senderName}>{msg.sender?.name || 'Unknown'}</Text>
            )}
            {isImage ? (
              msg.status === 'sending' ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.loadingText}>Đang tải ảnh...</Text>
                </View>
              ) : (
                <View style={styles.imageContainer}>
                  <TouchableOpacity
                    onPress={() => setSelectedImage(safeImageUrl(msg.content))}
                  >
                    <Image
                      source={{
                        uri: safeImageUrl(msg.content),
                        headers: { Accept: 'image/*' },
                        cache: 'reload',
                      }}
                      style={styles.messageImage}
                      resizeMode="contain"
                      onLoadStart={() => console.log('App - Start loading image:', msg.content)}
                      onLoadEnd={() => console.log('App - Finish loading image:', msg.content)}
                      onError={(error) => {
                        console.error('App - Image loading error:', error.nativeEvent.error, 'URL:', msg.content);
                        notificationApi.error({ message: 'Không thể tải ảnh' });
                      }}
                    />
                  </TouchableOpacity>
                  {messageText && (
                    <Text style={[styles.messageText, { marginTop: 4 }]}>
                      {messageText}
                    </Text>
                  )}
                </View>
              )
            ) : msg.type === 'file' ? (
              msg.status === 'sending' ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.loadingText}>Đang tải file...</Text>
                </View>
              ) : (
                (() => {
                  if (isVideo) {
                    return (
                      <View style={styles.fileContainer}>
                        <Video
                          source={{ uri: safeImageUrl(msg.content) }}
                          style={styles.messageVideo}
                          controls
                          resizeMode="contain"
                        />
                        <TouchableOpacity
                          onPress={() => Linking.openURL(safeImageUrl(msg.content))}
                          style={styles.fileInfoContainer}
                        >
                          <Image source={getFileIconImage(fileExt)} style={{ width: 30, height: 30, marginRight: 8 }} />
                          <View style={styles.fileInfo}>
                            <Text style={styles.fileName}>
                              {searchMode && searchKeyword.trim()
                                ? highlightKeyword(fileName || 'Video.mp4', searchKeyword.trim())
                                : (fileName || 'Video.mp4')}
                            </Text>
                            <Text style={styles.fileSize}>
                              {formatFileSize(metadata.fileSize || 0)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        {messageText && (
                          <Text style={[styles.messageText, { marginTop: 4 }]}> {messageText} </Text>
                        )}
                      </View>
                    );
                  }
                  if (isAudio) {
                    return (
                      <View style={styles.fileContainer}>
                        <TouchableOpacity
                          onPress={() => {
                            // Phát audio bằng AudioRecorderPlayer
                            audioRecorderPlayer.startPlayer(msg.content);
                          }}
                          style={styles.fileInfoContainer}
                        >
                          <Image source={require('../../assets/icons/audio.png')} style={{ width: 30, height: 30, marginRight: 8 }} />
                          <View style={styles.fileInfo}>
                            <Text style={styles.fileName}>{fileName || 'Voice.mp3'}</Text>
                            <Text style={styles.fileSize}>{formatFileSize(metadata.fileSize || 0)}</Text>
                          </View>
                        </TouchableOpacity>
                        {messageText && (
                          <Text style={[styles.messageText, { marginTop: 4 }]}> {messageText} </Text>
                        )}
                      </View>
                    );
                  }
                  // Xử lý các loại file khác
                  const fileExt = metadata.fileExt?.toLowerCase() || '';
                  let iconName = 'file';
                  let iconColor = '#6b7280';

                  if (fileExt === 'pdf') {
                    iconName = 'file-pdf';
                    iconColor = '#ef4444';
                  } else if (['xlsx', 'xls'].includes(fileExt)) {
                    iconName = 'file-excel';
                    iconColor = '#16a34a';
                  } else if (['pptx', 'ppt'].includes(fileExt)) {
                    iconName = 'file-powerpoint';
                    iconColor = '#f97316';
                  } else if (['docx', 'doc'].includes(fileExt)) {
                    iconName = 'file-word';
                    iconColor = '#3b82f6';
                  } else if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json'].includes(fileExt)) {
                    iconName = 'file-code';
                    iconColor = '#9333ea';
                  } else if (fileExt === 'csv') {
                    iconName = 'file-csv';
                    iconColor = '#16a34a';
                  } else if (fileExt === 'txt') {
                    iconName = 'file-alt';
                    iconColor = '#3b82f6';
                  } else if (['zip', 'rar'].includes(fileExt)) {
                    iconName = 'file-archive';
                    iconColor = fileExt === 'zip' ? '#eab308' : '#9333ea';
                  }

                  return (
                    <View style={styles.fileContainer}>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(safeImageUrl(msg.content))}
                        style={styles.fileInfoContainer}
                      >
                        <Image source={getFileIconImage(fileExt)} style={{ width: 28, height: 28, marginRight: 8 }} />
                        <View style={styles.fileInfo}>
                          <Text style={styles.fileName}>
                            {searchMode && searchKeyword.trim()
                              ? highlightKeyword(fileName || 'File', searchKeyword.trim())
                              : (fileName || 'File')}
                          </Text>
                          <Text style={styles.fileSize}>
                            {formatFileSize(metadata.fileSize || 0)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      {messageText && (
                        <Text style={[styles.messageText, { marginTop: 4 }]}> {messageText} </Text>
                      )}
                    </View>
                  );
                })()
              )
            ) : (
              <Text style={styles.messageText}>
                {searchMode && searchKeyword.trim()
                  ? highlightKeyword(msg.content, searchKeyword.trim())
                  : msg.content}
              </Text>
            )}
            <Text style={styles.messageTime}>
              {msg.createdAt
                ? new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                : 'Vừa gửi'}
            </Text>
          </Pressable>

          <View
            style={[
              styles.reactionContainer,
              isSender ? { right: 12, left: undefined, bottom: -22, flexDirection: 'row-reverse' } : { left: 12, right: undefined, bottom: -22, flexDirection: 'row' },
            ]}
          >
            {/* Hiển thị icon cuối cùng user này vừa react và tổng số user đã react (giống Facebook) */}
            {(() => {
              // Lấy reaction của currentUser
              const msgReactions = messageReactions[msg.messageId] || {};
              let userReactType = null;
              const userReact = msgReactions[currentUser?.userId];
              if (userReact) {
                if (Array.isArray(userReact)) {
                  userReactType = userReact[userReact.length - 1]?.type;
                } else {
                  userReactType = userReact.type;
                }
              }
              // Đếm tổng số user đã react (mỗi user chỉ tính 1 lần)
              const totalUserReact = Object.keys(msgReactions).length;
              // Icon hiển thị là icon cuối cùng user này react, nếu chưa react thì không hiện
              if (userReactType) {
                const reactionIcons = [
                  { key: 'heart', icon: heartIcon },
                  { key: 'haha', icon: require('../../assets/icons/haha.png') },
                  { key: 'wow', icon: require('../../assets/icons/wow.png') },
                  { key: 'cry', icon: require('../../assets/icons/cry.png') },
                  { key: 'angry', icon: require('../../assets/icons/angry.png') },
                  { key: 'like', icon: require('../../assets/icons/like.png') },
                ];
                const iconObj = reactionIcons.find(i => i.key === userReactType);
                return (
                  <TouchableOpacity
                    style={styles.reactionCount}
                    onPress={() => handleOpenReactionModal(msg.messageId)}
                  >
                    <Image source={iconObj?.icon} style={{ width: 19, height: 19, marginRight: 2 }} />
                    <Text style={styles.reactionCountText}>{totalUserReact}</Text>
                  </TouchableOpacity>
                );
              }
              return null;
            })()}
          </View>
        </View>
      </View>
    );
  };

  const UserInfoModal = () => (
    <Modal
      isVisible={isUserInfoModalOpen}
      onBackdropPress={() => setIsUserInfoModalOpen(false)}
      style={styles.modal}
    >
      <View style={styles.modalContent}>
        <Image
          source={chatUser?.avatar ? { uri: chatUser.avatar } : defaultAvatar}
          style={styles.modalAvatar}
        />
        <Text style={styles.modalName}>{chatUser?.fullName}</Text>
        <Text style={styles.modalStatus}>
          {chatUser?.isGroup
            ? `${chatUser?.participants?.length || 0} thành viên`
            : chatUser?.isOnline
              ? 'Đang hoạt động'
              : chatUser?.lastActive
                ? (() => {
                  const lastActive = new Date(chatUser.lastActive);
                  const now = new Date();
                  const diffInMinutes = Math.floor((now - lastActive) / (1000 * 60));

                  if (diffInMinutes < 1) return 'Vừa truy cập';
                  if (diffInMinutes < 60) return `Truy cập ${diffInMinutes} phút trước`;
                  const diffInHours = Math.floor(diffInMinutes / 60);
                  if (diffInHours < 24) return `Truy cập ${diffInHours} giờ trước`;
                  const diffInDays = Math.floor(diffInHours / 24);
                  return `Truy cập ${diffInDays} ngày trước`;
                })()
                : 'Không hoạt động'}
        </Text>
        <TouchableOpacity
          style={styles.modalCloseButton}
          onPress={() => setIsUserInfoModalOpen(false)}
        >
          <Text style={styles.modalCloseText}>Đóng</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  const ReactionModal = () => {
    if (!selectedMessageReactions) return null;
    const { reactions, filterType } = selectedMessageReactions;
    // Đếm tổng số, từng loại
    const REACTION_TYPES = [
      { key: 'heart', label: '❤️' },
      { key: 'haha', label: '😆' },
      { key: 'wow', label: '😮' },
      { key: 'cry', label: '😢' },
      { key: 'angry', label: '😡' },
      { key: 'like', label: '👍' },
    ];
    // Đếm số lượng từng loại reaction trên toàn message (dựa vào backend trả về mỗi lần react là 1 object riêng biệt)
    const counts = {};
    Object.values(reactions).forEach(r => {
      if (r.type) counts[r.type] = (counts[r.type] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const reactionTypesOnMsg = REACTION_TYPES.filter(rt => counts[rt.key]);

    // Gom lại: mỗi user có thể có nhiều loại reaction (nếu react nhiều lần)
    // Tạo userReactionMap: { userId: { type: count, ... } }
    const userReactionMap = {};
    Object.entries(reactions).forEach(([uid, r]) => {
      if (!userReactionMap[uid]) userReactionMap[uid] = {};
      if (r.type) userReactionMap[uid][r.type] = 1;
    });

    // Chuẩn bị danh sách user
    let userList = [];
    if (!filterType) {
      userList = Object.entries(userReactionMap).map(([uid, reacts]) => ({ uid, reacts }));
    } else {
      userList = Object.entries(userReactionMap)
        .filter(([uid, reacts]) => reacts[filterType])
        .map(([uid, reacts]) => ({ uid, reacts: { [filterType]: reacts[filterType] } }));
    }

    return (
      <Modal
        isVisible={showReactionModal}
        onBackdropPress={() => setShowReactionModal(false)}
        style={{ margin: 0, justifyContent: 'flex-end' }}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        useNativeDriver
        backdropColor="transparent"
        backdropOpacity={0}
      >
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 12, minHeight: 260, maxHeight: '65%', marginBottom: 45 }}>
          {/* Tab emoji */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginBottom: 8 }}>
            <TouchableOpacity onPress={() => setSelectedMessageReactions({ ...selectedMessageReactions, filterType: null })}>
              <Text style={{ fontWeight: !filterType ? 'bold' : 'normal', fontSize: 17, marginRight: 14 }}>Tất cả {total}</Text>
            </TouchableOpacity>
            {reactionTypesOnMsg.map(rt => (
              <TouchableOpacity key={rt.key} onPress={() => setSelectedMessageReactions({ ...selectedMessageReactions, filterType: rt.key })} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 12, backgroundColor: filterType === rt.key ? '#eaf3ff' : 'transparent' }}>
                <Text style={{ fontSize: 22 }}>{rt.label}</Text>
                <Text style={{ fontSize: 15, marginLeft: 3 }}>{counts[rt.key]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Danh sách user */}
          <FlatList
            data={userList}
            keyExtractor={item => item.uid}
            renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 18, backgroundColor: '#f6fbff', borderRadius: 14, marginBottom: 10, marginHorizontal: 10 }}>
                <Image source={reactedUserDetails[item.uid]?.avatar ? { uri: reactedUserDetails[item.uid].avatar } : defaultAvatar} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 14 }} />
                <Text style={{ fontWeight: 'bold', fontSize: 17, marginRight: 10 }}>{reactedUserDetails[item.uid]?.fullName || item.uid}</Text>
                {/* Hiện các icon reaction của user này */}
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  {REACTION_TYPES.filter(rt => item.reacts[rt.key]).map(rt => (
                    <View key={rt.key} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                      <Text style={{ fontSize: 20 }}>{rt.label}</Text>
                      {item.reacts[rt.key] > 1 && <Text style={{ fontSize: 15, marginLeft: 2 }}>{item.reacts[rt.key]}</Text>}
                    </View>
                  ))}
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888', marginTop: 24 }}>Chưa có ai reaction</Text>}
            style={{ paddingBottom: 18 }}
          />
          {/* Thanh kéo xuống đóng modal */}
          <View style={{ alignItems: 'center', marginTop: 6, marginBottom: 8 }}>
            <View style={{ width: 48, height: 5, borderRadius: 3, backgroundColor: '#e0e0e0' }} />
          </View>
        </View>
      </Modal>
    );
  };

  // --- LOG mọi lần setShowVideoCall ---
  const setShowVideoCallWithLog = (val) => {
    console.log('[DEBUG] setShowVideoCall:', val);
    setShowVideoCall(val);
  };

  // Thêm log khi render IncomingCallModal
  console.log('[DEBUG] Render IncomingCallModal, incomingCall:', incomingCall);

  // Luôn render VideoCallModal khi showVideoCall.isOpen, kể cả khi loading hoặc chưa có chatUser
  if (showVideoCall.isOpen && (showVideoCall.isCallee || (showVideoCall.offer && showVideoCall.from && showVideoCall.callId))) {
    // Nếu chưa có chatUser, truyền receiver là object tạm
    const receiverProp = chatUser || { fullName: 'Đang kết nối...', userId: currentUser?.userId };
    return (
      <VideoCallModal
        isOpen={showVideoCall.isOpen}
        isCallee={showVideoCall.isCallee}
        offer={showVideoCall.offer || null}
        from={showVideoCall.from || null}
        callId={showVideoCall.callId || null}
        onClose={() => {
          setShowVideoCallWithLog({
            isOpen: false,
            isCallee: false,
            offer: null,
            from: null,
            callId: null,
          });
          setIncomingCall(null);
        }}
        receiver={receiverProp}
      />
    );
  }

  // Card giới thiệu nhóm khi vừa tạo (chỉ nhóm trưởng thấy)
  const renderGroupIntroCard = () => {
    if (!isNewlyCreatedGroup || !chatUser?.isGroup) return null;
    // Lấy danh sách thành viên từ participantsWithInfo nếu có
    let members = [];
    if (route?.params?.participantsWithInfo && Array.isArray(route.params.participantsWithInfo)) {
      members = route.params.participantsWithInfo.filter(m => m.userId !== currentUser?.userId);
    } else if (chatUser.participants && Array.isArray(chatUser.participants)) {
      members = chatUser.participants.filter(m => m.userId && m.userId !== currentUser?.userId);
    }
    if (members.length === 0) return null;
    // Hiển thị tối đa 3 avatar, các avatar chồng lên nhau
    const maxAvatars = 3;
    const avatars = members.slice(0, maxAvatars).map((m, idx) => (
      <Image
        key={m.userId}
        source={m.avatar ? { uri: m.avatar } : defaultAvatar}
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: '#fff',
          marginLeft: idx === 0 ? 0 : -10,
          zIndex: maxAvatars - idx,
        }}
      />
    ));
    // Tên các thành viên in đậm, cách nhau dấu phẩy
    const namesText = members.map((m, idx) => (
      <Text key={m.userId} style={{ fontWeight: 'bold' }}>{m.fullName}{idx < members.length - 1 ? ', ' : ''}</Text>
    ));
    return (
      <View style={{ alignItems: 'center', marginVertical: 10 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 10, maxWidth: '92%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }}>
          <View style={{ flexDirection: 'row', marginRight: 8 }}>{avatars}</View>
          <Text style={{ color: '#222', fontWeight: '500', textAlign: 'center', flexShrink: 1, flexWrap: 'wrap' }}>
            {namesText}  {"\n"} đã tham gia nhóm
          </Text>
        </View>
      </View>
    );
  };

  // Thêm hàm fetchGroupInfo để lấy lại thông tin nhóm từ server
  const fetchGroupInfo = async () => {
    if (!conversationId) return;
    try {
      console.log('[DEBUG] Bắt đầu fetchGroupInfo cho conversationId:', conversationId);
      const res = await getConversationsApi();
      const group = res.data?.data?.find(
        (conv) => conv.conversationId === conversationId && conv.type === 'group'
      );
      console.log('[DEBUG] fetchGroupInfo group:', group);
      if (group) {
        // Cập nhật state chatUser
        setChatUser((prev) => {
          const updated = {
            ...prev,
            participants: group.participants,
            fullName: group.name,
            avatar: group.avatar,
          };
          console.log('[DEBUG] setChatUser (fetchGroupInfo) participants:', updated.participants?.length, updated.participants);
          return updated;
        });

        // Cập nhật navigation params để các màn hình khác cũng nhận được thông tin mới
        navigation.setParams({
          participants: group.participants,
          name: group.name,
          avatar: group.avatar
        });
      }
    } catch (err) {
      console.error('Lỗi fetchGroupInfo:', err);
    }
  };

  // Hàm xin quyền ghi âm
  const requestAudioPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Quyền ghi âm',
          message: 'Ứng dụng cần quyền ghi âm để gửi tin nhắn thoại',
          buttonNeutral: 'Hỏi sau',
          buttonNegative: 'Từ chối',
          buttonPositive: 'Đồng ý',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  // Bắt đầu ghi âm
  const onStartRecord = async () => {
    const hasPerm = await requestAudioPermission();
    if (!hasPerm) return;
    setIsRecording(true);
    setRecordedFile(null);
    setRecordSecs(0);
    setRecordTime('00:00');
    let path;
    if (Platform.OS === 'android') {
      path = `${RNFS.DocumentDirectoryPath}/voice_${Date.now()}.mp3`;
    } else {
      path = 'voice.m4a';
    }
    setRecordedPath(path);
    try {
      await audioRecorderPlayer.startRecorder(path);
      // Remove any previous listener before adding new
      audioRecorderPlayer.removeRecordBackListener();
      audioRecorderPlayer.addRecordBackListener((e) => {
        const pos = Number(e.current_position);
        if (isNaN(pos) || pos < 0) {
          setRecordTime('00:00');
          setRecordSecs(0);
        } else {
          setRecordTime(audioRecorderPlayer.mmssss(Math.floor(pos)));
          setRecordSecs(pos);
        }
        return;
      });
    } catch (err) {
      setIsRecording(false);
    }
  };

  // Dừng ghi âm
  const onStopRecord = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setIsRecording(false);
      setRecordedFile(result); // result là path file
      setShowRecordModal(true);
    } catch (err) {
      setIsRecording(false);
    }
  };

  // Phát lại file ghi âm
  const onPlayRecord = async () => {
    if (!recordedFile) return;
    setIsPlayingRecord(true);
    try {
      await audioRecorderPlayer.startPlayer(recordedFile);
      // Remove any previous listener before adding new
      audioRecorderPlayer.removePlayBackListener();
      audioRecorderPlayer.addPlayBackListener((e) => {
        if (e.current_position >= e.duration) {
          audioRecorderPlayer.stopPlayer();
          setIsPlayingRecord(false);
          audioRecorderPlayer.removePlayBackListener();
        }
        return;
      });
    } catch (err) {
      setIsPlayingRecord(false);
      audioRecorderPlayer.removePlayBackListener();
    }
  };

  // Xóa file ghi âm
  const onDeleteRecord = () => {
    setRecordedFile(null);
    setShowRecordModal(false);
    setRecordSecs(0);
    setRecordTime('00:00');
    setIsPlayingRecord(false);
    audioRecorderPlayer.stopPlayer();
    audioRecorderPlayer.removePlayBackListener();
  };

  // Gửi file ghi âm như gửi file mp3
  const onSendRecord = async () => {
    if (!recordedFile) return;
    setShowRecordModal(false);
    setIsUploadingImage(true);
    try {
      const fileName = `voice_${Date.now()}.mp3`;
      const fileUri = Platform.OS === 'android' ? (recordedFile.startsWith('file://') ? recordedFile : 'file://' + recordedFile) : recordedFile;
      // Kiểm tra file tồn tại và lấy kích thước thực tế
      let fileStat = null;
      if (Platform.OS === 'android') {
        fileStat = await RNFS.stat(fileUri.replace('file://', ''));
      } else {
        fileStat = await RNFS.stat(fileUri);
      }
      const fileSize = fileStat ? Number(fileStat.size) : 0;
      if (Platform.OS === 'android') {
        const exists = await RNFS.exists(fileUri.replace('file://', ''));
        if (!exists) {
          notificationApi.error({ message: 'File ghi âm không tồn tại!' });
          setIsUploadingImage(false);
          return;
        }
      }
      const fileObject = {
        uri: fileUri,
        type: 'audio/mp3',
        name: fileName,
      };
      const formData = new FormData();
      formData.append('file', fileObject);
      formData.append('conversationId', conversationId);
      formData.append('fileName', fileName);
      formData.append('fileType', 'audio/mp3');
      formData.append('fileSize', fileSize);
      formData.append('metadata', JSON.stringify({ fileName, mimeType: 'audio/mp3', isAudio: true, duration: recordSecs, fileSize }));
      // Gửi lên server như gửi file
      const uploadFunction = uploadMessageFileApi;
      const response = await uploadFunction(formData);
      if (!response.data?.status) throw new Error(response.data?.message || 'Upload thất bại');
      const fileUrl = response.data?.data.url || response.data?.data.content;
      let messageId = response.data?.data.messageId;
      let finalMessage = null;
      if (messageId) {
        // Nếu API upload đã tạo message
        finalMessage = {
          ...response.data.data,
          content: fileUrl,
          type: 'file',
          status: 'sent',
          senderId: currentUser?.userId,
          createdAt: response.data?.data.createdAt || Date.now(),
          sender: {
            id: currentUser?.userId,
            name: currentUser?.fullName,
            avatar: currentUser?.avatar,
          },
          metadata: response.data?.data.metadata,
        };
      } else {
        // Nếu API upload chỉ trả về URL, cần gọi tiếp API gửi message
        const messageData = {
          conversationId,
          senderId: currentUser?.userId,
          receiverId: chatUser?.isGroup ? null : chatUser.userId,
          type: 'file',
          content: fileUrl,
          metadata: JSON.stringify({ fileName, mimeType: 'audio/mp3', isAudio: true, duration: recordSecs, fileSize }),
          ...(chatUser?.isGroup
            ? {
                senderName: currentUser?.fullName,
                senderAvatar: currentUser?.avatar,
                isGroupMessage: true,
              }
            : {}),
        };
        const messageResponse = await sendMessageApi(messageData);
        if (!messageResponse.data?.status) throw new Error(messageResponse.data?.message || 'Gửi tin nhắn thất bại');
        finalMessage = {
          ...messageResponse.data.data,
          content: fileUrl,
          type: 'file',
          status: 'sent',
          senderId: currentUser?.userId,
          createdAt: messageResponse.data?.data.createdAt || Date.now(),
          sender: {
            id: currentUser?.userId,
            name: currentUser?.fullName,
            avatar: currentUser?.avatar,
          },
          metadata: JSON.stringify({ fileName, mimeType: 'audio/mp3', isAudio: true, duration: recordSecs, fileSize }),
        };
        messageId = finalMessage.messageId;
      }
      // Thêm vào local messages
      setMessages((prev) => [
        ...prev,
        finalMessage,
      ]);
      // Emit socket cho Web nhận được
      if (socket?.connected && messageId) {
        socket.emit('send-message', {
          ...finalMessage,
          conversationId,
          to: chatUser?.isGroup ? null : chatUser.userId,
          isGroupMessage: chatUser?.isGroup,
        });
      }
      setIsUploadingImage(false);
    } catch (err) {
      setIsUploadingImage(false);
      notificationApi.error({ message: 'Không thể gửi file ghi âm: ' + (err.message || 'Lỗi không xác định') });
    }
  };

  const handleDeleteMessage = async (message) => {
    try {
      const response = await deleteMessageApi(message.messageId, conversationId);

      if (response.data?.status) {
        // Cập nhật UI local
        setMessages((prev) =>
          prev.map((msg) =>
            msg.messageId === message.messageId
              ? { ...msg, isDeleted: true, content: "Tin nhắn đã được thu hồi" }
              : msg
          )
        );

        // Emit socket event để thông báo cho người nhận
        if (socket?.connected) {
          socket.emit("message-deleted", {
            messageId: message.messageId,
            conversationId,
            senderId: currentUser?.userId,
            receiverId: chatUser?.userId,
            isDeleted: true,
            content: "Tin nhắn đã được thu hồi",
          });
        }

        notificationApi.success({ message: "Đã thu hồi tin nhắn" });
      } else {
        notificationApi.error({ 
          message: response.data?.message || "Không thể thu hồi tin nhắn" 
        });
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      notificationApi.error({ 
        message: error.message || "Có lỗi xảy ra khi thu hồi tin nhắn" 
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Search Bar UI */}
      {searchMode && (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 8, borderBottomWidth: 1, borderBottomColor: '#eee', paddingTop: Platform.OS === 'ios' ? 44 : 24, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
          <TouchableOpacity onPress={handleCloseSearch} style={{ padding: 4 }}>
            <Image source={arrowLeftIcon} style={{ width: 22, height: 22, tintColor: '#222' }} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 8, backgroundColor: '#f3f4f6', borderRadius: 8, flexDirection: 'row', alignItems: 'center', color: '#000' }}>
            <TextInput
              value={searchKeyword}
              onChangeText={handleSearch}
              placeholder="Tìm tin nhắn hoặc tên file..."
              style={{ flex: 1, padding: 8, fontSize: 16, color: '#000' }}
              autoFocus
            />
          </View>
          <Text style={{ marginHorizontal: 8, color: '#888', fontSize: 14 }}>
            {searchResults.length > 0 ? `Kết quả thứ ${currentSearchIndex + 1}/${searchResults.length}` : '0/0'}
          </Text>
          <TouchableOpacity onPress={handlePrevResult} style={{ padding: 4 }}>
            <Image source={chevronUpIcon} style={{ width: 22, height: 22, tintColor: '#3497fd' }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNextResult} style={{ padding: 4 }}>
            <Image source={chevronDownIcon} style={{ width: 22, height: 22, tintColor: '#3497fd' }} />
          </TouchableOpacity>
        </View>
      )}
      {/* Header chỉ hiện khi không searchMode */}
      {!searchMode && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <SafeTouchableOpacity onPress={handleHeaderBack}>
              <Image source={arrowLeftIcon} style={{ width: 22, height: 22, tintColor: '#fff' }} />
            </SafeTouchableOpacity>
            <SafeTouchableOpacity onPress={() => setIsUserInfoModalOpen(true)}>
              <Image
                source={chatUser?.avatar ? { uri: chatUser.avatar } : defaultAvatar}
                style={styles.headerAvatar}
              />
              {!chatUser?.isGroup && chatUser?.isOnline ? (
                <View style={styles.onlineIndicator} />
              ) : !chatUser?.isGroup ? (
                <View style={styles.offlineIndicator} />
              ) : null}
            </SafeTouchableOpacity>
            <View>
              <Text style={styles.headerName}>{displayName}</Text>
              <Text style={styles.headerStatus}>
                {chatUser?.isGroup
                  ? `${chatUser?.participants?.length || 0} thành viên`
                  : chatUser?.isOnline
                    ? 'Đang hoạt động'
                    : chatUser?.lastActive
                      ? (() => {
                        const lastActive = new Date(chatUser.lastActive);
                        const now = new Date();
                        const diffInMinutes = Math.floor((now - lastActive) / (1000 * 60));

                        if (diffInMinutes < 1) return 'Vừa truy cập';
                        if (diffInMinutes < 60) return `Truy cập ${diffInMinutes} phút trước`;
                        const diffInHours = Math.floor(diffInMinutes / 60);
                        if (diffInHours < 24) return `Truy cập ${diffInHours} giờ trước`;
                        const diffInDays = Math.floor(diffInHours / 24);
                        return `Truy cập ${diffInDays} ngày trước`;
                      })()
                      : 'Không hoạt động'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <SafeTouchableOpacity
              style={styles.headerButton}
              onPress={handleVideoCall}
              disabled={(!chatUser?.isFriend && !chatUser?.isGroup) || isInCall}
            >
              <Image source={videoIcon} style={{ width: 22, height: 22, tintColor: (!chatUser?.isFriend && !chatUser?.isGroup) || isInCall ? '#aaa' : '#081b3a' }} />
            </SafeTouchableOpacity>
            <SafeTouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('ChatInfoScreen', {
                chatUser,
                conversationId,
              })}
            >
              <Image source={viewColumnIcon} style={{ width: 20, height: 20, tintColor: '#fff' }} />
            </SafeTouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.chatContainer}>
        {!chatUser?.isFriend && !chatUser?.isGroup && (
          <View style={styles.friendRequestBanner}>
            <View style={styles.friendRequestTextContainer}>
              <Icon name="adduser" size={16} color="#000" />
              <Text style={styles.friendRequestText}>
                {hasReceivedRequest
                  ? 'Người này đã gửi lời mời kết bạn cho bạn'
                  : hasSentRequest
                    ? 'Đã gửi lời mời kết bạn'
                    : 'Gửi yêu cầu kết bạn tới người này'}
              </Text>
            </View>
            {hasReceivedRequest ? (
              <View style={styles.friendRequestButtons}>
                <SafeTouchableOpacity
                  onPress={handleAcceptRequest}
                  disabled={accepting || rejecting}
                  style={[styles.friendRequestButton, accepting && styles.disabledButton]}
                >
                  {accepting ? (
                    <View style={styles.buttonLoading}>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.buttonText}>Đồng ý</Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>Đồng ý</Text>
                  )}
                </SafeTouchableOpacity>
                <SafeTouchableOpacity
                  onPress={handleRejectRequest}
                  disabled={accepting || rejecting}
                  style={[styles.friendRequestButton, styles.rejectButton, rejecting && styles.disabledButton]}
                >
                  {rejecting ? (
                    <View style={styles.buttonLoading}>
                      <ActivityIndicator size="small" color="#000" />
                      <Text style={[styles.buttonText, { color: '#000' }]}>Từ chối</Text>
                    </View>
                  ) : (
                    <Text style={[styles.buttonText, { color: '#000' }]}>Từ chối</Text>
                  )}
                </SafeTouchableOpacity>
              </View>
            ) : (
              <SafeTouchableOpacity
                onPress={handleSendRequest}
                disabled={sending || hasSentRequest}
                style={[styles.friendRequestButton, (sending || hasSentRequest) && styles.disabledButton]}
              >
                {sending ? (
                  <View style={styles.buttonLoading}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.buttonText}>Gửi kết bạn</Text>
                  </View>
                ) : hasSentRequest ? (
                  <Text style={styles.buttonText}>Đã gửi</Text>
                ) : (
                  <Text style={styles.buttonText}>Gửi kết bạn</Text>
                )}
              </SafeTouchableOpacity>
            )}
          </View>
        )}

        <FlatList
          ref={scrollViewRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => item.messageId || index.toString()}
          ListHeaderComponent={
            <>
              <View style={styles.dateHeader}>
                <Text style={styles.dateText}>
                  {new Date().toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              {renderGroupIntroCard()}
            </>
          }
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => scrollToBottom()}
          onLayout={() => scrollToBottom()}
        />
        {chatUserTyping && (
          <Text style={styles.typingIndicator}>
            <Text style={styles.animatePulse}>{displayName} đang nhập...</Text>
          </Text>
        )}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.actionButton, (!chatUser?.isFriend && !chatUser?.isGroup) && styles.disabledActionButton]} disabled={!chatUser?.isFriend && !chatUser?.isGroup}>
            <Image source={stickerIcon} style={{ width: 23, height: 23 }} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, (!chatUser?.isFriend && !chatUser?.isGroup) || isUploadingImage ? styles.disabledActionButton : null]} onPress={chatUser?.isFriend && !isUploadingImage ? handleImageSelect : null} disabled={(!chatUser?.isFriend && !chatUser?.isGroup) || isUploadingImage}>
            <Image source={fileImageIcon} style={{ width: 20, height: 20 }} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, (!chatUser?.isFriend && !chatUser?.isGroup) && styles.disabledActionButton]} onPress={(chatUser?.isFriend || chatUser?.isGroup) ? handleFileSelect : null} disabled={!chatUser?.isFriend && !chatUser?.isGroup}>
            <Image source={fileDefaultIcon} style={{ width: 20, height: 20 }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Image source={moreIcon} style={{ width: 23, height: 23 }} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowRecordModal(true)}
            disabled={!chatUser?.isFriend && !chatUser?.isGroup}
          >
            <Image
              source={require('../../assets/icons/micro.png')}
              style={{ width: 24, height: 24, tintColor: '#222' }}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            ref={messageInputRef}
            value={newMessage}
            onChangeText={handleInputChange}
            onSubmitEditing={handleSendMessage}
            editable={chatUser?.isFriend || chatUser?.isGroup}
            style={[styles.input, (!chatUser?.isFriend && !chatUser?.isGroup) && styles.disabledInput]}
            placeholder={
              chatUser?.isFriend || chatUser?.isGroup
                ? `Nhập @, tin nhắn tới ${chatUser.fullName}`
                : 'Hãy kết bạn để nhắn tin'
            }
            placeholderTextColor="#647187"
            multiline
          />
          <TouchableOpacity style={[styles.smileyButton, (!chatUser?.isFriend && !chatUser?.isGroup) && styles.disabledActionButton]} onPress={() => setShowEmojiPicker(!showEmojiPicker)} disabled={!chatUser?.isFriend && !chatUser?.isGroup}>
            <Image source={smileyIcon} style={{ width: 24, height: 24 }} />
          </TouchableOpacity>
          {(chatUser?.isFriend || chatUser?.isGroup) && (newMessage.trim() === '' ? (
            <TouchableOpacity onPress={handleSendLike} style={styles.sendButton}>
              <Image source={likeIcon} style={{ width: 24, height: 24 }} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleSendMessage} disabled={!newMessage.trim()} style={[styles.sendButton, !newMessage.trim() && styles.disabledSendButton]}>
              <Image source={sendIcon} style={{ width: 20, height: 20 }} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {showEmojiPicker && (
        <View style={styles.emojiPickerContainer}>
          <EmojiPicker onSelectEmoji={handleEmojiSelect} />
        </View>
      )}

      <Modal
        isVisible={!!selectedImage}
        onBackdropPress={() => setSelectedImage(null)}
        style={styles.imageModal}
      >
        <View style={styles.imageModalContent}>
          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => setSelectedImage(null)}
          >
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Image
            source={{ uri: selectedImage }}
            style={styles.fullImage}
            resizeMode="contain"
            onError={(error) => {
              console.error('Error loading full image:', error.nativeEvent.error);
              notificationApi.error({
                message: 'Không thể tải ảnh đầy đủ. Vui lòng thử lại sau.'
              });
              // Tự động đóng modal sau khi lỗi
              setTimeout(() => setSelectedImage(null), 2000);
            }}
          />
        </View>
      </Modal>

      <UserInfoModal />
      <ReactionModal />

      {/* VideoCallModal - hiển thị cho cả cuộc gọi đi và đến */}
      {(showVideoCall.isOpen || incomingCall) && (
        <VideoCallModal
          isOpen={true}
          isCallee={!!incomingCall}
          offer={incomingCall?.offer || showVideoCall.offer}
          from={incomingCall?.from || showVideoCall.from}
          callId={incomingCall?.callId || showVideoCall.callId}
          onClose={() => {
            if (incomingCall) {
              handleRejectCall();
            } else {
              setShowVideoCallWithLog({
                isOpen: false,
                isCallee: false,
                offer: null,
                from: null,
                callId: null,
              });
            }
          }}
          receiver={chatUser || { fullName: 'Đang kết nối...', userId: currentUser?.userId }}
        />
      )}
      <MessageActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        onEmojiPress={emojiKey => {
          setActionSheetVisible(false);
          if (selectedMessage) handleLikeMessage(selectedMessage.messageId, emojiKey);
        }}
        onActionPress={actionKey => {
          setActionSheetVisible(false);
          if (actionKey === 'delete' && selectedMessage) {
            handleDeleteMessage(selectedMessage);
          }
          // TODO: Xử lý các action khác ở đây
          // Ví dụ: if (actionKey === 'copy') Clipboard.setString(selectedMessage.content);
        }}
        selectedMessage={selectedMessage}
        isSender={selectedMessage ? (String(selectedMessage.senderId) === String(currentUser?.userId) || (selectedMessage.sender && String(selectedMessage.sender?.id) === String(currentUser?.userId))) : false}
      />
      {showRecordModal && (
        <Modal
          isVisible={showRecordModal}
          onBackdropPress={onDeleteRecord}
          style={{ margin: 0, justifyContent: 'flex-end' }}
          animationIn="slideInUp"
          animationOut="slideOutDown"
          useNativeDriver
          backdropColor="transparent"
          backdropOpacity={0}
        >
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, alignItems: 'center', minHeight: 220 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Ghi âm</Text>
            {/* Nút ghi âm lớn ở giữa modal */}
            {!isRecording && !recordedFile && (
              <TouchableOpacity onPress={onStartRecord} style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 18, backgroundColor: '#e0e7ff', borderRadius: 50, width: 70, height: 70 }}>
                <Image source={require('../../assets/icons/micro.png')} style={{ width: 40, height: 40, tintColor: '#3497fd' }} />
                <Text style={{ color: '#3497fd', marginTop: 6, fontWeight: 'bold' }}>Bắt đầu</Text>
              </TouchableOpacity>
            )}
            {isRecording && (
              <TouchableOpacity onPress={onStopRecord} style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 18, backgroundColor: '#fee2e2', borderRadius: 50, width: 70, height: 70 }}>
                <Image source={require('../../assets/icons/micro.png')} style={{ width: 40, height: 40, tintColor: '#ef4444' }} />
                <Text style={{ color: '#ef4444', marginTop: 6, fontWeight: 'bold' }}>Dừng</Text>
              </TouchableOpacity>
            )}
            {/* Hiện thời gian ghi âm */}
            <Text style={{ fontSize: 22, color: isRecording ? '#ef4444' : '#3497fd', fontWeight: 'bold', marginBottom: 8 }}>{recordTime}</Text>
            {/* Sau khi ghi xong mới hiện các nút Xóa, Nghe lại, Gửi */}
            {recordedFile && !isRecording && (
              <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%', marginTop: 12 }}>
                <TouchableOpacity onPress={onDeleteRecord} style={{ alignItems: 'center', marginHorizontal: 18 }}>
                  <Image source={require('../../assets/icons/delete.png')} style={{ width: 32, height: 32, tintColor: '#ef4444' }} />
                  <Text style={{ color: '#ef4444', marginTop: 4 }}>Xóa</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onPlayRecord} style={{ alignItems: 'center', marginHorizontal: 18 }} disabled={isPlayingRecord}>
                  <Image source={require('../../assets/icons/play.jpg')} style={{ width: 38, height: 38 }} />
                  <Text style={{ color: '#3497fd', marginTop: 4 }}>{isPlayingRecord ? 'Đang phát...' : 'Nghe lại'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onSendRecord} style={{ alignItems: 'center', marginHorizontal: 18 }}>
                  <Image source={require('../../assets/icons/send.png')} style={{ width: 32, height: 32, tintColor: '#22c55e' }} />
                  <Text style={{ color: '#22c55e', marginTop: 4 }}>Gửi</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#6b7280',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#3497fd', // Zalo blue
    paddingTop: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 24),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    marginLeft: 10,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 10,
    width: 14,
    height: 14,
    backgroundColor: '#22c55e',
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  offlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 10,
    width: 14,
    height: 14,
    backgroundColor: '#d1d5db',
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff', // White text
  },
  headerStatus: {
    fontSize: 12,
    color: '#e6f0fd', // Light blue/white
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  headerButton: {
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#ebecf0',
  },
  friendRequestBanner: {
    margin: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.15)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  friendRequestTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendRequestText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 8,
  },
  friendRequestButtons: {
    flexDirection: 'row',
  },
  friendRequestButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#0068ff',
    marginLeft: 8,
  },
  rejectButton: {
    backgroundColor: '#e5e7eb',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  messageList: {
    paddingHorizontal: 12,
    paddingBottom: 20,
    paddingLeft: 3,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
    minHeight: 56,
  },
  messageLeft: {
    justifyContent: 'flex-start',
  },
  messageRight: {
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    width: 40,
    minWidth: 40,
    marginRight: 24, // giảm khoảng cách avatar-bubble
    marginLeft: -5, // avatar sát lề trái
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  messageWrapper: {
    position: 'relative',
    maxWidth: '70%',
    minWidth: 60,
    marginBottom: 8,
  },
  messageBubble: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#fff',
    minWidth: 60,
    minHeight: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 1,
  },
  senderBubble: {
    backgroundColor: '#dbebff',
  },
  receiverBubble: {
    backgroundColor: '#fff',
  },
  senderName: {
    fontSize: 11,
    color: '#707c8f',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#081b3a',
  },
  messageTime: {
    fontSize: 12,
    color: '#44546f',
    marginTop: 4,
    textAlign: 'right',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  messageVideo: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  messageAudio: {
    width: 360,
    maxWidth: width * 0.6,
  },
  fileContainer: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginVertical: 2,
    marginBottom: 6,
    minWidth: 220,
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
    elevation: 1,
  },
  fileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
    marginBottom: 2,
  },
  fileInfo: {
    flex: 1,
    flexDirection: 'column',
    minWidth: 0,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222',
    width: '100%',
    flex: 1,
    flexShrink: 1,
    flexWrap: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  fileSize: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#000',
  },
  reactionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: 12,
    bottom: -22,
    zIndex: 10,
    // Đảm bảo hai trái tim cùng hàng, sát dưới bubble
  },
  reactionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.13,
    shadowRadius: 1,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  reactionCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 16,
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.13,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  reactionCountText: {
    fontSize: 15,
    marginLeft: 4,
    color: '#ef4444',
    fontWeight: '600',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.15)',
    backgroundColor: '#fff',
    padding: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  disabledActionButton: {
    opacity: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#081b3a',
    paddingVertical: 8,
    maxHeight: 100,
  },
  disabledInput: {
    backgroundColor: '#e5e7eb',
  },
  smileyButton: {
    padding: 4,
  },
  sendButton: {
    padding: 8,
    borderRadius: 24,
  },
  disabledSendButton: {
    opacity: 0.5,
  },
  emojiPickerContainer: {
    marginTop: 8,
  },
  imageModal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 8,
    zIndex: 10,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  modal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.8,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  modalName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalStatus: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  modalCloseButton: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#0068ff',
    borderRadius: 8,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  reactionUser: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    width: '100%',
  },
  reactionUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reactionUserName: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  reactionCount: {
    fontSize: 14,
    color: '#000',
  },
  typingIndicator: {
    fontSize: 14,
    color: '#000',
    paddingLeft: 12,
    paddingBottom: 8,
    backgroundColor: '#ebecf0',
  },
  animatePulse: {
    opacity: 1,
    animationName: 'pulse',
    animationDuration: '1.5s',
    animationIterationCount: 'infinite',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.15)',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    marginLeft: 10,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#06132b',
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#06132b',
  },
  userStatus: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
});

const EMOJIS = [
  { key: 'heart', icon: require('../../assets/icons/heart.png') },
  { key: 'like', icon: require('../../assets/icons/like.png') },
  { key: 'haha', icon: require('../../assets/icons/haha.png') },
  { key: 'wow', icon: require('../../assets/icons/wow.png') },
  { key: 'cry', icon: require('../../assets/icons/cry.png') },
  { key: 'angry', icon: require('../../assets/icons/angry.png') },
];

const EMOJI_LIST = [
  { key: 'heart', label: '❤️' },
  { key: 'haha', label: '😆' },
  { key: 'wow', label: '😮' },
  { key: 'cry', label: '😢' },
  { key: 'angry', label: '😡' },
  { key: 'like', label: '👍' },
  { key: 'plus', label: '➕' },
];

const MessageActionSheet = ({
  visible,
  onClose,
  onEmojiPress,
  onActionPress,
  selectedMessage,
  isSender,
}) => {
  if (!visible) return null;
  // Render nội dung tin nhắn nổi bật
  let messageContent = null;
  if (selectedMessage) {
    if (selectedMessage.type === 'image') {
      messageContent = (
        <Image
          source={{ uri: selectedMessage.content }}
          style={customSheetStyles.selectedImage}
          resizeMode="cover"
        />
      );
    } else if (selectedMessage.type === 'file') {
      messageContent = (
        <View style={customSheetStyles.selectedFileRow}>
          <Image source={require('../../assets/icons/file.png')} style={customSheetStyles.selectedFileIcon} />
          <Text style={customSheetStyles.selectedFileName} numberOfLines={1}>{selectedMessage.metadata?.fileName || 'Tệp tin'}</Text>
        </View>
      );
    } else {
      messageContent = (
        <Text style={customSheetStyles.selectedText}>{selectedMessage.content}</Text>
      );
    }
  }
  // Xác định căn trái/phải
  const align = isSender ? 'flex-end' : 'flex-start';
  const marginHorizontal = 18;
  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      backdropOpacity={0.0}
      style={{ margin: 0 }}
      animationIn="fadeIn"
      animationOut="fadeOut"
      useNativeDriver
    >
      <View style={[customSheetStyles.overlay, { alignItems: align }]}>
        {/* Emoji bar */}
        <View style={[customSheetStyles.emojiBarWrapper, { alignItems: align, marginLeft: isSender ? undefined : marginHorizontal, marginRight: isSender ? marginHorizontal : undefined }]}>
          <View style={customSheetStyles.emojiBar}>
            {EMOJI_LIST.map(e => (
              <TouchableOpacity key={e.key} style={customSheetStyles.emojiBtn} onPress={() => onEmojiPress(e.key)}>
                <Text style={customSheetStyles.emojiText}>{e.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {/* Tin nhắn được chọn */}
        {selectedMessage && (
          <View style={[customSheetStyles.selectedMessageWrapper, { alignSelf: align, marginLeft: isSender ? undefined : marginHorizontal, marginRight: isSender ? marginHorizontal : undefined }]}>
            {messageContent}
          </View>
        )}
      </View>
    </Modal>
  );
};

// Thêm style cho tin nhắn nổi bật
const customSheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiBarWrapper: {
    alignItems: 'center',
    marginBottom: 18,
  },
  emojiBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 32,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',

  },
  emojiBtn: {
    marginHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height:28,
  },
  emojiText: {
    fontSize: 20,
    textAlign: 'center',
  },
  actionSheet: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 8,
    width: 320,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
    alignItems: 'stretch',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionIcon: {
    width: 24,
    height: 24,
    marginRight: 18,
    resizeMode: 'contain',
  },
  actionLabel: {
    fontSize: 18,
    flex: 1,
    fontWeight: '500',
  },
  moreIcon: {
    width: 22,
    height: 22,
    tintColor: '#222',
  },
  selectedMessageWrapper: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginVertical: 18,
    marginHorizontal: 0,
    alignSelf: 'center',
    padding: 18,
    minWidth: 180,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
  },
  selectedText: {
    fontSize: 20,
    color: '#222',
    textAlign: 'center',
    fontWeight: '500',
  },
  selectedImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  selectedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  selectedFileIcon: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  selectedFileName: {
    fontSize: 18,
    color: '#222',
    flex: 1,
  },
});

export default ChatDetailScreen;