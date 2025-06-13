import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AiFillLike,
  AiOutlineUsergroupAdd,
  AiFillHeart,
  AiOutlineDelete,
} from "react-icons/ai";
import {
  IoKeySharp,
  IoLogOutOutline,
  IoSearchOutline,
  IoSend,
  IoSettingsOutline,
  IoVideocam,
  IoWarningOutline,
} from "react-icons/io5";
import { TbColumns2 } from "react-icons/tb";
import { PiTagSimple, PiSmiley } from "react-icons/pi";
import { RiMoreLine } from "react-icons/ri";
import { LuClock4, LuPen, LuSticker, LuUsersRound } from "react-icons/lu";
import {
  FaRegImage,
  FaFile,
  FaFilePdf,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileWord,
  FaFileCode,
  FaFileCsv,
  FaPhoneSlash,
} from "react-icons/fa6";
import { FaFileArchive, FaQuoteRight } from "react-icons/fa";
import { IoIosShareAlt } from "react-icons/io";
import { GoPaperclip } from "react-icons/go";
import { Spin } from "antd";
import {
  LoadingOutlined,
  UserAddOutlined,
  HeartOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { HiOutlineVideoCamera } from "react-icons/hi";
import {
  BsFiletypeMp3,
  BsFiletypeMp4,
  BsFiletypeTxt,
  BsPinAngle,
} from "react-icons/bs";
import { CgFileDocument } from "react-icons/cg";
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
  removeParticipantsApi,
  leaveGroupApi,
  updateConversationApi,
} from "../../services/api";
import { useCurrentApp } from "../../contexts/app.context";
import { useSocket } from "../../contexts/socket.context";
import ImageViewModal from "../../components/modal/image.modal";
import UserInfoModal from "../../components/modal/user.modal";
import ReactionModal from "../../components/modal/reaction.modal";
import EmojiPicker from "../../components/emoji/EmojiPicker";
import CreateGroupModal from "../../components/modal/group.modal";
import MessageDropdown from "../../components/dropdown/message.dropdown";
import defaultAvatar from "../../assets/images/defaultAvatar.jpg";
import VideoCallModal from "../../components/modal/video-call.modal";
// Import âm thanh nhạc chuông
import callRingtone from "../../assets/audio/nhacChuongZuni.mp3";
import messageRingtone from "../../assets/audio/messageZuni.mp3";
import AddMemberModal from "../../components/modal/addMember.modal";
import { Modal } from "antd";

const ChatPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, messageApi, setUser } = useCurrentApp();
  const { socket } = useSocket();
  const [chatUser, setChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
  const [selectedMessageReactions, setSelectedMessageReactions] =
    useState(null);
  const [reactedUserDetails, setReactedUserDetails] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [chatUserTyping, setChatUserTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pastedImage, setPastedImage] = useState(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState({
    isOpen: false,
    isCallee: false,
    offer: null,
    from: null,
    callId: null,
  });
  const [incomingCall, setIncomingCall] = useState(null); // Thêm state lưu thông tin cuộc gọi đến
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [showAllMedia, setShowAllMedia] = useState(false);
  const [tabActive, setTabActive] = useState("media");
  const [showMembersSidebar, setShowMembersSidebar] = useState(false);
  const [hoveredMemberIdx, setHoveredMemberIdx] = useState(null);
  const [openMenuIdx, setOpenMenuIdx] = useState(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [removeMemberModal, setRemoveMemberModal] = useState({
    open: false,
    member: null,
  });
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [leaveGroupModal, setLeaveGroupModal] = useState(false);
  const [isTransferringAdmin, setIsTransferringAdmin] = useState(false);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState(null);
  const [searchMember, setSearchMember] = useState("");

  const messagesEndRef = useRef(null);
  const bottomRef = useRef(null);
  const messageInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const ringtoneSoundRef = useRef(null); // Thêm ref cho âm thanh cuộc gọi đến
  const messageRingtoneSoundRef = useRef(null); // Thêm ref cho âm thanh tin nhắn đến

  const fetchMessageReactions = async () => {
    if (!conversationId || messages.length === 0) return;

    try {
      // Lấy danh sách messageIds từ tin nhắn
      const messageIds = messages.map((msg) => msg.messageId).filter(Boolean);

      if (messageIds.length === 0) return;
      console.log("Fetching reactions for messages:", messageIds);

      // Gọi API để lấy reactions cho tất cả tin nhắn
      const res = await getReactionsForMessagesApi(messageIds);

      if (res.status) {
        // Lưu reactions vào state
        setMessageReactions(res.data.reactions);

        // Cập nhật UI hiển thị số lượt tim
        const likesCount = {};
        Object.entries(res.data.reactions).forEach(([messageId, reactions]) => {
          likesCount[messageId] = Object.values(reactions).reduce(
            (sum, reaction) => sum + reaction.count,
            0
          );
        });
        setLikedMessages(likesCount);
      }
    } catch (error) {
      console.error("Lỗi khi tải reactions:", error);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      console.log("Fetching messages for conversation:", convId);
      const res = await getMessagesApi(convId);
      console.log("Messages response:", res);

      if (res.status && Array.isArray(res.data?.messages)) {
        // Chỉ lọc tin nhắn trùng lặp dựa trên messageId
        const uniqueMessages = [];
        const messageIds = new Set();

        res.data.messages.forEach((msg) => {
          if (msg.messageId && !messageIds.has(msg.messageId)) {
            messageIds.add(msg.messageId);
            uniqueMessages.push(msg);
          } else if (!msg.messageId) {
            // Nếu không có messageId, vẫn giữ lại tin nhắn
            uniqueMessages.push(msg);
          }
        });

        setMessages(uniqueMessages);
        scrollToBottom();
      } else {
        console.error("Invalid messages response:", res);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      messageApi.open({
        type: "error",
        content: "Không thể tải tin nhắn",
      });
      setMessages([]);
    }
  };

  const checkFriendRequestStatus = async (userId) => {
    try {
      const [sentRes, receivedRes] = await Promise.all([
        checkSentFriendRequestApi(userId),
        checkReceivedFriendRequestApi(userId),
      ]);

      if (sentRes.status) {
        setHasSentRequest(sentRes.data.hasSentRequest);
      }

      if (receivedRes.status) {
        setHasReceivedRequest(receivedRes.data.hasReceivedRequest);
      }
    } catch (error) {
      console.error("Error checking friend request status:", error);
    }
  };

  useEffect(() => {
    // Kiểm tra ngay từ đầu, trước khi gọi API
    if (id === currentUser?.userId) {
      messageApi.open({
        type: "error",
        content: "Bạn không thể chat với chính mình",
        key: "self-chat-error", // Thêm key để tránh hiển thị trùng lặp
      });
      navigate("/");
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Bước 1: Kiểm tra xem id có phải là conversation ID của nhóm chat không
        const conversationsRes = await getConversationsApi();
        const existingGroupConversation = conversationsRes.data?.find(
          (conv) => conv.conversationId === id && conv.type === "group"
        );

        // Nếu tìm thấy conversation là nhóm chat
        if (existingGroupConversation) {
          console.log("Loading group conversation:", existingGroupConversation);
          // Sử dụng thông tin từ nhóm chat để tạo chatUser
          setChatUser({
            userId: existingGroupConversation.conversationId,
            fullName: existingGroupConversation.name || "Nhóm chat",
            avatar: existingGroupConversation.avatar,
            isGroup: true,
            participants: existingGroupConversation.participants,
            isFriend: true, // Để không hiển thị UI kết bạn
            admin: existingGroupConversation.admin,
          });

          setConversationId(existingGroupConversation.conversationId);
          await fetchMessages(existingGroupConversation.conversationId);
          setIsLoading(false);
          return;
        }

        // Nếu không phải nhóm chat, xử lý theo logic cũ (tìm người dùng)
        const res = await getUserByIdApi(id);
        if (res.status) {
          const userData = {
            ...res.data,
            isFriend: currentUser?.contacts?.includes(res.data.userId),
          };
          setChatUser(userData);

          // Kiểm tra trạng thái lời mời kết bạn nếu chưa là bạn bè
          if (!userData.isFriend) {
            await checkFriendRequestStatus(res.data.userId);
          }

          // Tìm hoặc tạo conversation cho chat 1-1
          const participants = [currentUser.userId, res.data.userId].sort();
          const conversationKey = `private_${participants.join("_")}`;

          console.log(
            "Creating/getting conversation with key:",
            conversationKey
          );

          // Tìm conversation private giữa 2 người dùng
          const existingPrivateConversation = conversationsRes.data?.find(
            (conv) =>
              conv.participants.includes(currentUser.userId) &&
              conv.participants.includes(res.data.userId) &&
              conv.type === "private"
          );

          let conversationId;
          if (existingPrivateConversation) {
            console.log(
              "Using existing conversation:",
              existingPrivateConversation
            );
            conversationId = existingPrivateConversation.conversationId;
          } else {
            const convRes = await createConversationApi({
              participants,
              type: "private",
              conversationId: conversationKey,
            });

            if (convRes.status && convRes.data?.conversationId) {
              console.log("Created new conversation:", convRes.data);
              conversationId = convRes.data.conversationId;
            } else {
              throw new Error("Không thể tạo cuộc trò chuyện");
            }
          }

          setConversationId(conversationId);
          await fetchMessages(conversationId);
        } else {
          // Nếu không tìm thấy người dùng và cũng không phải là nhóm chat
          messageApi.open({
            type: "error",
            content: "Không tìm thấy người dùng hoặc nhóm chat",
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        messageApi.open({
          type: "error",
          content: "Có lỗi xảy ra khi tải dữ liệu",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (id && currentUser?.userId) {
      fetchData();
    }
  }, [id, currentUser?.userId, currentUser?.contacts]);

  useEffect(() => {
    if (!socket || !conversationId || !currentUser?.userId) return;

    // Join conversation room
    socket.emit("join-conversation", {
      conversationId,
      userId: currentUser.userId,
    });

    console.log(`Đã join room conversation: ${conversationId}`);

    // Lắng nghe tin nhắn mới
    const handleReceiveMessage = (data) => {
      console.log("Received message:", data);
      if (data.conversationId === conversationId) {
        // Chỉ phát âm thanh khi có tin nhắn đến từ người khác, không phải tin nhắn của chính mình
        if (
          data.senderId !== currentUser?.userId &&
          messageRingtoneSoundRef.current
        ) {
          console.log("[CHAT] Đang phát âm thanh cho tin nhắn đến");
          // Đặt âm lượng và phát âm thanh
          messageRingtoneSoundRef.current.volume = 0.5;
          messageRingtoneSoundRef.current.currentTime = 0;

          const playPromise = messageRingtoneSoundRef.current.play();

          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log("[CHAT] Âm thanh tin nhắn đã phát thành công");
              })
              .catch((err) => {
                console.error("[CHAT] Không thể phát âm thanh tin nhắn:", err);
              });
          }
        }

        setMessages((prev) => {
          const messageExists = prev.some(
            (msg) => msg.messageId === data.messageId
          );
          if (messageExists) return prev;
          return [...prev, data];
        });
        scrollToBottom();
      }
    };

    // Lắng nghe sự kiện thả tim tin nhắn
    const handleMessageReaction = (data) => {
      console.log("Nhận sự kiện message-reaction:", data);
      if (data.messageId && data.reactions) {
        // Lưu dữ liệu reactions chi tiết vào state
        setMessageReactions((prev) => {
          console.log("Cập nhật messageReactions:", {
            current: prev[data.messageId],
            new: data.reactions,
          });
          return {
            ...prev,
            [data.messageId]: data.reactions,
          };
        });

        // Tính tổng số lượt thả tim
        const totalLikes = Object.values(data.reactions).reduce(
          (sum, reaction) => sum + reaction.count,
          0
        );

        console.log(
          `Cập nhật UI cho message ${data.messageId}, total likes: ${totalLikes}`
        );

        setLikedMessages((prev) => ({
          ...prev,
          [data.messageId]: totalLikes,
        }));
      }
    };

    // Lắng nghe sự kiện trạng thái hoạt động
    const handleUserStatusChange = (data) => {
      if (data.userId === chatUser?.userId) {
        setChatUser((prev) => ({
          ...prev,
          isOnline: data.status === "online",
          lastActive:
            data.status === "offline"
              ? new Date().toISOString()
              : prev.lastActive,
        }));
      }
    };

    // Đăng ký lắng nghe sự kiện
    console.log("Socket: đăng ký lắng nghe sự kiện");
    socket.on("receive-message", handleReceiveMessage);
    socket.on("message-reaction", handleMessageReaction);
    socket.on("user-status-change", handleUserStatusChange);

    // Gửi trạng thái online của người dùng hiện tại
    socket.emit("user-status", {
      userId: currentUser.userId,
      status: "online",
    });

    // Cập nhật trạng thái online trong cơ sở dữ liệu
    updateUserStatusApi({
      isOnline: true,
    });

    return () => {
      console.log(`Socket: rời khỏi room ${conversationId}`);
      socket.emit("leave-conversation", {
        conversationId,
        userId: currentUser.userId,
      });

      console.log("Socket: hủy đăng ký lắng nghe sự kiện");
      socket.off("receive-message", handleReceiveMessage);
      socket.off("message-reaction", handleMessageReaction);
      socket.off("user-status-change", handleUserStatusChange);
    };
  }, [socket, conversationId, currentUser?.userId, chatUser?.userId]);

  useEffect(() => {
    if (messages.length > 0 && conversationId) {
      fetchMessageReactions();
    }
  }, [messages.length, conversationId]);

  useEffect(() => {
    if (chatUser && !isLoading) {
      messageInputRef.current?.focus();
    }
  }, [chatUser, isLoading]);

  const createNewConversation = async () => {
    try {
      const convRes = await createConversationApi({
        participants: [currentUser.userId, chatUser.userId],
        type: "private",
      });

      console.log("Create conversation response:", convRes);

      if (convRes.status && convRes.data?.conversationId) {
        const newConversationId = convRes.data.conversationId;
        setConversationId(newConversationId);

        // Join conversation ngay sau khi tạo
        if (socket) {
          socket.emit("join-conversation", {
            conversationId: newConversationId,
            userId: currentUser.userId,
            chatUserId: chatUser.userId,
          });
        }

        return newConversationId;
      }
      throw new Error("Không thể tạo cuộc trò chuyện");
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
  };

  const handleSendMessage = async (e) => {
    if ((e.key === "Enter" || !e.key) && (newMessage.trim() || pastedImage)) {
      e.preventDefault();

      // Tạo messageId tạm thời
      const tempMessageId = `temp_${Date.now()}`;

      try {
        if (!conversationId) {
          throw new Error("Không tìm thấy cuộc trò chuyện");
        }

        // Xử lý trường hợp có ảnh được paste
        if (pastedImage) {
          // Tạo tin nhắn tạm thời để hiển thị trạng thái đang tải
          const tempMessage = {
            conversationId,
            senderId: currentUser.userId,
            receiverId: chatUser.userId,
            type: "image",
            content: "Đang tải ảnh...",
            messageId: tempMessageId,
            createdAt: Date.now(),
            status: "sending",
            messageText: newMessage.trim(), // Lưu nội dung tin nhắn kèm theo
            sender: {
              id: currentUser.userId,
              name: currentUser.fullName,
              avatar: currentUser.avatar,
            },
          };

          // Thêm tin nhắn vào state ngay lập tức
          setMessages((prev) => [...prev, tempMessage]);
          scrollToBottom();

          // Tạo form data để gửi ảnh
          const formData = new FormData();
          formData.append("image", pastedImage.file);
          formData.append("conversationId", conversationId);
          formData.append(
            "fileName",
            pastedImage.file.name || "pasted-image.png"
          );

          // Thêm messageText vào formData nếu có
          if (newMessage.trim()) {
            formData.append("messageText", newMessage.trim());
          }

          console.log("FormData được tạo:", {
            file: pastedImage.file.name,
            conversationId: conversationId,
            fileName: pastedImage.file.name,
            messageText: newMessage.trim() || "không có",
          });

          // Gửi ảnh lên server
          console.log("Đang gọi API uploadMessageImageApi");
          const response = await uploadMessageImageApi(formData);
          console.log("Upload image response:", response);

          if (response.status) {
            // Kiểm tra xem API đã tự tạo tin nhắn trong database chưa
            if (response.data && response.data.messageId) {
              console.log(
                "Đã tìm thấy messageId từ uploadMessageImageApi:",
                response.data.messageId
              );

              // Đảm bảo metadata có dạng object
              let metadataObj = {};
              try {
                if (typeof response.data.metadata === "string") {
                  metadataObj = JSON.parse(response.data.metadata);
                } else if (typeof response.data.metadata === "object") {
                  metadataObj = response.data.metadata;
                }
              } catch (e) {
                console.error("Lỗi parse metadata:", e);
              }

              // Cập nhật tin nhắn với thông tin từ server
              const finalMessage = {
                ...response.data,
                content: response.data.url || response.data.content,
                type: "image",
                status: "sent",
                senderId: currentUser.userId,
                receiverId: chatUser.userId,
                metadata: metadataObj,
                sender: {
                  id: currentUser.userId,
                  name: currentUser.fullName,
                  avatar: currentUser.avatar,
                },
              };

              // Cập nhật tin nhắn với thông tin thật từ server
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.messageId === tempMessageId ? finalMessage : msg
                )
              );

              // Emit socket event
              socket?.emit("send-message", {
                ...finalMessage,
                conversationId,
                to: chatUser.userId,
              });

              // Emit thêm sự kiện send-message-success
              socket?.emit("send-message-success", {
                ...finalMessage,
                conversationId,
                sender: {
                  id: currentUser.userId,
                  name: currentUser.fullName,
                  avatar: currentUser.avatar,
                },
              });

              // Xóa ảnh đã paste và reset input
              clearPastedImage();
              setNewMessage("");
              messageInputRef.current?.focus();
            } else {
              // Nếu API không tạo message, chúng ta sẽ tạo
              // Tạo dữ liệu tin nhắn kèm nội dung text
              const messageData = {
                conversationId,
                senderId: currentUser.userId,
                receiverId: chatUser.userId,
                type: "image",
                content: response.data.url || response.data.content,
                metadata: JSON.stringify({
                  fileName: pastedImage.file.name || "pasted-image.png",
                  fileSize: pastedImage.file.size,
                  mimeType: pastedImage.file.type,
                  originalUpload: true,
                  messageText: newMessage.trim(), // Lưu nội dung tin nhắn vào metadata
                }),
              };

              // Gọi API lưu tin nhắn
              const messageResponse = await sendMessageApi(messageData);

              if (messageResponse.status) {
                const finalMessage = {
                  ...messageResponse.data,
                  content: response.data.url || response.data.content,
                  type: "image",
                  status: "sent",
                  senderId: currentUser.userId,
                  receiverId: chatUser.userId,
                  messageText: newMessage.trim(),
                  sender: {
                    id: currentUser.userId,
                    name: currentUser.fullName,
                    avatar: currentUser.avatar,
                  },
                };

                // Cập nhật tin nhắn với thông tin thật từ server
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.messageId === tempMessageId ? finalMessage : msg
                  )
                );

                // Emit socket event
                socket?.emit("send-message", {
                  ...finalMessage,
                  conversationId,
                  to: chatUser.userId,
                });

                // Emit thêm sự kiện send-message-success
                socket?.emit("send-message-success", {
                  ...finalMessage,
                  conversationId,
                  sender: {
                    id: currentUser.userId,
                    name: currentUser.fullName,
                    avatar: currentUser.avatar,
                  },
                });

                // Xóa ảnh đã paste
                clearPastedImage();
                setNewMessage("");
                messageInputRef.current?.focus();
              } else {
                throw new Error(
                  messageResponse.message || "Gửi tin nhắn thất bại"
                );
              }
            }
          } else {
            throw new Error(response.message || "Gửi ảnh thất bại");
          }
        } else {
          // Xử lý gửi tin nhắn văn bản thông thường (code cũ)
          const messageData = {
            conversationId,
            senderId: currentUser.userId,
            receiverId: chatUser.userId,
            type: "text",
            content: newMessage.trim(),
          };

          const tempMessage = {
            ...messageData,
            messageId: tempMessageId,
            createdAt: Date.now(),
            status: "sending",
            sender: {
              id: currentUser.userId,
              name: currentUser.fullName,
              avatar: currentUser.avatar,
            },
          };

          // Thêm tin nhắn vào state ngay lập tức
          setMessages((prev) => [...prev, tempMessage]);
          scrollToBottom();
          setNewMessage("");
          messageInputRef.current?.focus();

          // Gửi tin nhắn lên server ở background
          const messageResponse = await sendMessageApi(messageData);

          if (messageResponse.status && messageResponse.data) {
            const finalMessage = {
              ...messageData,
              messageId: messageResponse.data.messageId,
              createdAt: messageResponse.data.createdAt,
              status: "sent",
              sender: {
                id: currentUser.userId,
                name: currentUser.fullName,
                avatar: currentUser.avatar,
              },
            };

            // Cập nhật tin nhắn với messageId thật từ server
            setMessages((prev) =>
              prev.map((msg) =>
                msg.messageId === tempMessageId ? finalMessage : msg
              )
            );

            // Emit socket event cho cả người gửi và người nhận
            socket.emit("send-message", {
              ...finalMessage,
              conversationId,
              to: chatUser.userId, // Thêm thông tin người nhận
            });

            // Emit thêm sự kiện send-message-success
            socket.emit("send-message-success", {
              ...finalMessage,
              conversationId,
              sender: {
                id: currentUser.userId,
                name: currentUser.fullName,
                avatar: currentUser.avatar,
              },
            });
          } else {
            throw new Error(messageResponse.message || "Gửi tin nhắn thất bại");
          }
        }
      } catch (error) {
        console.error("Error sending message:", error);
        // Xóa tin nhắn tạm thời nếu gửi thất bại
        setMessages((prev) =>
          prev.filter((msg) => msg.messageId !== tempMessageId)
        );
        messageApi.open({
          type: "error",
          content: error.message || "Gửi tin nhắn thất bại",
        });
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Khi gửi tin nhắn, dừng trạng thái typing
      if (isTyping) {
        setIsTyping(false);
        socket.emit("stop-typing", { conversationId });
      }

      // Chỉ gửi tin nhắn khi có nội dung hoặc có ảnh được paste
      if (newMessage.trim() || pastedImage) {
        handleSendMessage(e);
      }
      // Đã loại bỏ phần gọi handleSendLike khi input trống
    }
  };

  const handleSendRequest = async () => {
    if (!chatUser?.userId) return;

    setSending(true);
    try {
      const res = await sendFriendRequestApi(chatUser.userId);
      if (res.status) {
        messageApi.open({
          type: "success",
          content: res.message || "Đã gửi lời mời kết bạn",
        });
        setHasSentRequest(true);

        // Emit socket event để cập nhật UI ở sidebar
        if (socket) {
          socket.emit("send-friend-request", {
            receiverId: chatUser.userId,
            senderId: currentUser?.userId,
            senderName: currentUser?.fullName,
            senderAvatar: currentUser?.avatar,
          });
        }
      } else {
        messageApi.open({
          type: "error",
          content: res.message || "Không thể gửi lời mời kết bạn",
        });
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      messageApi.open({
        type: "error",
        content: "Có lỗi xảy ra khi gửi lời mời kết bạn",
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendLike = async () => {
    const tempMessageId = `temp_${Date.now()}`;
    try {
      let currentConversationId = conversationId;

      if (!currentConversationId) {
        currentConversationId = await createNewConversation();
      }

      // Chuẩn bị dữ liệu tin nhắn dựa vào loại chat
      let messageData;

      if (chatUser?.isGroup) {
        // Tin nhắn trong nhóm chat
        messageData = {
          conversationId: currentConversationId,
          senderId: currentUser.userId,
          type: "text",
          content: "👍",
          senderName: currentUser.fullName,
          senderAvatar: currentUser.avatar,
          isGroupMessage: true,
        };
      } else {
        // Tin nhắn chat 1-1
        messageData = {
          conversationId: currentConversationId,
          senderId: currentUser.userId,
          receiverId: chatUser.userId,
          type: "text",
          content: "👍",
        };
      }

      // Thêm tin nhắn vào state ngay lập tức
      const tempMessage = {
        ...messageData,
        messageId: tempMessageId,
        createdAt: Date.now(),
        status: "sending",
        sender: {
          id: currentUser.userId,
          name: currentUser.fullName,
          avatar: currentUser.avatar,
        },
      };

      setMessages((prev) => [...prev, tempMessage]);
      scrollToBottom();

      // Gửi tin nhắn lên server ở background
      const messageResponse = await sendMessageApi(messageData);

      if (messageResponse.status && messageResponse.data) {
        const finalMessage = {
          ...messageData,
          messageId: messageResponse.data.messageId,
          createdAt: messageResponse.data.createdAt,
          status: "sent",
          sender: {
            id: currentUser.userId,
            name: currentUser.fullName,
            avatar: currentUser.avatar,
          },
        };

        // Cập nhật tin nhắn với messageId thật từ server
        setMessages((prev) =>
          prev.map((msg) =>
            msg.messageId === tempMessageId ? finalMessage : msg
          )
        );

        // Emit socket event - khác nhau cho nhóm và chat 1-1
        if (chatUser?.isGroup) {
          socket.emit("send-message", {
            ...finalMessage,
            conversationId,
            isGroupMessage: true,
          });
        } else {
          socket.emit("send-message", {
            ...finalMessage,
            conversationId,
            to: chatUser.userId,
          });
        }
      } else {
        throw new Error(messageResponse.message || "Gửi tin nhắn thất bại");
      }
    } catch (error) {
      console.error("Error sending like:", error);
      messageApi.open({
        type: "error",
        content: error.message || "Gửi tin nhắn thất bại",
      });
      // Xóa tin nhắn tạm thời nếu gửi thất bại
      setMessages((prev) =>
        prev.filter((msg) => msg.messageId !== tempMessageId)
      );
    }
  };

  const handleAcceptRequest = async () => {
    if (!chatUser?.userId) return;

    setAccepting(true);
    try {
      const res = await acceptFriendRequestApi(chatUser.userId);
      if (res.status) {
        messageApi.open({
          type: "success",
          content: res.message || "Đã chấp nhận lời mời kết bạn",
        });
        setHasReceivedRequest(false);
        setChatUser((prev) => ({
          ...prev,
          isFriend: true,
        }));

        socket?.emit("friend-request-accepted", {
          friendId: chatUser.userId,
          accepterId: currentUser?.userId,
        });
      } else {
        messageApi.open({
          type: "error",
          content: res.message || "Không thể chấp nhận lời mời kết bạn",
        });
      }
    } catch (error) {
      console.error("Error accepting friend request:", error);
      messageApi.open({
        type: "error",
        content: "Có lỗi xảy ra khi chấp nhận lời mời kết bạn",
      });
    } finally {
      setAccepting(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!chatUser?.userId) return;

    setRejecting(true);
    try {
      const res = await rejectFriendRequestApi(chatUser.userId);
      if (res.status) {
        messageApi.open({
          type: "success",
          content: res.message || "Đã từ chối lời mời kết bạn",
        });
        setHasReceivedRequest(false);

        socket?.emit("friend-request-rejected", {
          friendId: chatUser.userId,
          rejecterId: currentUser?.userId,
        });
      } else {
        messageApi.open({
          type: "error",
          content: res.message || "Không thể từ chối lời mời kết bạn",
        });
      }
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      messageApi.open({
        type: "error",
        content: "Có lỗi xảy ra khi từ chối lời mời kết bạn",
      });
    } finally {
      setRejecting(false);
    }
  };

  useEffect(() => {
    if (!socket) {
      console.log("❌ Socket chưa được khởi tạo");
      return;
    }

    console.log("🔌 Socket đã kết nối, thiết lập listeners");
    console.log("👤 Current user:", {
      userId: currentUser?.userId,
      contacts: currentUser?.contacts,
    });
    console.log("💬 Chat user:", {
      userId: chatUser?.userId,
      isFriend: chatUser?.isFriend,
    });

    const handleFriendRequestAccepted = (data) => {
      console.log("🤝 ChatPage - Nhận được sự kiện friend-request-accepted:", {
        eventData: data,
        currentUser: {
          userId: currentUser?.userId,
          contacts: currentUser?.contacts,
        },
        chatUser: {
          userId: chatUser?.userId,
          isFriend: chatUser?.isFriend,
        },
      });

      const isCurrentUserInvolved =
        data.friendId === currentUser?.userId ||
        data.accepterId === currentUser?.userId;

      const isChatUserInvolved =
        data.friendId === chatUser?.userId ||
        data.accepterId === chatUser?.userId;

      if (isCurrentUserInvolved || isChatUserInvolved) {
        // Cập nhật trạng thái kết bạn ngay lập tức
        setChatUser((prev) => ({
          ...prev,
          isFriend: true,
        }));

        // Cập nhật contacts trong currentUser
        setUser((prev) => {
          const newContacts = [...(prev.contacts || [])];
          if (!newContacts.includes(chatUser?.userId)) {
            newContacts.push(chatUser?.userId);
          }
          return {
            ...prev,
            contacts: newContacts,
          };
        });

        // Reset trạng thái lời mời
        setHasSentRequest(false);
        setHasReceivedRequest(false);
      }
    };

    const handleFriendRequestRejected = (data) => {
      console.log("👎 ChatPage - Nhận được sự kiện friend-request-rejected:", {
        eventData: data,
        currentUser: {
          userId: currentUser?.userId,
          contacts: currentUser?.contacts,
        },
        chatUser: {
          userId: chatUser?.userId,
          isFriend: chatUser?.isFriend,
        },
      });

      const isCurrentUserInvolved =
        data.friendId === currentUser?.userId ||
        data.rejecterId === currentUser?.userId;

      const isChatUserInvolved =
        data.friendId === chatUser?.userId ||
        data.rejecterId === chatUser?.userId;

      if (isCurrentUserInvolved || isChatUserInvolved) {
        // Cập nhật trạng thái kết bạn ngay lập tức
        setChatUser((prev) => ({
          ...prev,
          isFriend: false,
        }));

        // Reset trạng thái lời mời
        setHasSentRequest(false);
        setHasReceivedRequest(false);
      }
    };

    const handleFriendRemoved = (data) => {
      console.log("🔔 ChatPage - Nhận được sự kiện friend-removed:", {
        eventData: data,
        currentUser: {
          userId: currentUser?.userId,
          contacts: currentUser?.contacts,
        },
        chatUser: {
          userId: chatUser?.userId,
          isFriend: chatUser?.isFriend,
        },
      });

      const isCurrentUserInvolved =
        data.to === currentUser?.userId ||
        data.friendId === currentUser?.userId;

      const isChatUserInvolved =
        data.removerId === chatUser?.userId ||
        data.friendId === chatUser?.userId;

      if (isCurrentUserInvolved || isChatUserInvolved) {
        // Cập nhật trạng thái kết bạn ngay lập tức
        setChatUser((prev) => ({
          ...prev,
          isFriend: false,
        }));

        // Reset trạng thái lời mời
        setHasSentRequest(false);
        setHasReceivedRequest(false);

        // Cập nhật contacts trong currentUser
        setUser((prev) => {
          const updatedContacts =
            prev.contacts?.filter(
              (id) => id !== data.friendId && id !== data.removerId
            ) || [];
          return {
            ...prev,
            contacts: updatedContacts,
          };
        });

        // Kiểm tra lại trạng thái kết bạn từ server
        checkFriendRequestStatus(chatUser?.userId);
      }
    };

    // Đăng ký lắng nghe các sự kiện
    socket.on("friend-request-accepted", handleFriendRequestAccepted);
    socket.on("friend-request-rejected", handleFriendRequestRejected);
    socket.on("friend-removed", handleFriendRemoved);

    return () => {
      console.log("♻️ Cleanup: Hủy đăng ký các listeners");
      socket.off("friend-request-accepted", handleFriendRequestAccepted);
      socket.off("friend-request-rejected", handleFriendRequestRejected);
      socket.off("friend-removed", handleFriendRemoved);
    };
  }, [socket, chatUser?.userId, currentUser?.userId]);

  const handleImageSelect = async (event) => {
    console.log("handleImageSelect được gọi, event:", event);
    console.log("event.target:", event.target);
    console.log("event.target.files:", event.target.files);

    const file = event.target.files[0];
    // Reset giá trị input file sau khi đã lấy file
    event.target.value = null;

    if (!file) {
      console.log("Không có file được chọn");
      return;
    }

    console.log("File được chọn:", file);
    console.log("File name:", file.name);
    console.log("File type:", file.type);
    console.log("File size:", file.size);

    // Kiểm tra kích thước và loại file
    if (file.size > 5 * 1024 * 1024) {
      messageApi.open({
        type: "error",
        content: "Kích thước ảnh không được vượt quá 5MB",
      });
      return;
    }

    if (!file.type.includes("image/")) {
      messageApi.open({
        type: "error",
        content: "Vui lòng chọn file ảnh",
      });
      return;
    }

    // Tạo ID tin nhắn tạm thời
    const tempMessageId = `temp_${Date.now()}`;

    try {
      if (!conversationId) {
        throw new Error("Không tìm thấy cuộc trò chuyện");
      }

      // Tạo tin nhắn tạm thời để hiển thị trạng thái đang tải
      const tempMessage = {
        conversationId,
        senderId: currentUser.userId,
        receiverId: chatUser.userId,
        type: "image",
        content: "Đang tải ảnh...",
        messageId: tempMessageId,
        createdAt: Date.now(),
        status: "sending",
        messageText: newMessage.trim(), // Lưu nội dung tin nhắn kèm theo nếu có
        sender: {
          id: currentUser.userId,
          name: currentUser.fullName,
          avatar: currentUser.avatar,
        },
      };

      // Thêm tin nhắn vào state ngay lập tức
      setMessages((prev) => [...prev, tempMessage]);
      scrollToBottom();

      // Tạo form data để gửi ảnh
      const formData = new FormData();
      formData.append("image", file);
      formData.append("conversationId", conversationId);
      formData.append("fileName", file.name);

      // Thêm messageText vào formData nếu có
      if (newMessage.trim()) {
        formData.append("messageText", newMessage.trim());
      }

      console.log("FormData được tạo:", {
        file: file.name,
        conversationId: conversationId,
        fileName: file.name,
        messageText: newMessage.trim() || "không có",
      });

      // Gửi ảnh lên server
      console.log("Đang gọi API uploadMessageImageApi");
      const response = await uploadMessageImageApi(formData);
      console.log("Upload image response:", response);

      if (response.status) {
        // Kiểm tra xem API đã tự tạo tin nhắn trong database chưa
        if (response.data && response.data.messageId) {
          console.log(
            "Đã tìm thấy messageId từ uploadMessageImageApi:",
            response.data.messageId
          );

          // Đảm bảo metadata có dạng object
          let metadataObj = {};
          try {
            if (typeof response.data.metadata === "string") {
              metadataObj = JSON.parse(response.data.metadata);
            } else if (typeof response.data.metadata === "object") {
              metadataObj = response.data.metadata;
            }
          } catch (e) {
            console.error("Lỗi parse metadata:", e);
          }

          // Cập nhật tin nhắn với thông tin từ server
          const finalMessage = {
            ...response.data,
            content: response.data.url || response.data.content,
            type: "image",
            status: "sent",
            senderId: currentUser.userId,
            receiverId: chatUser.userId,
            metadata: metadataObj,
            sender: {
              id: currentUser.userId,
              name: currentUser.fullName,
              avatar: currentUser.avatar,
            },
          };

          // Cập nhật tin nhắn với thông tin thật từ server
          setMessages((prev) =>
            prev.map((msg) =>
              msg.messageId === tempMessageId ? finalMessage : msg
            )
          );

          // Emit socket event
          socket?.emit("send-message", {
            ...finalMessage,
            conversationId,
            to: chatUser.userId,
          });

          // Reset input message nếu có
          if (newMessage.trim()) {
            setNewMessage("");
          }
        } else {
          // Nếu API không tạo message, chúng ta sẽ tạo
          // Tạo dữ liệu tin nhắn kèm nội dung text nếu có
          const messageData = {
            conversationId,
            senderId: currentUser.userId,
            receiverId: chatUser.userId,
            type: "image",
            content: response.data.url || "",
            metadata: JSON.stringify({
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type,
              messageText: newMessage.trim(), // Lưu nội dung tin nhắn vào metadata
            }),
          };

          // Gọi API lưu tin nhắn
          const messageResponse = await sendMessageApi(messageData);

          if (messageResponse.status) {
            const finalMessage = {
              ...messageResponse.data,
              content: response.data.url || "",
              type: "image",
              status: "sent",
              senderId: currentUser.userId,
              receiverId: chatUser.userId,
              sender: {
                id: currentUser.userId,
                name: currentUser.fullName,
                avatar: currentUser.avatar,
              },
            };

            // Cập nhật tin nhắn với thông tin thật từ server
            setMessages((prev) =>
              prev.map((msg) =>
                msg.messageId === tempMessageId ? finalMessage : msg
              )
            );

            // Emit socket event
            socket?.emit("send-message", {
              ...finalMessage,
              conversationId,
              to: chatUser.userId,
            });

            // Reset input message nếu có
            if (newMessage.trim()) {
              setNewMessage("");
            }
          } else {
            throw new Error(messageResponse.message || "Gửi tin nhắn thất bại");
          }
        }
      } else {
        throw new Error(response.message || "Gửi ảnh thất bại");
      }
    } catch (error) {
      console.error("Error sending image message:", error);

      // Xóa tin nhắn tạm thời nếu gửi thất bại
      setMessages((prev) =>
        prev.filter((msg) => msg.messageId !== tempMessageId)
      );

      messageApi.open({
        type: "error",
        content: error.message || "Gửi ảnh thất bại",
      });
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop().toLowerCase();

    // Kiểm tra kích thước file
    const isVideoMp4 = fileExt === "mp4" || file.type === "video/mp4";
    const maxVideoSize = 30 * 1024 * 1024; // 30MB cho video MP4
    const maxNormalSize = 10 * 1024 * 1024; // 10MB cho các file khác

    // Áp dụng giới hạn kích thước dựa trên loại file
    const maxSize = isVideoMp4 ? maxVideoSize : maxNormalSize;

    if (file.size > maxSize) {
      messageApi.open({
        type: "error",
        content: `Kích thước file không được vượt quá ${
          isVideoMp4 ? "30MB" : "10MB"
        }`,
      });
      return;
    }

    const tempId = `temp_${Date.now()}`;

    console.log(
      "Uploading file:",
      file.name,
      "type:",
      file.type,
      "size:",
      file.size,
      "extension:",
      fileExt,
      "maxSize:",
      maxSize / (1024 * 1024) + "MB"
    );

    try {
      // Tạo tin nhắn tạm thời để hiển thị trạng thái đang tải
      const tempMessage = {
        messageId: tempId,
        conversationId,
        senderId: currentUser.userId,
        receiverId: chatUser.userId,
        type: "file",
        content: "Đang tải file...",
        fileName: file.name,
        fileSize: file.size,
        createdAt: Date.now(),
        status: "sending",
        sender: {
          id: currentUser.userId,
          name: currentUser.fullName,
          avatar: currentUser.avatar,
        },
      };

      // Thêm tin nhắn tạm thời vào state
      setMessages((prev) => [...prev, tempMessage]);
      scrollToBottom();

      // Tạo form data để gửi file
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversationId", conversationId);
      formData.append("fileName", file.name); // Thêm tên file để server có thể xử lý dựa trên tên

      // Gửi file lên server
      const response = await uploadMessageFileApi(formData);

      if (response.status) {
        // Tạo dữ liệu tin nhắn
        const messageData = {
          conversationId,
          senderId: currentUser.userId,
          receiverId: chatUser.userId,
          type: "file",
          content: response.data.url,
          metadata: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            fileExt: fileExt,
          }),
        };

        // Gọi API lưu tin nhắn
        const messageResponse = await sendMessageApi(messageData);

        if (messageResponse.status) {
          const finalMessage = {
            ...response.data,
            ...messageResponse.data,
            content: response.data.url,
            type: "file",
            status: "sent",
            senderId: currentUser.userId,
            receiverId: chatUser.userId,
            createdAt: messageResponse.data.createdAt || Date.now(),
            sender: {
              id: currentUser.userId,
              name: currentUser.fullName,
              avatar: currentUser.avatar,
            },
          };

          // Cập nhật tin nhắn với thông tin thật từ server
          setMessages((prev) =>
            prev.map((msg) => (msg.messageId === tempId ? finalMessage : msg))
          );

          // Emit socket event để thông báo tin nhắn mới
          socket?.emit("send-message", {
            ...finalMessage,
            conversationId,
            senderId: currentUser.userId,
            receiverId: chatUser.userId,
            to: chatUser.userId,
          });

          scrollToBottom();
        } else {
          throw new Error(messageResponse.message || "Gửi file thất bại");
        }
      } else {
        throw new Error(response.message || "Gửi file thất bại");
      }
    } catch (error) {
      console.error("Error sending file:", error);
      // Xóa tin nhắn tạm thời nếu gửi thất bại
      setMessages((prev) => prev.filter((msg) => msg.messageId !== tempId));
      messageApi.open({
        type: "error",
        content:
          "Không thể gửi file. Vui lòng thử lại: " + (error.message || ""),
      });
    } finally {
      // Reset input file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleOpenUserInfo = () => {
    setIsUserInfoModalOpen(true);
  };

  const handleCloseUserInfo = () => {
    setIsUserInfoModalOpen(false);
  };

  // Thêm useEffect mới để cập nhật isFriend khi contacts thay đổi
  useEffect(() => {
    console.log("🔄 ChatPage - contacts hoặc chatUser thay đổi:", {
      contacts: currentUser?.contacts,
      chatUserId: chatUser?.userId,
      currentIsFriend: chatUser?.isFriend,
    });

    if (currentUser?.contacts && chatUser?.userId) {
      const isFriend = currentUser.contacts.includes(chatUser.userId);
      console.log("📊 ChatPage - Kiểm tra trạng thái kết bạn:", {
        oldIsFriend: chatUser?.isFriend,
        newIsFriend: isFriend,
        calculation: {
          contacts: currentUser.contacts,
          chatUserId: chatUser.userId,
          includes: currentUser.contacts.includes(chatUser.userId),
        },
      });

      setChatUser((prev) => {
        const newState = {
          ...prev,
          isFriend,
        };
        console.log("✅ ChatPage - Cập nhật chatUser:", {
          oldState: prev,
          newState,
        });
        return newState;
      });
    }
  }, [currentUser?.contacts, chatUser?.userId]);

  // Thêm useEffect để cập nhật trạng thái hoạt động của chatUser ban đầu
  useEffect(() => {
    // Nếu đã có data của chatUser nhưng chưa có thông tin trạng thái
    if (
      chatUser &&
      (chatUser.isOnline === undefined || chatUser.lastActive === undefined)
    ) {
      // Gọi API để lấy thông tin trạng thái
      const fetchUserStatus = async () => {
        try {
          // Gọi API thật để lấy thông tin trạng thái
          const statusRes = await getUserStatusApi(chatUser.userId);

          if (statusRes.status) {
            setChatUser((prev) => ({
              ...prev,
              isOnline: statusRes.data.isOnline,
              lastActive: statusRes.data.lastActive,
            }));
          } else {
            // Fallback nếu API gặp lỗi
            setChatUser((prev) => ({
              ...prev,
              isOnline: false,
              lastActive: new Date().toISOString(),
            }));
          }
        } catch (error) {
          console.error("Lỗi khi lấy trạng thái người dùng:", error);
          // Fallback trong trường hợp lỗi
          setChatUser((prev) => ({
            ...prev,
            isOnline: false,
            lastActive: new Date().toISOString(),
          }));
        }
      };

      fetchUserStatus();
    }
  }, [chatUser?.userId]);

  // Hàm xử lý thả tim cho tin nhắn - sửa để cập nhật UI tạm thời
  const handleLikeMessage = (messageId) => {
    // Cập nhật UI tạm thời để phản hồi ngay cho người dùng
    // Sẽ được ghi đè bởi socket event sau đó

    // 1. Cập nhật số lượng tim
    setLikedMessages((prev) => {
      const currentCount = prev[messageId] || 0;
      return {
        ...prev,
        [messageId]: currentCount + 1,
      };
    });

    // 2. Cập nhật ngay trạng thái tim của người dùng hiện tại
    setMessageReactions((prev) => {
      // Tạo một bản sao sâu của state hiện tại
      const updated = { ...prev };

      // Nếu chưa có reactions cho tin nhắn này, tạo mới
      if (!updated[messageId]) {
        updated[messageId] = {};
      }

      // Nếu người dùng chưa thả tim, thêm mới với count = 1
      if (!updated[messageId][currentUser.userId]) {
        updated[messageId][currentUser.userId] = {
          type: "heart",
          count: 1,
        };
      }
      // Nếu đã thả tim, tăng count lên
      else {
        updated[messageId][currentUser.userId] = {
          ...updated[messageId][currentUser.userId],
          count: updated[messageId][currentUser.userId].count + 1,
        };
      }

      return updated;
    });

    // Gửi thông tin reaction qua socket
    if (socket && conversationId) {
      socket.emit("react-message", {
        messageId,
        conversationId,
        userId: currentUser.userId,
        type: "heart",
        action: "add",
      });
    }
  };

  const handleOpenReactionModal = async (messageId) => {
    if (messageReactions[messageId]) {
      // Lấy danh sách userId đã thả tim
      const userIds = Object.keys(messageReactions[messageId]);

      // Thiết lập dữ liệu cơ bản cho modal
      setSelectedMessageReactions({
        messageId,
        reactions: messageReactions[messageId],
      });

      setShowReactionModal(true);

      const userDetails = {};

      try {
        // Thử lấy thông tin từ danh bạ hoặc cache trước
        const fetchPromises = userIds.map(async (userId) => {
          // Nếu là người dùng hiện tại, lấy từ currentUser
          if (userId === currentUser?.userId) {
            userDetails[userId] = {
              userId,
              fullName: currentUser.fullName || "Bạn",
              avatar: currentUser.avatar || defaultAvatar,
            };
            return;
          }

          // Nếu là người đang chat với, lấy từ chatUser
          if (userId === chatUser?.userId) {
            userDetails[userId] = {
              userId,
              fullName: chatUser.fullName,
              avatar: chatUser.avatar || defaultAvatar,
            };
            return;
          }

          // Nếu không có trong cache, gọi API
          try {
            const userResponse = await getUserByIdApi(userId);
            if (userResponse.status) {
              userDetails[userId] = {
                userId,
                fullName: userResponse.data.fullName,
                avatar: userResponse.data.avatar || defaultAvatar,
              };
            }
          } catch (error) {
            console.error(
              `Không thể lấy thông tin người dùng ${userId}`,
              error
            );
            // Fallback to basic info
            userDetails[userId] = {
              userId,
              fullName: userId,
              avatar: defaultAvatar,
            };
          }
        });

        // Đợi tất cả các request hoàn thành
        await Promise.all(fetchPromises);

        // Cập nhật state với thông tin chi tiết
        setReactedUserDetails(userDetails);
      } catch (error) {
        console.error("Lỗi khi lấy thông tin người dùng:", error);
      }
    }
  };

  // useEffect để lắng nghe sự kiện typing
  useEffect(() => {
    if (!socket || !conversationId) return;

    // Hàm xử lý khi nhận sự kiện user-typing
    const handleUserTyping = (data) => {
      console.log("Nhận sự kiện typing:", data);
      if (data.userId === chatUser?.userId) {
        setChatUserTyping(true);
      }
    };

    // Hàm xử lý khi nhận sự kiện user-stop-typing
    const handleUserStopTyping = (data) => {
      console.log("Nhận sự kiện stop typing:", data);
      if (data.userId === chatUser?.userId) {
        setChatUserTyping(false);
      }
    };

    // Đăng ký lắng nghe sự kiện
    socket.on("user-typing", handleUserTyping);
    socket.on("user-stop-typing", handleUserStopTyping);

    // Cleanup khi unmount
    return () => {
      socket.off("user-typing", handleUserTyping);
      socket.off("user-stop-typing", handleUserStopTyping);
    };
  }, [socket, conversationId, chatUser?.userId]);

  // Hàm gửi trạng thái typing
  const handleTyping = () => {
    if (!socket || !conversationId || !chatUser?.isFriend) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing", { conversationId });
    }

    // Clear previous timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      setIsTyping(false);
      socket.emit("stop-typing", { conversationId });
    }, 2000); // 2 giây sau khi ngừng gõ

    setTypingTimeout(timeout);
  };

  // Xử lý khi người dùng gõ
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  // Hàm xử lý khi chọn emoji
  const handleEmojiSelect = (emoji) => {
    // Thêm emoji vào tin nhắn hiện tại
    setNewMessage((prev) => prev + emoji);
    // Đặt focus lại vào input sau khi chọn emoji
    messageInputRef.current?.focus();
    // Đóng emoji picker sau khi chọn
    setShowEmojiPicker(false);
  };

  // Đóng emoji picker khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker) {
        // Kiểm tra nếu click ngoài emoji picker và không phải là button mở emoji
        if (
          !event.target.closest(".emoji-picker") &&
          !event.target.closest(".emoji-button")
        ) {
          setShowEmojiPicker(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Xử lý sự kiện paste
  const handlePaste = (e) => {
    const items = e.clipboardData.items;

    // Duyệt qua các item trong clipboard
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        // Lấy file ảnh từ clipboard
        const file = items[i].getAsFile();

        // Tạo tên cho file từ timestamp
        const fileName = `pasted-image-${Date.now()}.png`;
        const renamedFile = new File([file], fileName, { type: file.type });

        // Lưu file vào state để hiển thị preview
        const url = URL.createObjectURL(file);
        setPastedImage({
          previewUrl: url,
          file: renamedFile,
        });

        // Ngăn chặn paste mặc định
        e.preventDefault();
        return;
      }
    }
  };

  // Xóa ảnh đã paste
  const clearPastedImage = () => {
    if (pastedImage && pastedImage.previewUrl) {
      URL.revokeObjectURL(pastedImage.previewUrl);
    }
    setPastedImage(null);
  };

  const handleOpenCreateGroupModal = () => {
    setShowCreateGroupModal(true);
  };

  const handleCloseCreateGroupModal = () => {
    setShowCreateGroupModal(false);
  };

  const handleCreateGroup = async (groupData) => {
    try {
      // Gọi API tạo nhóm đã được thực hiện trong CreateGroupModal
      // và groupData là dữ liệu conversation đã tạo thành công
      console.log("Dữ liệu nhóm:", groupData);

      messageApi.open({
        type: "success",
        content: "Tạo nhóm thành công",
      });

      // Đóng modal tạo nhóm
      handleCloseCreateGroupModal();

      // Chuyển đến cuộc trò chuyện nhóm mới tạo
      if (groupData && groupData.conversationId) {
        // Sử dụng setTimeout để đảm bảo navigate xảy ra sau khi state đã được cập nhật
        setTimeout(() => {
          navigate(`/chat/${groupData.conversationId}`);
        }, 100);
      }
    } catch (error) {
      console.error("Lỗi khi tạo nhóm:", error);
      messageApi.open({
        type: "error",
        content: "Không thể tạo nhóm",
      });
    }
  };

  const handleDeleteMessage = async (message) => {
    try {
      const response = await deleteMessageApi(
        message.messageId,
        conversationId
      );

      if (response.status) {
        // Cập nhật UI local
        setMessages((prev) =>
          prev.map((msg) =>
            msg.messageId === message.messageId
              ? { ...msg, isDeleted: true, content: "Tin nhắn đã được xóa" }
              : msg
          )
        );

        // Emit socket event để thông báo cho người nhận
        if (socket) {
          socket.emit("message-deleted", {
            messageId: message.messageId,
            conversationId,
            senderId: currentUser.userId,
            receiverId: chatUser.userId,
            isDeleted: true,
            content: "Tin nhắn đã được xóa",
          });
        }

        messageApi.open({
          type: "success",
          content: "Đã xóa tin nhắn",
        });
      } else {
        messageApi.open({
          type: "error",
          content: response.message || "Không thể xóa tin nhắn",
        });
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      messageApi.open({
        type: "error",
        content: "Có lỗi xảy ra khi xóa tin nhắn",
      });
    }
  };

  // Thêm socket listener cho sự kiện xóa tin nhắn
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleMessageDeleted = (data) => {
      console.log("Received message-deleted event:", data);
      if (data.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.messageId === data.messageId
              ? { ...msg, isDeleted: true, content: "Tin nhắn đã được xóa" }
              : msg
          )
        );
      }
    };

    // Đăng ký lắng nghe sự kiện message-deleted
    socket.on("message-deleted", handleMessageDeleted);

    return () => {
      socket.off("message-deleted", handleMessageDeleted);
    };
  }, [socket, conversationId]);

  // Thêm useEffect để lắng nghe các sự kiện liên quan đến cuộc gọi
  useEffect(() => {
    // Chỉ đăng ký khi socket đã connect và có userId
    if (!socket || socket.disconnected || !currentUser?.userId) {
      console.log(
        "[CALL] Không có socket hoặc socket chưa connect để đăng ký listener call events"
      );
      return;
    }
    console.log(
      "[CALL] Đăng ký listeners cho video call events ở socket:",
      socket.id
    );

    // Các listeners cho video call
    const handleIncomingCall = (data) => {
      console.log("[CHAT] Nhận incoming-call:", data);

      // Kiểm tra xem modal gọi video đã mở chưa
      if (showVideoCall.isOpen) {
        console.log(
          "[CHAT] Đã có modal gọi video đang mở, bỏ qua incoming-call mới"
        );
        // Phản hồi ngay lập tức là đang bận để người gọi biết
        socket.emit("reject-call", {
          to: data.from,
          from: currentUser.userId,
          reason: "busy",
        });
        return;
      }

      // Kiểm tra xem đã đang xử lý cuộc gọi đến khác chưa
      if (incomingCall) {
        console.log(
          "[CHAT] Đang xử lý incomingCall khác, bỏ qua incoming-call mới"
        );
        // Phản hồi ngay lập tức là đang bận để người gọi biết
        socket.emit("reject-call", {
          to: data.from,
          from: currentUser.userId,
          reason: "busy",
        });
        return;
      }

      // Lưu thông tin cuộc gọi đến vào state
      setIncomingCall(data);
    };

    const handleCallBusy = () => {
      console.log("[CHAT] Nhận call-busy");
      messageApi.open({
        type: "error",
        content: "Người kia đang bận hoặc đã có cuộc gọi khác!",
      });
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
      console.log("[CHAT] Nhận call-ended");
      messageApi.open({
        type: "info",
        content: "Cuộc gọi đã kết thúc hoặc bị ngắt kết nối!",
      });
      setShowVideoCall({
        isOpen: false,
        isCallee: false,
        offer: null,
        from: null,
        callId: null,
      });
      setIncomingCall(null);
      messageApi.destroy("incoming-call");
    };

    const handleCallError = (data) => {
      console.log("[CHAT] Nhận call-error:", data);
      messageApi.open({
        type: "error",
        content: data.error || "Có lỗi xảy ra trong cuộc gọi",
      });
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
      console.log(
        "[CHAT] Nhận call-rejected, cuộc gọi bị từ chối bởi:",
        data.from
      );

      // Đóng modal cuộc gọi nếu đang mở
      setShowVideoCall({
        isOpen: false,
        isCallee: false,
        offer: null,
        from: null,
        callId: null,
      });

      // Xóa thông tin cuộc gọi đến nếu có
      setIncomingCall(null);

      // Hiển thị thông báo cho người gọi
      messageApi.open({
        type: "error",
        content: "Cuộc gọi đã bị từ chối",
      });

      // Đảm bảo xóa các message notifications còn sót lại
      messageApi.destroy("incoming-call");
    };

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-busy", handleCallBusy);
    socket.on("call-ended", handleCallEnded);
    socket.on("call-error", handleCallError);
    socket.on("call-rejected", handleCallRejected);

    // Cleanup listener khi socket hoặc userId thay đổi
    return () => {
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-busy", handleCallBusy);
      socket.off("call-ended", handleCallEnded);
      socket.off("call-error", handleCallError);
      socket.off("call-rejected", handleCallRejected);
      console.log(
        "[CALL] Cleanup listeners cho video call events ở socket:",
        socket.id
      );
    };
  }, [
    socket,
    socket?.id,
    currentUser?.userId,
    messageApi,
    showVideoCall.isOpen,
    incomingCall,
  ]);

  useEffect(() => {
    if (!socket) return;
    const handleCallBusy = () => {
      messageApi.open({
        type: "error",
        content: "Người kia đang bận hoặc đã có cuộc gọi khác!",
      });
      setShowVideoCall({ isOpen: false, isCallee: false });
      setIncomingCall(null);
    };
    socket.on("call-busy", handleCallBusy);
    return () => {
      socket.off("call-busy", handleCallBusy);
    };
  }, [socket]);

  const isInCall = showVideoCall.isOpen || incomingCall;

  // Thêm useEffect cho việc điều khiển âm thanh khi có cuộc gọi đến
  useEffect(() => {
    if (incomingCall && ringtoneSoundRef.current) {
      // Phát âm thanh khi có cuộc gọi đến
      console.log("[CHAT] Đang phát nhạc chuông cho cuộc gọi đến");
      ringtoneSoundRef.current.volume = 0.7; // Tăng âm lượng lên 0.7
      ringtoneSoundRef.current.loop = true; // Lặp lại

      // Thêm xử lý sự kiện để debug
      const playPromise = ringtoneSoundRef.current.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("[CHAT] Nhạc chuông đã bắt đầu phát thành công");
          })
          .catch((err) => {
            console.error("[CHAT] Không thể phát âm thanh cuộc gọi:", err);
            // Thử lại sau khi có tương tác
            const tryPlayOnUserInteraction = () => {
              ringtoneSoundRef.current
                .play()
                .catch((e) =>
                  console.error("[CHAT] Vẫn không thể phát nhạc chuông:", e)
                );
              document.removeEventListener("click", tryPlayOnUserInteraction);
            };
            document.addEventListener("click", tryPlayOnUserInteraction);
          });
      }
    } else if (ringtoneSoundRef.current) {
      // Dừng âm thanh khi không còn cuộc gọi đến
      console.log("[CHAT] Dừng phát nhạc chuông");
      ringtoneSoundRef.current.pause();
      ringtoneSoundRef.current.currentTime = 0;
    }

    // Cleanup khi component unmount
    return () => {
      if (ringtoneSoundRef.current) {
        ringtoneSoundRef.current.pause();
        ringtoneSoundRef.current.currentTime = 0;
      }
    };
  }, [incomingCall]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    // Lắng nghe sự kiện thêm thành viên vào nhóm
    const handleMemberAdded = (data) => {
      if (data.conversationId === conversationId) {
        // Cập nhật lại participants trong chatUser
        setChatUser((prev) => ({
          ...prev,
          participants: data.participants,
        }));
      }
    };
    socket.on("member-added", handleMemberAdded);
    return () => {
      socket.off("member-added", handleMemberAdded);
    };
  }, [socket, conversationId]);

  // Thêm hàm xử lý xóa thành viên khỏi nhóm
  const handleRemoveMember = (member) => {
    setRemoveMemberModal({ open: true, member });
  };

  const confirmRemoveMember = async () => {
    const member = removeMemberModal.member;
    if (!chatUser?.userId || !member?.userId) return;
    setIsRemovingMember(true);
    try {
      const res = await removeParticipantsApi(chatUser.userId, [member.userId]);
      if (res.status) {
        setChatUser((prev) => ({
          ...prev,
          participants: prev.participants.filter(
            (m) => m.userId !== member.userId
          ),
        }));
        messageApi.open({
          type: "success",
          content: `Đã xóa ${member.fullName} khỏi nhóm!`,
        });
        if (member.userId === currentUser.userId) {
          navigate("/");
        }
      } else {
        messageApi.open({
          type: "error",
          content: res.message || "Không thể xóa thành viên!",
        });
      }
    } catch (error) {
      messageApi.open({
        type: "error",
        content: error.message || "Có lỗi khi xóa thành viên!",
      });
    } finally {
      setIsRemovingMember(false);
      setRemoveMemberModal({ open: false, member: null });
    }
  };

  // Lắng nghe realtime khi có thành viên bị xóa khỏi nhóm hoặc rời nhóm
  useEffect(() => {
    if (!socket || !conversationId) return;
    const handleMemberRemoved = (data) => {
      if (data.conversationId === conversationId) {
        if (
          data.removedMembers &&
          data.removedMembers.includes(currentUser.userId)
        ) {
          messageApi.open({
            type: "error",
            content: "Bạn đã bị xóa khỏi nhóm!",
          });
          navigate("/");
          return;
        }
        setChatUser((prev) => ({
          ...prev,
          participants: prev.participants.filter(
            (m) => !data.removedMembers.includes(m.userId)
          ),
        }));
      }
    };
    const handleMemberLeft = (data) => {
      console.log(
        "[DEBUG] Nhận event member-left:",
        data,
        "currentUser:",
        currentUser.userId
      );
      if (data.conversationId === conversationId) {
        if (data.userId === currentUser.userId) {
          messageApi.open({
            type: "success",
            content: "Bạn đã rời nhóm thành công!",
          });
          navigate("/");
          return;
        }
        if (data.conversation) {
          setChatUser((prev) => ({
            ...prev,
            admin: data.conversation.admin,
            participants: data.conversation.participants.map((m) => ({ ...m })), // ép tạo mảng và object mới
            totalMembers: data.conversation.participants.length,
          }));
        }
      }
    };
    socket.on("member-removed", handleMemberRemoved);
    socket.on("member-left", handleMemberLeft);
    return () => {
      socket.off("member-removed", handleMemberRemoved);
      socket.off("member-left", handleMemberLeft);
    };
  }, [socket, conversationId, currentUser.userId, messageApi, navigate]);

  // Hàm xử lý rời nhóm
  const handleLeaveGroup = () => {
    // Nếu là trưởng nhóm và còn nhiều hơn 1 thành viên
    if (
      chatUser?.admin === currentUser.userId &&
      chatUser?.participants?.length > 1
    ) {
      setLeaveGroupModal(true);
    } else {
      setLeaveGroupModal(true);
    }
  };

  const confirmTransferAdminAndLeave = async () => {
    if (
      chatUser?.admin === currentUser.userId &&
      chatUser?.participants?.length > 1
    ) {
      if (!selectedNewAdmin || !chatUser?.userId) return;
      setIsTransferringAdmin(true);
      try {
        // Gọi API cập nhật admin
        const res = await updateConversationApi(chatUser.userId, {
          admin: selectedNewAdmin,
        });
        if (res.status) {
          // Sau khi chuyển quyền, gọi leaveGroupApi
          const leaveRes = await leaveGroupApi(chatUser.userId);
          if (leaveRes.status) {
            messageApi.open({
              type: "success",
              content:
                "Bạn đã chuyển quyền trưởng nhóm và rời nhóm thành công!",
            });
            navigate("/");
          } else {
            messageApi.open({
              type: "error",
              content: leaveRes.message || "Không thể rời nhóm!",
            });
          }
        } else {
          messageApi.open({
            type: "error",
            content: res.message || "Không thể chuyển quyền trưởng nhóm!",
          });
        }
      } catch (error) {
        messageApi.open({
          type: "error",
          content: error.message || "Có lỗi khi chuyển quyền/rời nhóm!",
        });
      } finally {
        setIsTransferringAdmin(false);
        setLeaveGroupModal(false);
        setSelectedNewAdmin(null);
      }
    } else {
      // Trường hợp không phải trưởng nhóm hoặc chỉ còn 1 thành viên
      setIsTransferringAdmin(true);
      try {
        const res = await leaveGroupApi(chatUser.userId);
        if (res.status) {
          messageApi.open({
            type: "success",
            content: "Bạn đã rời nhóm thành công!",
          });
          navigate("/");
        } else {
          messageApi.open({
            type: "error",
            content: res.message || "Không thể rời nhóm!",
          });
        }
      } catch (error) {
        messageApi.open({
          type: "error",
          content: error.message || "Có lỗi khi rời nhóm!",
        });
      } finally {
        setIsTransferringAdmin(false);
        setLeaveGroupModal(false);
      }
    }
  };

  useEffect(() => {
    if (!socket || !conversationId) return;

    // Log khi join room
    console.log("[DEBUG] Đang join room conversation:", conversationId);
    socket.emit("join-conversation", {
      conversationId,
      userId: currentUser.userId,
    });

    // Lắng nghe sự kiện member-left
    const handleMemberLeft = (data) => {
      console.log("[DEBUG] Nhận event member-left:", data);
      console.log("[DEBUG] Current user:", currentUser.userId);
      console.log("[DEBUG] Current conversationId:", conversationId);

      if (data.conversationId === conversationId) {
        console.log("[DEBUG] Cập nhật lại thông tin nhóm");

        // Nếu là người rời nhóm
        if (data.userId === currentUser.userId) {
          messageApi.open({
            type: "success",
            content: "Bạn đã rời nhóm thành công!",
          });
          navigate("/");
          return;
        }

        // Nếu là thành viên khác rời nhóm
        if (data.conversation) {
          console.log("[DEBUG] Cập nhật lại admin và participants:", {
            newAdmin: data.conversation.admin,
            newParticipants: data.conversation.participants,
            totalMembers: data.conversation.participants.length,
          });

          setChatUser((prev) => {
            // Tạo state mới với admin và participants mới
            const newState = {
              ...prev,
              admin: data.conversation.admin,
              participants: data.conversation.participants.map((m) => ({
                ...m,
              })), // ép tạo mảng và object mới
              totalMembers: data.conversation.participants.length,
            };

            console.log("[DEBUG] State cũ:", {
              admin: prev.admin,
              participants: prev.participants,
              totalMembers: prev.totalMembers,
            });
            console.log("[DEBUG] State mới:", {
              admin: newState.admin,
              participants: newState.participants,
              totalMembers: newState.totalMembers,
            });

            return newState;
          });
        }
      }
    };

    // Đăng ký lắng nghe event
    console.log("[DEBUG] Đăng ký lắng nghe event member-left");
    socket.on("member-left", handleMemberLeft);

    return () => {
      console.log("[DEBUG] Cleanup - Leave room conversation:", conversationId);
      socket.off("member-left", handleMemberLeft);
      socket.emit("leave-conversation", {
        conversationId,
        userId: currentUser.userId,
      });
    };
  }, [socket, conversationId, currentUser?.userId]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
      </div>
    );
  }

  if (!chatUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-gray-500">Không tìm thấy người dùng</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      {/* Thêm phần tử audio cho cuộc gọi đến */}
      <audio ref={ringtoneSoundRef} src={callRingtone} preload="auto" />

      {/* Thêm phần tử audio cho tin nhắn đến */}
      <audio
        ref={messageRingtoneSoundRef}
        src={messageRingtone}
        preload="auto"
      />

      {/* Khung chat chính */}
      <div
        className={`flex flex-col bg-white transition-all duration-200 ${
          isChatInfoOpen ? "w-[calc(100%-360px)]" : "w-full"
        } flex-1`}
      >
        <div className="sticky top-0 z-20 px-4 py-3 border-b border-[#00000026] bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={chatUser.avatar || defaultAvatar}
                alt={chatUser.fullName}
                className="w-12 h-12 rounded-full object-cover cursor-pointer"
                onClick={handleOpenUserInfo}
              />
              {/* Chỉ báo trạng thái online */}
              {!chatUser.isGroup &&
                (chatUser.isOnline ? (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                ) : (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-gray-300 rounded-full border-2 border-white"></div>
                ))}
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="text-[18px] font-medium text-[#06132b] select-none">
                {chatUser.fullName}
              </div>
              <div className="flex items-center text-xs text-gray-500 select-none">
                {chatUser.isGroup ? (
                  <span>{chatUser.participants?.length || 0} thành viên</span>
                ) : chatUser.isOnline ? (
                  <span>Đang hoạt động</span>
                ) : chatUser.lastActive ? (
                  <span>
                    {(() => {
                      const lastActive = new Date(chatUser.lastActive);
                      const now = new Date();
                      const diffInMinutes = Math.floor(
                        (now - lastActive) / (1000 * 60)
                      );

                      if (diffInMinutes < 1) return "Vừa truy cập";
                      if (diffInMinutes < 60)
                        return `Truy cập ${diffInMinutes} phút trước`;

                      const diffInHours = Math.floor(diffInMinutes / 60);
                      if (diffInHours < 24)
                        return `Truy cập ${diffInHours} giờ trước`;

                      const diffInDays = Math.floor(diffInHours / 24);
                      return `Truy cập ${diffInDays} ngày trước`;
                    })()}
                  </span>
                ) : (
                  <span>Không hoạt động</span>
                )}
                <span className="ml-2.5 text-gray-200">|</span>
                <div className="flex items-center gap-1 ml-2.5">
                  <PiTagSimple
                    size={17}
                    className="text-[#5a6981] hover:text-blue-600 cursor-pointer transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[#0f182e] text-[18px]">
            <button
              className="hover:bg-gray-100 p-2 rounded cursor-pointer"
              onClick={handleOpenCreateGroupModal}
            >
              <AiOutlineUsergroupAdd size={22} />
            </button>
            <button
              className="hover:bg-gray-100 p-2 rounded cursor-pointer"
              onClick={() => {
                if (isInCall) {
                  messageApi.open({
                    type: "warning",
                    content: "Bạn hoặc người kia đang có cuộc gọi khác!",
                  });
                  return;
                }
                if (chatUser?.isFriend || chatUser?.isGroup) {
                  setShowVideoCall({ isOpen: true, isCallee: false });
                }
              }}
              disabled={(!chatUser?.isFriend && !chatUser?.isGroup) || isInCall}
            >
              <HiOutlineVideoCamera size={22} />
            </button>
            <button className="hover:bg-gray-100 p-2 rounded cursor-pointer">
              <IoSearchOutline size={20} />
            </button>
            <button
              className={`p-2 rounded cursor-pointer transition-colors ${
                isChatInfoOpen ? "bg-[#e6f0ff]" : "hover:bg-gray-100"
              }`}
              onClick={() => setIsChatInfoOpen((prev) => !prev)}
            >
              <TbColumns2
                size={20}
                color={isChatInfoOpen ? "#0068ff" : undefined}
              />
            </button>
          </div>
        </div>

        <div className="bg-[#ebecf0] flex-1 overflow-y-auto">
          {!chatUser?.isFriend && !chatUser?.isGroup && (
            <div className="sticky top-[10px] z-10 m-2 px-4 py-3 border-b border-[#00000026] rounded-md bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserAddOutlined />
                <span className="text-sm text-gray-600 select-none">
                  {hasReceivedRequest
                    ? "Người này đã gửi lời mời kết bạn cho bạn"
                    : hasSentRequest
                    ? "Đã gửi lời mời kết bạn"
                    : "Gửi yêu cầu kết bạn tới người này"}
                </span>
              </div>
              {hasReceivedRequest ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleAcceptRequest}
                    disabled={accepting || rejecting}
                    className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
                      accepting
                        ? "bg-[#0068ff] text-white opacity-50 cursor-not-allowed"
                        : "bg-[#0068ff] text-white hover:bg-[#0052cc]"
                    }`}
                  >
                    {accepting ? (
                      <div className="flex items-center gap-1">
                        <Spin
                          indicator={
                            <LoadingOutlined
                              style={{ color: "white", fontSize: 14 }}
                              spin
                            />
                          }
                        />
                        <span>Đồng ý</span>
                      </div>
                    ) : (
                      "Đồng ý"
                    )}
                  </button>
                  <button
                    onClick={handleRejectRequest}
                    disabled={accepting || rejecting}
                    className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
                      rejecting
                        ? "bg-gray-200 text-gray-600 opacity-50 cursor-not-allowed"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    {rejecting ? (
                      <div className="flex items-center gap-1">
                        <Spin
                          indicator={
                            <LoadingOutlined style={{ fontSize: 14 }} spin />
                          }
                        />
                        <span>Từ chối</span>
                      </div>
                    ) : (
                      "Từ chối"
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSendRequest}
                  disabled={sending || hasSentRequest}
                  className={`px-4 py-1.5 text-sm rounded-lg transition-colors cursor-pointer ${
                    hasSentRequest
                      ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                      : sending
                      ? "bg-[#0068ff] text-white opacity-50 cursor-not-allowed"
                      : "bg-[#0068ff] text-white hover:bg-[#0052cc]"
                  }`}
                >
                  {sending ? (
                    <div className="flex items-center gap-1">
                      <Spin
                        indicator={
                          <LoadingOutlined
                            style={{ color: "white", fontSize: 14 }}
                            spin
                          />
                        }
                      />
                      <span>Gửi kết bạn</span>
                    </div>
                  ) : hasSentRequest ? (
                    <span>Đã gửi</span>
                  ) : (
                    <span>Gửi kết bạn</span>
                  )}
                </button>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2 pb-5 pl-3 bg-[#ebecf0]">
            <div className="text-center text-xs text-gray-400">
              {new Date().toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "numeric",
                month: "numeric",
                year: "numeric",
              })}
            </div>

            {messages.map((msg, idx) => {
              // Sửa lại cách xác định người gửi
              const isSender = msg.sender?.id === currentUser?.userId;
              const isFirstMessage = idx === 0;
              const prevMessage = idx > 0 ? messages[idx - 1] : null;
              const showAvatar =
                !isSender &&
                (!prevMessage || prevMessage.sender?.id !== msg.sender?.id);

              // Lấy danh sách người đã thả tim (nếu có)
              const hasReactions = messageReactions[msg.messageId || idx];
              const currentUserHasReacted =
                hasReactions &&
                Object.keys(messageReactions[msg.messageId || idx]).includes(
                  currentUser?.userId
                );

              return (
                <div
                  key={msg.messageId || idx}
                  className={`flex ${
                    isSender ? "justify-end" : "justify-start"
                  } ${
                    !isFirstMessage &&
                    !isSender &&
                    prevMessage?.sender?.id === msg.sender?.id
                      ? "mt-[5.5px] mb-[4px]"
                      : "mt-[5.5px] mb-[4px]"
                  }`}
                >
                  {!isSender && (
                    <div className="w-10 min-w-[40px] mr-2">
                      {(showAvatar || chatUser?.isGroup) && (
                        <img
                          src={msg.sender?.avatar || defaultAvatar}
                          alt={msg.sender?.name || "Thành viên nhóm"}
                          className="w-10 h-10 rounded-full object-cover cursor-pointer"
                          onClick={handleOpenUserInfo}
                        />
                      )}
                    </div>
                  )}

                  <div className="relative group max-w-[60%]">
                    <div
                      className={`relative inline-block border-transparent rounded-[6px] p-3 text-sm ${
                        isSender ? "bg-[#dbebff]" : "bg-white"
                      }`}
                      style={{
                        boxShadow:
                          "0px 0px 1px 0px rgba(21,39,71,0.25), 0px 1px 1px 0px rgba(21,39,71,0.25)",
                        maxWidth: "100%",
                        wordBreak: "break-word",
                      }}
                    >
                      {/* Hiển thị các icon khi hover */}
                      {!msg.isDeleted && (
                        <div
                          className={`absolute bottom-0 hidden group-hover:flex items-center gap-2 rounded-full py-2 px-2 z-10 ${
                            isSender ? "right-full" : "left-full"
                          }`}
                        >
                          <div className="w-6 h-6 flex items-center justify-center bg-[#ffffffcc] rounded-full cursor-pointer">
                            <FaQuoteRight
                              className="text-[#5a6981] hover:text-[#005ae0]"
                              size={10}
                            />
                          </div>
                          <div className="w-6 h-6 flex items-center justify-center bg-[#ffffffcc] rounded-full cursor-pointer">
                            <IoIosShareAlt
                              className="text-[#5a6981] hover:text-[#005ae0]"
                              size={15}
                            />
                          </div>
                          <MessageDropdown
                            message={msg}
                            currentUserId={currentUser.userId}
                            onDelete={handleDeleteMessage}
                          />
                        </div>
                      )}

                      {/* Nội dung tin nhắn */}
                      {msg.isDeleted ? (
                        <div className="italic text-gray-500 select-none">
                          {msg.content}
                        </div>
                      ) : msg.type === "image" ? (
                        msg.status === "sending" ? (
                          <div className="flex items-center gap-2">
                            <Spin
                              indicator={
                                <LoadingOutlined
                                  style={{ fontSize: 16 }}
                                  spin
                                />
                              }
                            />
                            <span>Đang tải ảnh...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <img
                              src={msg.content}
                              alt="Ảnh tin nhắn"
                              className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              style={{ maxHeight: "150px" }}
                              onClick={() => setSelectedImage(msg.content)}
                            />
                            {/* Hiển thị text đi kèm với ảnh nếu có */}
                            {(() => {
                              let messageText = "";

                              // Kiểm tra nếu tin nhắn có trường messageText trực tiếp
                              if (msg.messageText) {
                                messageText = msg.messageText;
                              }
                              // Nếu không, kiểm tra trong metadata
                              else if (msg.metadata) {
                                try {
                                  // Kiểm tra nếu metadata là string thì parse
                                  if (typeof msg.metadata === "string") {
                                    const metadataObj = JSON.parse(
                                      msg.metadata
                                    );
                                    messageText = metadataObj.messageText || "";
                                  }
                                  // Nếu metadata là object
                                  else if (typeof msg.metadata === "object") {
                                    messageText =
                                      msg.metadata.messageText || "";
                                  }
                                } catch (e) {
                                  console.error("Lỗi khi parse metadata:", e);
                                }
                              }

                              // Hiển thị messageText nếu có
                              return messageText ? (
                                <div className="mt-1 text-sm">
                                  {messageText}
                                </div>
                              ) : null;
                            })()}
                          </div>
                        )
                      ) : typeof msg.content === "string" &&
                        (msg.content.endsWith(".gif") ||
                          msg.content.endsWith(".jpg") ||
                          msg.content.endsWith(".png") ||
                          msg.content.endsWith(".jpeg")) ? (
                        <img
                          src={msg.content}
                          alt="Ảnh tin nhắn"
                          className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ maxHeight: "150px" }}
                          onClick={() => setSelectedImage(msg.content)}
                        />
                      ) : msg.type === "file" ? (
                        msg.status === "sending" ? (
                          <div className="flex items-center gap-2">
                            <Spin
                              indicator={
                                <LoadingOutlined
                                  style={{ fontSize: 16 }}
                                  spin
                                />
                              }
                            />
                            <span>Đang tải file...</span>
                          </div>
                        ) : (
                          (() => {
                            const isMP4 = msg.metadata
                              ? (() => {
                                  const metadata = JSON.parse(msg.metadata);
                                  const fileName = metadata.fileName || "";
                                  const fileExt = fileName
                                    .split(".")
                                    .pop()
                                    .toLowerCase();
                                  return (
                                    fileExt === "mp4" ||
                                    metadata.mimeType === "video/mp4"
                                  );
                                })()
                              : (msg.url || msg.content || "")
                                  .toLowerCase()
                                  .endsWith(".mp4");

                            const isMP3 = msg.metadata
                              ? (() => {
                                  const metadata = JSON.parse(msg.metadata);
                                  const fileName = metadata.fileName || "";
                                  const fileExt = fileName
                                    .split(".")
                                    .pop()
                                    .toLowerCase();
                                  return (
                                    fileExt === "mp3" ||
                                    metadata.mimeType === "audio/mpeg" ||
                                    metadata.mimeType === "audio/mp3"
                                  );
                                })()
                              : (msg.url || msg.content || "")
                                  .toLowerCase()
                                  .endsWith(".mp3");

                            if (isMP4) {
                              return (
                                <div className="flex flex-col gap-2 max-w-[360px]">
                                  <video
                                    controls
                                    className="max-w-full rounded-lg cursor-pointer"
                                    style={{ maxHeight: "300px" }}
                                  >
                                    <source
                                      src={msg.url || msg.content}
                                      type="video/mp4"
                                    />
                                    Trình duyệt của bạn không hỗ trợ phát video.
                                  </video>
                                  <div className="flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer">
                                    <BsFiletypeMp4
                                      className="text-purple-500"
                                      size={30}
                                    />
                                    <div className="flex flex-col gap-0.5 text-sm text-black font-medium select-none">
                                      <span>
                                        {msg.metadata
                                          ? JSON.parse(msg.metadata).fileName
                                          : "Video.mp4"}
                                      </span>
                                      <span className="text-xs text-gray-500 font-normal">
                                        {msg.metadata
                                          ? (() => {
                                              const fileSize = JSON.parse(
                                                msg.metadata
                                              ).fileSize;
                                              const fileSizeKB =
                                                fileSize / 1024;
                                              if (fileSizeKB < 1024) {
                                                return (
                                                  fileSizeKB.toFixed(2) + " KB"
                                                );
                                              } else {
                                                return (
                                                  (fileSizeKB / 1024).toFixed(
                                                    2
                                                  ) + " MB"
                                                );
                                              }
                                            })()
                                          : ""}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            if (isMP3) {
                              return (
                                <div className="flex flex-col gap-2 max-w-[360px]">
                                  <audio
                                    controls
                                    className="max-w-full rounded-lg"
                                  >
                                    <source
                                      src={msg.url || msg.content}
                                      type="audio/mpeg"
                                    />
                                    Trình duyệt của bạn không hỗ trợ phát âm
                                    thanh.
                                  </audio>
                                  <div className="flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer">
                                    <BsFiletypeMp3
                                      className="text-purple-500"
                                      size={30}
                                    />
                                    <div className="flex flex-col gap-0.5 text-sm text-black font-medium select-none">
                                      <span>
                                        {msg.metadata
                                          ? JSON.parse(msg.metadata).fileName
                                          : "Audio.mp3"}
                                      </span>
                                      <span className="text-xs text-gray-500 font-normal">
                                        {msg.metadata
                                          ? (() => {
                                              const fileSize = JSON.parse(
                                                msg.metadata
                                              ).fileSize;
                                              const fileSizeKB =
                                                fileSize / 1024;
                                              if (fileSizeKB < 1024) {
                                                return (
                                                  fileSizeKB.toFixed(2) + " KB"
                                                );
                                              } else {
                                                return (
                                                  (fileSizeKB / 1024).toFixed(
                                                    2
                                                  ) + " MB"
                                                );
                                              }
                                            })()
                                          : ""}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <a
                                href={msg.url || msg.content}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                {msg.metadata &&
                                  (() => {
                                    const metadata = JSON.parse(msg.metadata);
                                    const fileName = metadata.fileName || "";
                                    const fileExt = fileName
                                      .split(".")
                                      .pop()
                                      .toLowerCase();

                                    if (fileExt === "pdf") {
                                      return (
                                        <FaFilePdf
                                          className="text-red-500"
                                          size={24}
                                        />
                                      );
                                    } else if (
                                      fileExt === "xlsx" ||
                                      fileExt === "xls"
                                    ) {
                                      return (
                                        <FaFileExcel
                                          className="text-green-600"
                                          size={24}
                                        />
                                      );
                                    } else if (
                                      fileExt === "pptx" ||
                                      fileExt === "ppt"
                                    ) {
                                      return (
                                        <FaFilePowerpoint
                                          className="text-orange-600"
                                          size={24}
                                        />
                                      );
                                    } else if (
                                      fileExt === "docx" ||
                                      fileExt === "doc"
                                    ) {
                                      return (
                                        <FaFileWord
                                          className="text-blue-500"
                                          size={24}
                                        />
                                      );
                                    } else if (
                                      [
                                        "js",
                                        "ts",
                                        "jsx",
                                        "tsx",
                                        "html",
                                        "css",
                                        "json",
                                      ].includes(fileExt)
                                    ) {
                                      return (
                                        <FaFileCode
                                          className="text-purple-500"
                                          size={24}
                                        />
                                      );
                                    } else if (fileExt === "csv") {
                                      return (
                                        <FaFileCsv
                                          className="text-green-600"
                                          size={24}
                                        />
                                      );
                                    } else if (fileExt === "txt") {
                                      return (
                                        <BsFiletypeTxt
                                          className="text-blue-500"
                                          size={24}
                                        />
                                      );
                                    } else if (
                                      fileExt === "zip" ||
                                      fileExt === "rar"
                                    ) {
                                      return (
                                        <FaFileArchive
                                          className={`${
                                            fileExt === "zip"
                                              ? "text-yellow-600"
                                              : "text-purple-500"
                                          }`}
                                          size={24}
                                        />
                                      );
                                    } else {
                                      return (
                                        <FaFile
                                          className="text-gray-500"
                                          size={24}
                                        />
                                      );
                                    }
                                  })()}
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {msg.metadata
                                      ? JSON.parse(msg.metadata).fileName
                                      : "File"}
                                  </span>
                                  <span className="text-xs text-gray-500 mt-0.5">
                                    {msg.metadata
                                      ? (() => {
                                          const fileSize = JSON.parse(
                                            msg.metadata
                                          ).fileSize;
                                          // Chuyển đổi sang KB
                                          const fileSizeKB = fileSize / 1024;

                                          // Nếu nhỏ hơn 1MB (1024KB)
                                          if (fileSizeKB < 1024) {
                                            return (
                                              fileSizeKB.toFixed(2) + " KB"
                                            );
                                          }
                                          // Nếu lớn hơn hoặc bằng 1MB
                                          else {
                                            return (
                                              (fileSizeKB / 1024).toFixed(2) +
                                              " MB"
                                            );
                                          }
                                        })()
                                      : ""}
                                  </span>
                                </div>
                              </a>
                            );
                          })()
                        )
                      ) : (
                        <div className="flex flex-col">
                          {!isSender && chatUser?.isGroup && (
                            <span className="text-[11px] text-[#707c8f] select-none cursor-pointer">
                              {msg.sender?.name}
                            </span>
                          )}
                          <span className="text-sm text-[#081b3a]">
                            {msg.content}
                          </span>
                        </div>
                      )}

                      <div className="text-xs text-[#44546f] font-[400] mt-1 select-none">
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString(
                              "vi-VN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                          : "Vừa gửi"}
                      </div>
                    </div>

                    {/* Icon thả tim */}
                    {!msg.isDeleted && (
                      <div
                        className={`absolute -bottom-3 -right-0 z-10 hover:scale-110 transition-all duration-300 ${
                          likedMessages[msg.messageId || idx]
                            ? "flex"
                            : "hidden group-hover:flex"
                        }`}
                      >
                        <div
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-white shadow-md cursor-pointer hover:bg-gray-100"
                          onClick={() =>
                            handleLikeMessage(msg.messageId || idx)
                          }
                        >
                          {currentUserHasReacted ? (
                            <AiFillHeart className="text-red-500" size={19} />
                          ) : (
                            <HeartOutlined className="text-red-500" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Hiển thị số lượng tim đã được thả */}
                    {likedMessages[msg.messageId || idx] && (
                      <div
                        className="absolute -bottom-3 right-7 p-0.5 bg-white shadow-lg rounded-xl flex items-center cursor-pointer z-5"
                        onClick={() =>
                          handleOpenReactionModal(msg.messageId || idx)
                        }
                      >
                        <AiFillHeart className="text-red-500" size={19} />
                        <span className="text-xs select-none">
                          {likedMessages[msg.messageId || idx]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef}></div>
          </div>
        </div>

        {chatUserTyping ? (
          <span className="text-black-500 text-sm bg-[#ebecf0] pl-3">
            <span className="animate-pulse">
              {chatUser.fullName} đang nhập...
            </span>
          </span>
        ) : null}

        <div className="bg-white">
          <div className="border-t border-[#00000026] flex items-center gap-2 px-2 text-[#0f182e]">
            <button
              className={`hover:bg-gray-100 p-2 rounded cursor-pointer ${
                !chatUser?.isFriend &&
                !chatUser?.isGroup &&
                "opacity-50 cursor-not-allowed"
              }`}
              disabled={!chatUser?.isFriend && !chatUser?.isGroup}
            >
              <LuSticker size={23} />
            </button>
            <button
              className={`hover:bg-gray-100 p-2 rounded cursor-pointer ${
                !chatUser?.isFriend &&
                !chatUser?.isGroup &&
                "opacity-50 cursor-not-allowed"
              }`}
              onClick={() => {
                if (chatUser?.isFriend || chatUser?.isGroup) {
                  console.log("Nút chọn ảnh được click");
                  if (imageInputRef.current) {
                    console.log("Mở hộp thoại chọn file");
                    imageInputRef.current.click();
                  } else {
                    console.log("imageInputRef.current là null");
                  }
                }
              }}
              disabled={!chatUser?.isFriend && !chatUser?.isGroup}
            >
              <FaRegImage size={20} />
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  console.log("onChange của input file được kích hoạt");
                  handleImageSelect(e);
                }}
                className="hidden"
              />
            </button>
            <button
              className={`hover:bg-gray-100 p-2 rounded cursor-pointer ${
                !chatUser?.isFriend &&
                !chatUser?.isGroup &&
                "opacity-50 cursor-not-allowed"
              }`}
              onClick={() =>
                (chatUser?.isFriend || chatUser?.isGroup) &&
                fileInputRef.current?.click()
              }
              disabled={!chatUser?.isFriend && !chatUser?.isGroup}
            >
              <GoPaperclip size={20} />
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />
            </button>
            <button
              className={`hover:bg-gray-100 p-2 rounded cursor-pointer ${
                !chatUser?.isFriend &&
                !chatUser?.isGroup &&
                "opacity-50 cursor-not-allowed"
              }`}
              disabled={!chatUser?.isFriend && !chatUser?.isGroup}
            >
              <RiMoreLine size={23} />
            </button>
          </div>

          <div className="p-2 border-t border-[#00000026] bg-white flex items-center gap-1">
            <input
              ref={messageInputRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={!chatUser?.isFriend && !chatUser?.isGroup}
              className="flex-1 px-3 py-[6px] rounded-full outline-none text-md text-[#081b3a] placeholder:text-[#647187] disabled:cursor-not-allowed"
              placeholder={
                chatUser?.isFriend || chatUser?.isGroup
                  ? `Nhập @, tin nhắn tới ${chatUser.fullName}`
                  : "Hãy kết bạn để nhắn tin"
              }
            />

            <div className="relative">
              <button
                className={`emoji-button text-[#081b3a] text-lg hover:bg-gray-100 p-1 rounded-full cursor-pointer ${
                  !chatUser?.isFriend &&
                  !chatUser?.isGroup &&
                  "opacity-50 cursor-not-allowed"
                }`}
                disabled={!chatUser?.isFriend && !chatUser?.isGroup}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <PiSmiley size={24} />
              </button>

              {showEmojiPicker && (
                <EmojiPicker onSelectEmoji={handleEmojiSelect} />
              )}
            </div>

            {(chatUser?.isFriend || chatUser?.isGroup) &&
              (newMessage.trim() === "" && !pastedImage ? (
                <button
                  onClick={handleSendLike}
                  className="text-[#081b3a] text-lg hover:bg-gray-100 p-1 rounded-full cursor-pointer"
                >
                  <AiFillLike size={24} color="#f8ca67" />
                </button>
              ) : (
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() && !pastedImage}
                  className={`text-blue-600 hover:bg-blue-50 p-2 rounded-full cursor-pointer ${
                    !newMessage.trim() &&
                    !pastedImage &&
                    "opacity-50 cursor-not-allowed"
                  }`}
                >
                  <IoSend size={20} />
                </button>
              ))}
          </div>

          {/* Hiển thị xem trước ảnh nếu có */}
          {pastedImage && (
            <div className="relative px-4 pt-3 border-t border-[#00000026] bg-white">
              <div className="relative inline-block max-w-[140px] rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={pastedImage.previewUrl}
                  alt="Pasted"
                  className="max-h-[140px] object-contain cursor-pointer"
                  onClick={() => setSelectedImage(pastedImage.previewUrl)}
                />
                <button
                  className="absolute top-1 right-1 cursor-pointer bg-gray-800 bg-opacity-70 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-opacity-100"
                  onClick={clearPastedImage}
                >
                  <CloseOutlined />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ReactionModal
        isOpen={showReactionModal}
        onClose={() => setShowReactionModal(false)}
        data={selectedMessageReactions}
        userDetails={reactedUserDetails}
      />

      <ImageViewModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        imageUrl={selectedImage}
      />

      <UserInfoModal
        isOpen={isUserInfoModalOpen}
        onClose={handleCloseUserInfo}
        userData={chatUser}
      />

      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={handleCloseCreateGroupModal}
        onCreateGroup={handleCreateGroup}
      />

      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/30">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full flex flex-col items-center animate-fade-in">
            <img
              src={incomingCall.fromAvatar || defaultAvatar}
              alt="Người gọi"
              className="w-20 h-20 rounded-full object-cover mb-4 shadow-md"
            />
            <h3 className="text-xl font-semibold mb-2 text-center">
              {incomingCall.fromName}
            </h3>
            <p className="mb-5 text-gray-600">đang gọi video cho bạn</p>

            <div className="flex gap-5 w-full justify-center">
              <button
                onClick={() => {
                  messageApi.destroy("incoming-call");
                  // Dừng âm thanh cuộc gọi
                  if (ringtoneSoundRef.current) {
                    ringtoneSoundRef.current.pause();
                    ringtoneSoundRef.current.currentTime = 0;
                  }
                  setShowVideoCall({
                    isOpen: true,
                    isCallee: true,
                    offer: incomingCall.offer,
                    from: incomingCall.from,
                    callId: incomingCall.callId,
                  });
                  setIncomingCall(null); // Clear state khi đã accept
                }}
                className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium cursor-pointer flex items-center justify-center transition-colors shadow-md"
              >
                <IoVideocam className="mr-2" size={20} />
                Chấp nhận
              </button>
              <button
                onClick={() => {
                  // Khi người nhận (callee) nhấn nút từ chối
                  console.log(
                    "[CHAT] Gửi reject-call, người nhận từ chối:",
                    incomingCall
                  );
                  console.log(
                    "[CHAT] Socket connected:",
                    socket.connected,
                    "Socket ID:",
                    socket.id
                  );

                  // Dừng âm thanh cuộc gọi
                  if (ringtoneSoundRef.current) {
                    ringtoneSoundRef.current.pause();
                    ringtoneSoundRef.current.currentTime = 0;
                  }

                  // to: ID của người gọi - người cần nhận thông báo từ chối
                  // from: ID của người nhận - người đang từ chối
                  socket.emit("reject-call", {
                    to: incomingCall.from,
                    from: currentUser.userId,
                    reason: "user_rejected",
                  });

                  // Hiển thị thông báo cho người nhận (người từ chối)
                  messageApi.destroy("incoming-call");
                  messageApi.open({
                    type: "error",
                    content: "Bạn đã từ chối cuộc gọi",
                  });
                  setIncomingCall(null);
                }}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium cursor-pointer flex items-center justify-center transition-colors shadow-md"
              >
                <FaPhoneSlash className="mr-2" size={18} />
                Từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      <VideoCallModal
        isOpen={showVideoCall.isOpen}
        isCallee={showVideoCall.isCallee}
        offer={showVideoCall.offer}
        from={showVideoCall.from}
        callId={showVideoCall.callId}
        onClose={() => {
          console.log(
            "[CHAT] Đóng VideoCallModal và thiết lập lại toàn bộ trạng thái"
          );
          setShowVideoCall({
            isOpen: false,
            isCallee: false,
            offer: null,
            from: null,
            callId: null,
          });
          setIncomingCall(null);
          messageApi.destroy(); // Đảm bảo clear popup khi đóng modal
        }}
        receiver={chatUser}
        onCallAccepted={() => {
          console.log("Cuộc gọi được chấp nhận");
          setIncomingCall(null);
          messageApi.destroy();
        }}
        onCallRejected={() => {
          console.log("Cuộc gọi bị từ chối");
          setShowVideoCall({
            isOpen: false,
            isCallee: false,
            offer: null,
            from: null,
            callId: null,
          });
          setIncomingCall(null);
          messageApi.destroy();
        }}
      />

      {isChatInfoOpen && !showAllMedia && !showMembersSidebar && (
        <div className="h-full w-[340px] bg-white border-l border-gray-200 flex flex-col shadow-lg z-10 transition-all duration-200 p-0">
          {/* Tiêu đề */}
          <div className="text-lg font-medium text-center py-5.5 border-b border-gray-200 select-none">
            {chatUser?.isGroup ? "Thông tin nhóm" : "Thông tin hội thoại"}
          </div>
          {/* Nội dung scroll được */}
          <div className="flex-1 overflow-y-auto">
            {/* Avatar + tên + nút sửa */}
            <div className="flex flex-col items-center mt-6 mb-2">
              <div className="relative">
                <img
                  src={chatUser?.avatar || defaultAvatar}
                  alt="avatar"
                  className="w-14 h-14 rounded-full object-cover border border-gray-200 shadow-sm mx-auto"
                />
              </div>
              <div className="mt-2 mb-1 w-full flex justify-center">
                <span className="inline-flex items-center justify-center font-semibold text-[18px] text-center select-none">
                  {chatUser?.fullName}
                  <span className="ml-[10px] cursor-pointer text-[#081b3a] bg-[#e5e7eb] hover:bg-[#afb5c1] p-1.5 rounded-full transition-colors flex items-center">
                    <LuPen size={12} />
                  </span>
                </span>
              </div>
            </div>
            {/* 3 nút chức năng chính */}
            {chatUser?.isGroup ? (
              <div className="flex justify-center gap-6 mt-1 pb-4 border-b-8 border-[#ebecf0] px-4">
                <div className="flex flex-col items-center group w-16">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#e5e7eb] hover:bg-[#afb5c1] transition-colors cursor-pointer">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                      <path
                        d="M12 19a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6V9a6 6 0 1 0-12 0v4a2 2 0 0 1-2 2h16a2 2 0 0 1-2-2Z"
                        stroke="#344054"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                  <span className="text-xs text-[#1a2233] mt-1 text-center select-none">
                    Tắt thông báo
                  </span>
                </div>
                <div className="flex flex-col items-center group w-16">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#e5e7eb] hover:bg-[#afb5c1] transition-colors cursor-pointer">
                    <BsPinAngle size={18} />
                  </div>
                  <span className="text-xs text-[#1a2233] mt-1 text-center select-none">
                    Ghim hội thoại
                  </span>
                </div>
                <div className="flex flex-col items-center group w-16">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-[#e5e7eb] hover:bg-[#afb5c1] transition-colors cursor-pointer"
                    onClick={() => setIsAddMemberModalOpen(true)}
                  >
                    <AiOutlineUsergroupAdd size={20} />
                  </div>
                  <span className="text-xs text-[#1a2233] mt-1 text-center select-none">
                    Thêm thành viên
                  </span>
                </div>
                <div className="flex flex-col items-center group w-16">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#e5e7eb] hover:bg-[#afb5c1] transition-colors cursor-pointer">
                    <IoSettingsOutline />
                  </div>
                  <span className="text-xs text-[#1a2233] mt-1 text-center select-none">
                    Quản lý nhóm
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center gap-6 mt-1 pb-4 border-b-8 border-[#ebecf0]">
                <div className="flex flex-col items-center group w-16">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#e5e7eb] hover:bg-[#afb5c1] transition-colors cursor-pointer">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                      <path
                        d="M12 19a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6V9a6 6 0 1 0-12 0v4a2 2 0 0 1-2 2h16a2 2 0 0 1-2-2Z"
                        stroke="#344054"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                  <span className="text-xs text-[#1a2233] mt-1 text-center select-none">
                    Tắt thông báo
                  </span>
                </div>
                <div className="flex flex-col items-center group w-16">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#e5e7eb] hover:bg-[#afb5c1] transition-colors cursor-pointer">
                    <BsPinAngle size={18} />
                  </div>
                  <span className="text-xs text-[#1a2233] mt-1 text-center select-none">
                    Ghim hội thoại
                  </span>
                </div>
                <div className="flex flex-col items-center group w-16">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#e5e7eb] hover:bg-[#afb5c1] transition-colors cursor-pointer">
                    <AiOutlineUsergroupAdd size={20} />
                  </div>
                  <span className="text-xs text-[#1a2233] mt-1 text-center select-none">
                    Tạo nhóm trò chuyện
                  </span>
                </div>
              </div>
            )}
            {/* Thành viên nhóm */}
            {chatUser.isGroup && (
              <div className="px-0">
                <div className="flex items-center justify-between py-2 px-4">
                  <span className="font-semibold text-[15px]">
                    Thành viên nhóm
                  </span>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <path d="M6 9l6 6 6-6" stroke="#5a6981" strokeWidth="2" />
                  </svg>
                </div>
                <div
                  className="flex items-center py-3 px-4 border-b-8 border-gray-100 cursor-pointer hover:bg-[#f1f2f4] transition-colors"
                  onClick={() => setShowMembersSidebar(true)}
                >
                  <LuUsersRound />
                  <span className="ml-3 text-[15px] text-[#06132b] font-md">
                    {chatUser.participants?.length} thành viên
                  </span>
                </div>
              </div>
            )}
            {/* Danh sách nhắc hẹn + nhóm chung */}
            <div className="px-0">
              {chatUser.isGroup && (
                <div className="flex items-center justify-between py-2 px-4">
                  <span className="font-semibold text-[15px]">
                    Bảng tin nhóm
                  </span>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <path d="M6 9l6 6 6-6" stroke="#5a6981" strokeWidth="2" />
                  </svg>
                </div>
              )}

              <div className="flex items-center py-3.5 px-4 cursor-pointer hover:bg-[#f1f2f4] transition-colors">
                <LuClock4 size={20} />
                <span className="ml-3 text-[15px] text-[#06132b] font-md">
                  Danh sách nhắc hẹn
                </span>
              </div>
              <div className="flex items-center py-3 px-4 border-b-8 border-gray-100 cursor-pointer hover:bg-[#f1f2f4] transition-colors">
                {chatUser?.isGroup ? (
                  <CgFileDocument size={20} />
                ) : (
                  <LuUsersRound size={20} />
                )}
                <span className="ml-3 text-[15px] text-[#06132b] font-md">
                  {chatUser?.isGroup
                    ? "Ghi chú, ghim, bình chọn"
                    : "57 nhóm chung"}
                </span>
              </div>
            </div>
            {/* Ảnh/Video */}
            <div className="mt-2 px-4 border-b-8 border-[#ebecf0]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-[15px]">Ảnh/Video</span>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                  <path d="M6 9l6 6 6-6" stroke="#5a6981" strokeWidth="2" />
                </svg>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {messages
                  .filter(
                    (m) =>
                      m.type === "image" ||
                      (typeof m.content === "string" &&
                        (m.content.endsWith(".jpg") ||
                          m.content.endsWith(".png") ||
                          m.content.endsWith(".jpeg") ||
                          m.content.endsWith(".gif")))
                  )
                  .slice(-8)
                  .reverse()
                  .map((m, idx) => (
                    <img
                      key={idx}
                      src={m.content}
                      alt="media"
                      className="w-[64px] h-[64px] object-cover rounded-[8px] cursor-pointer border border-gray-200"
                      onClick={() => setSelectedImage(m.content)}
                    />
                  ))}
                {messages.filter(
                  (m) =>
                    m.type === "image" ||
                    (typeof m.content === "string" &&
                      (m.content.endsWith(".jpg") ||
                        m.content.endsWith(".png") ||
                        m.content.endsWith(".jpeg") ||
                        m.content.endsWith(".gif")))
                ).length === 0 && (
                  <div className="col-span-4 text-gray-400 text-xs text-center">
                    Chưa có ảnh/video
                  </div>
                )}
              </div>
              {messages.filter(
                (m) =>
                  m.type === "image" ||
                  (typeof m.content === "string" &&
                    (m.content.endsWith(".jpg") ||
                      m.content.endsWith(".png") ||
                      m.content.endsWith(".jpeg") ||
                      m.content.endsWith(".gif")))
              ).length > 0 && (
                <button
                  className="w-full py-[6px] mb-4 mt-2 rounded-lg bg-gray-100 text-[#06132b] font-medium hover:bg-gray-200 transition-colors text-[15px] cursor-pointer"
                  onClick={() => {
                    setShowAllMedia(true);
                    setTabActive("media");
                  }}
                >
                  Xem tất cả
                </button>
              )}
            </div>
            {/* File */}
            <div className="mt-4 px-4 border-b-8 border-[#ebecf0]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-[15px]">File</span>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                  <path d="M6 9l6 6 6-6" stroke="#5a6981" strokeWidth="2" />
                </svg>
              </div>
              {(() => {
                const files = messages
                  .filter((m) => m.type === "file")
                  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                if (files.length === 0) {
                  return (
                    <div className="text-gray-400 text-xs py-2 border-t border-gray-100">
                      Chưa có File được chia sẻ từ sau 23/05/2025.
                    </div>
                  );
                }
                return (
                  <>
                    <div className="flex flex-col gap-2">
                      {files.slice(0, 3).map((m, idx) => {
                        let fileName = "";
                        let fileSize = "";
                        let fileExt = "";
                        let createdAt = "";
                        try {
                          const meta = m.metadata
                            ? typeof m.metadata === "string"
                              ? JSON.parse(m.metadata)
                              : m.metadata
                            : {};
                          fileName = meta.fileName || "File";
                          fileExt = fileName.split(".").pop().toLowerCase();
                          const size = meta.fileSize || 0;
                          fileSize =
                            size < 1024 * 1024
                              ? (size / 1024).toFixed(2) + " KB"
                              : (size / 1024 / 1024).toFixed(2) + " MB";
                          if (m.createdAt) {
                            const d = new Date(m.createdAt);
                            createdAt = d.toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            });
                          }
                        } catch (e) {
                          console.error("Error parsing metadata:", e);
                          // ignore error, fallback to default values
                        }
                        let icon = (
                          <FaFile className="text-blue-400" size={28} />
                        );
                        if (["docx", "doc"].includes(fileExt))
                          icon = (
                            <FaFileWord className="text-blue-500" size={28} />
                          );
                        else if (["pdf"].includes(fileExt))
                          icon = (
                            <FaFilePdf className="text-red-500" size={28} />
                          );
                        else if (["xlsx", "xls"].includes(fileExt))
                          icon = (
                            <FaFileExcel className="text-green-600" size={28} />
                          );
                        else if (["pptx", "ppt"].includes(fileExt))
                          icon = (
                            <FaFilePowerpoint
                              className="text-orange-600"
                              size={28}
                            />
                          );
                        else if (["zip", "rar"].includes(fileExt))
                          icon = (
                            <FaFileArchive
                              className="text-purple-500"
                              size={28}
                            />
                          );
                        else if (["csv"].includes(fileExt))
                          icon = (
                            <FaFileCsv className="text-green-600" size={28} />
                          );
                        else if (
                          [
                            "js",
                            "ts",
                            "jsx",
                            "tsx",
                            "html",
                            "css",
                            "json",
                          ].includes(fileExt)
                        )
                          icon = (
                            <FaFileCode className="text-purple-500" size={28} />
                          );
                        else if (["txt"].includes(fileExt))
                          icon = (
                            <BsFiletypeTxt
                              className="text-blue-500"
                              size={28}
                            />
                          );
                        return (
                          <a
                            key={idx}
                            href={m.url || m.content}
                            download
                            target="_blank"
                            className="flex items-center gap-2 bg-white rounded-lg px-2 py-1 border border-gray-100 hover:bg-[#f1f2f4] transition-colors mb-4"
                            title={fileName}
                          >
                            <div>{icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-[#1a2233] truncate text-sm">
                                {fileName}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                {fileSize}
                                {createdAt && (
                                  <span className="ml-2">{createdAt}</span>
                                )}
                              </div>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                    {files.length > 3 && (
                      <button
                        className="w-full py-[6px] mb-4 mt-3 rounded-lg bg-gray-100 text-[#06132b] font-medium hover:bg-gray-200 transition-colors text-[15px] cursor-pointer"
                        onClick={() => {
                          setIsChatInfoOpen(true);
                          setShowAllMedia(true);
                          setTabActive("files");
                        }}
                      >
                        Xem tất cả
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
            {/* Rời nhóm */}
            <div className="px-0">
              <div className="flex items-center py-3.5 px-4 cursor-pointer hover:bg-[#f1f2f4] transition-colors">
                <IoWarningOutline size={20} />
                <span className="ml-3 text-[15px] text-[#06132b] font-md">
                  Báo xấu
                </span>
              </div>
              <div className="flex items-center py-3 px-4 cursor-pointer hover:bg-[#f1f2f4] transition-colors">
                <AiOutlineDelete size={20} className="text-[#c31818]" />
                <span className="ml-3 text-[15px] text-[#c31818] font-md">
                  Xóa lịch sử trò chuyện
                </span>
              </div>
              {chatUser?.isGroup && (
                <div
                  className="flex items-center py-3 px-4 cursor-pointer hover:bg-[#f1f2f4] transition-colors"
                  onClick={handleLeaveGroup}
                >
                  <IoLogOutOutline size={20} className="text-[#c31818]" />
                  <span className="ml-3 text-[15px] text-[#c31818] font-md">
                    Rời nhóm
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {isChatInfoOpen && showAllMedia && (
        <div className="h-full w-[340px] bg-white border-l border-gray-200 flex flex-col shadow-lg z-10 transition-all duration-200 p-0">
          {/* Header Kho lưu trữ */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <button
              onClick={() => setShowAllMedia(false)}
              className="p-1 rounded hover:bg-gray-100 cursor-pointer"
            >
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                <path
                  d="M15 19l-7-7 7-7"
                  stroke="#344054"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <span className="text-lg font-semibold text-center flex-1">
              Kho lưu trữ
            </span>
            <span className="w-6"></span>
          </div>
          {/* Tabs */}
          <div className="flex items-center justify-between w-full border-b-8 border-[#ebecf0] px-4 pb-0.5">
            <button
              className={`py-3 px-3 w-1/2 text-sm font-medium border-b-2 cursor-pointer transition-colors ${
                tabActive === "media"
                  ? "text-[#0068ff] border-[#0068ff] bg-white"
                  : "text-[#44546f] border-transparent bg-transparent hover:text-[#0068ff]"
              }`}
              onClick={() => setTabActive("media")}
            >
              Ảnh
            </button>
            <button
              className={`py-3 px-3 w-1/2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                tabActive === "files"
                  ? "text-[#0068ff] border-[#0068ff] bg-white"
                  : "text-[#44546f] border-transparent bg-transparent hover:text-[#0068ff]"
              }`}
              onClick={() => setTabActive("files")}
            >
              Files
            </button>
          </div>
          {/* Nội dung tab */}
          <div className="flex-1 overflow-y-auto p-4 bg-[#f7f8fa]">
            {tabActive === "media" &&
              // ... grid ảnh/video phân loại theo ngày như cũ ...
              (() => {
                const media = messages
                  .filter(
                    (m) =>
                      m.type === "image" ||
                      (typeof m.content === "string" &&
                        (m.content.endsWith(".jpg") ||
                          m.content.endsWith(".png") ||
                          m.content.endsWith(".jpeg") ||
                          m.content.endsWith(".gif")))
                  )
                  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                const groupByDay = {};
                media.forEach((m) => {
                  const date = m.createdAt ? new Date(m.createdAt) : new Date();
                  const key = `${date.getFullYear()}-${
                    date.getMonth() + 1
                  }-${date.getDate()}`;
                  if (!groupByDay[key]) groupByDay[key] = [];
                  groupByDay[key].push(m);
                });
                const dayKeys = Object.keys(groupByDay).sort(
                  (a, b) => new Date(b) - new Date(a)
                );
                if (dayKeys.length === 0) {
                  return (
                    <div className="text-gray-400 text-xs text-center py-8">
                      Chưa có ảnh/video
                    </div>
                  );
                }
                return dayKeys.map((dayKey) => {
                  const [year, month, day] = dayKey.split("-");
                  const dateObj = new Date(
                    `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
                  );
                  const dayLabel = `Ngày ${dateObj.getDate()} Tháng ${
                    dateObj.getMonth() + 1
                  }`;
                  return (
                    <div key={dayKey} className="mb-4">
                      <div className="text-[15px] font-semibold text-[#222] mb-2">
                        {dayLabel}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {groupByDay[dayKey].map((m, idx) => (
                          <img
                            key={idx}
                            src={m.content}
                            alt="media"
                            className="w-full h-[90px] object-cover rounded cursor-pointer border border-gray-200"
                            onClick={() => setSelectedImage(m.content)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            {tabActive === "files" && (
              <div>
                {/* Danh sách file group theo ngày */}
                {(() => {
                  const files = messages
                    .filter((m) => m.type === "file")
                    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                  const groupByDay = {};
                  files.forEach((m) => {
                    const date = m.createdAt
                      ? new Date(m.createdAt)
                      : new Date();
                    const key = `${date.getFullYear()}-${
                      date.getMonth() + 1
                    }-${date.getDate()}`;
                    if (!groupByDay[key]) groupByDay[key] = [];
                    groupByDay[key].push(m);
                  });
                  const dayKeys = Object.keys(groupByDay).sort(
                    (a, b) => new Date(b) - new Date(a)
                  );
                  if (dayKeys.length === 0) {
                    return (
                      <div className="text-gray-400 text-xs text-center py-8">
                        Chưa có file nào
                      </div>
                    );
                  }
                  return dayKeys.map((dayKey) => {
                    const [year, month, day] = dayKey.split("-");
                    const dateObj = new Date(
                      `${year}-${month.padStart(2, "0")}-${day.padStart(
                        2,
                        "0"
                      )}`
                    );
                    const dayLabel = `Ngày ${dateObj.getDate()} Tháng ${
                      dateObj.getMonth() + 1
                    }`;
                    return (
                      <div key={dayKey} className="mb-4">
                        <div className="text-[15px] font-semibold text-[#222] mb-2">
                          {dayLabel}
                        </div>
                        <div className="flex flex-col gap-3">
                          {groupByDay[dayKey].map((m, idx) => {
                            let fileName = "";
                            let fileSize = "";
                            let fileExt = "";
                            try {
                              const meta = m.metadata
                                ? typeof m.metadata === "string"
                                  ? JSON.parse(m.metadata)
                                  : m.metadata
                                : {};
                              fileName = meta.fileName || "File";
                              fileExt = fileName.split(".").pop().toLowerCase();
                              const size = meta.fileSize || 0;
                              fileSize =
                                size < 1024 * 1024
                                  ? (size / 1024).toFixed(2) + " KB"
                                  : (size / 1024 / 1024).toFixed(2) + " MB";
                            } catch (error) {
                              console.error("Error parsing metadata:", error);
                            }
                            // Chọn icon theo loại file
                            let icon = (
                              <FaFile className="text-blue-400" size={32} />
                            );
                            if (["docx", "doc"].includes(fileExt))
                              icon = (
                                <FaFileWord
                                  className="text-blue-500"
                                  size={32}
                                />
                              );
                            else if (["pdf"].includes(fileExt))
                              icon = (
                                <FaFilePdf className="text-red-500" size={32} />
                              );
                            else if (["xlsx", "xls"].includes(fileExt))
                              icon = (
                                <FaFileExcel
                                  className="text-green-600"
                                  size={32}
                                />
                              );
                            else if (["pptx", "ppt"].includes(fileExt))
                              icon = (
                                <FaFilePowerpoint
                                  className="text-orange-600"
                                  size={32}
                                />
                              );
                            else if (["zip", "rar"].includes(fileExt))
                              icon = (
                                <FaFileArchive
                                  className="text-purple-500"
                                  size={32}
                                />
                              );
                            else if (["csv"].includes(fileExt))
                              icon = (
                                <FaFileCsv
                                  className="text-green-600"
                                  size={32}
                                />
                              );
                            else if (
                              [
                                "js",
                                "ts",
                                "jsx",
                                "tsx",
                                "html",
                                "css",
                                "json",
                              ].includes(fileExt)
                            )
                              icon = (
                                <FaFileCode
                                  className="text-purple-500"
                                  size={32}
                                />
                              );
                            else if (["txt"].includes(fileExt))
                              icon = (
                                <BsFiletypeTxt
                                  className="text-blue-500"
                                  size={32}
                                />
                              );
                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-gray-100 shadow-sm"
                              >
                                <div>{icon}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-[#1a2233] truncate">
                                    {fileName}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                    {fileSize}
                                    <a
                                      href={m.url || m.content}
                                      download
                                      target="_blank"
                                      className="text-[#0068ff] hover:underline ml-2"
                                    >
                                      Tải về để xem lâu dài
                                    </a>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      )}
      {isChatInfoOpen && !showAllMedia && showMembersSidebar && (
        <div className="h-full w-[340px] bg-white border-l border-gray-200 flex flex-col shadow-lg z-10 transition-all duration-200 p-0">
          {/* Header Thành viên */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <button
              onClick={() => setShowMembersSidebar(false)}
              className="p-1 rounded hover:bg-gray-100 cursor-pointer"
            >
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                <path
                  d="M15 19l-7-7 7-7"
                  stroke="#344054"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <span className="text-lg font-semibold text-center flex-1">
              Thành viên
            </span>
            <span className="w-6"></span>
          </div>
          {/* Nút Thêm thành viên */}
          <button
            className="mx-4 my-3 w-[90%] py-1.5 rounded-lg text-md bg-[#f1f2f4] text-[#06132b] font-medium flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors cursor-pointer"
            onClick={() => setIsAddMemberModalOpen(true)}
          >
            <AiOutlineUsergroupAdd size={20} /> Thêm thành viên
          </button>
          {/* Danh sách thành viên */}
          <div className="flex-1 overflow-y-auto px-4">
            <div className="text-[15px] text-[#081b3a] font-semibold mb-3 mt-3 select-none">
              Danh sách thành viên ({chatUser.participants?.length || 0})
            </div>
            <div className="flex flex-col gap-2">
              {(() => {
                if (!chatUser.participants) return null;
                // Đưa trưởng nhóm lên đầu danh sách
                const sortedMembers = [...chatUser.participants].sort(
                  (a, b) => {
                    if (a.userId === chatUser.admin) return -1;
                    if (b.userId === chatUser.admin) return 1;
                    return 0;
                  }
                );
                return sortedMembers.map((member, idx) => {
                  const isCurrentUser = member.userId === currentUser.userId;
                  const isAdmin = chatUser.admin === currentUser.userId;
                  const isMemberAdmin = chatUser.admin === member.userId;
                  // Xác định có hiển thị 3 chấm không
                  let showMenuBtn = false;
                  if (isCurrentUser) showMenuBtn = true;
                  else if (isAdmin && !isMemberAdmin) showMenuBtn = true;
                  // Chỉ hiện menu khi hover đúng item
                  return (
                    <div
                      key={member.userId || idx}
                      className="flex items-center gap-3 py-2 rounded-lg hover:bg-[#f7f8fa] transition-colors cursor-pointer relative"
                      onMouseEnter={() => setHoveredMemberIdx(idx)}
                      onMouseLeave={() => {
                        setHoveredMemberIdx(null);
                        setOpenMenuIdx(null);
                      }}
                    >
                      <div className="relative">
                        <img
                          src={member.avatar || defaultAvatar}
                          alt={member.fullName}
                          className="w-11 h-11 rounded-full object-cover border border-gray-200"
                        />
                        {isMemberAdmin && (
                          <span className="absolute -bottom-0 right-0 bg-white rounded-full p-[2px] shadow">
                            <IoKeySharp className="text-[#f7b500]" size={14} />
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium text-[#06132b] truncate">
                          {isCurrentUser ? "Bạn" : member.fullName}
                        </span>
                        {isMemberAdmin && (
                          <span className="text-xs text-[#081b3a] font-semibold">
                            Trưởng nhóm
                          </span>
                        )}
                      </div>
                      {/* Nút 3 chấm */}
                      {showMenuBtn && hoveredMemberIdx === idx && (
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuIdx(idx);
                          }}
                        >
                          <svg
                            width="22"
                            height="22"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle cx="5" cy="12" r="2" fill="#1a2233" />
                            <circle cx="12" cy="12" r="2" fill="#1a2233" />
                            <circle cx="19" cy="12" r="2" fill="#1a2233" />
                          </svg>
                        </button>
                      )}
                      {/* Menu popup */}
                      {openMenuIdx === idx && (
                        <div className="absolute right-2 -bottom-7 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[120px]">
                          {isCurrentUser ? (
                            <button
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-[#c31818] cursor-pointer"
                              onClick={() => {
                                handleLeaveGroup();
                                setOpenMenuIdx(null);
                              }}
                            >
                              Rời nhóm
                            </button>
                          ) : isAdmin ? (
                            <button
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-[#c31818] cursor-pointer"
                              onClick={() => {
                                handleRemoveMember(member);
                                setOpenMenuIdx(null);
                              }}
                            >
                              Xóa khỏi nhóm
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onAddMembers={() => {
          // TODO: Xử lý thêm thành viên vào nhóm ở đây
          setIsAddMemberModalOpen(false);
        }}
        friends={currentUser?.contactsData || []}
        recentMembers={chatUser.participants?.slice(1, 4) || []}
        groupParticipants={chatUser.participants || []}
        conversationId={id}
      />
      <Modal
        open={removeMemberModal.open}
        onCancel={() => setRemoveMemberModal({ open: false, member: null })}
        onOk={confirmRemoveMember}
        okButtonProps={{
          danger: true,
          loading: isRemovingMember,
          disabled: isRemovingMember,
        }}
        okText="Xác nhận"
        cancelText="Hủy"
        title="Xác nhận xóa thành viên"
        centered
      >
        <div>
          Bạn có chắc chắn muốn xóa thành viên{" "}
          <b>{removeMemberModal.member?.fullName}</b> khỏi nhóm không?
        </div>
      </Modal>
      <Modal
        open={leaveGroupModal}
        onCancel={() => setLeaveGroupModal(false)}
        onOk={confirmTransferAdminAndLeave}
        width={450}
        okButtonProps={{
          disabled:
            (chatUser?.admin === currentUser.userId &&
              chatUser?.participants?.length > 1 &&
              !selectedNewAdmin) ||
            isTransferringAdmin,
          loading: isTransferringAdmin,
          danger: true,
        }}
        okText={
          chatUser?.admin === currentUser.userId &&
          chatUser?.participants?.length > 1
            ? "Chọn và tiếp tục"
            : "Xác nhận"
        }
        cancelText="Hủy"
        title={
          chatUser?.admin === currentUser.userId &&
          chatUser?.participants?.length > 1
            ? "Chọn trưởng nhóm mới trước khi rời"
            : "Xác nhận rời nhóm"
        }
        centered
      >
        {chatUser?.admin === currentUser.userId &&
        chatUser?.participants?.length > 1 ? (
          <div>
            <input
              type="text"
              placeholder="Tìm kiếm"
              className="mt-2 mb-6 px-3 py-1.5 border border-gray-300 rounded-4xl w-full focus:outline-none focus:border-blue-400"
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              autoFocus
            />
            <div className="flex flex-col gap-4 max-h-60 overflow-y-auto">
              {chatUser.participants
                .filter((m) => m.userId !== currentUser.userId)
                .filter((m) =>
                  m.fullName?.toLowerCase().includes(searchMember.toLowerCase())
                )
                .map((member) => (
                  <label
                    key={member.userId}
                    className="flex items-center gap-4 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="newAdmin"
                      value={member.userId}
                      checked={selectedNewAdmin === member.userId}
                      onChange={() => setSelectedNewAdmin(member.userId)}
                      disabled={isTransferringAdmin}
                    />
                    <img
                      src={member.avatar || defaultAvatar}
                      alt={member.fullName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <span>{member.fullName}</span>
                  </label>
                ))}
              {chatUser.participants
                .filter((m) => m.userId !== currentUser.userId)
                .filter((m) =>
                  m.fullName?.toLowerCase().includes(searchMember.toLowerCase())
                ).length === 0 && (
                <div className="text-gray-400 text-sm text-center py-2">
                  Không tìm thấy thành viên phù hợp
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            Bạn có chắc chắn muốn rời khỏi nhóm <b>{chatUser.fullName}</b>{" "}
            không?
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ChatPage;
