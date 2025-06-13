import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoSearchOutline, IoClose } from "react-icons/io5";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import { AiOutlineUserAdd, AiOutlineUsergroupAdd } from "react-icons/ai";
import { BsTelephone } from "react-icons/bs";
import { Spin, Skeleton } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import {
  searchUserByPhoneApi,
  sendFriendRequestApi,
  getConversationsApi,
  getFriendsApi,
} from "../../services/api";
import { useCurrentApp } from "../../contexts/app.context";
import { useSocket } from "../../contexts/socket.context";
import defaultAvatar from "../../assets/images/defaultAvatar.jpg";
import InfoModal from "../../components/modal/info.modal";
import CreateGroupModal from "../modal/group.modal";

const SidebarChatList = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [friends, setFriends] = useState([]);
  const { messageApi, user, setUser } = useCurrentApp();
  const { socket } = useSocket();
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const searchResultRef = useRef(null);

  const handleSearch = useCallback(
    async (phoneNumber) => {
      if (!phoneNumber || phoneNumber.length !== 10) return;

      setLoading(true);
      setError("");
      setSearchResult(null);

      try {
        const res = await searchUserByPhoneApi(phoneNumber);
        if (res.status && res.data) {
          setSearchResult({
            ...res.data,
            isFriend: user?.contacts?.includes(res.data.userId),
          });
        } else {
          setError(
            "Số điện thoại chưa đăng ký tài khoản hoặc không cho phép tìm kiếm."
          );
        }
      } catch (error) {
        console.error("Error searching user:", error);
        setError("Có lỗi xảy ra khi tìm kiếm.");
      } finally {
        setLoading(false);
      }
    },
    [user?.contacts]
  );

  const formatLastMessage = (message) => {
    if (!message || message === "Chưa có tin nhắn") return message;

    if (
      message.includes("cloudfront.net/chatImages") ||
      message.includes("cloudfront.net/chatFiles")
    ) {
      if (
        message.endsWith(".png") ||
        message.endsWith(".jpg") ||
        message.endsWith(".jpeg") ||
        message.endsWith(".gif")
      ) {
        return "Hình ảnh";
      } else if (
        message.endsWith(".mp4") ||
        message.endsWith(".mov") ||
        message.endsWith(".avi")
      ) {
        return "Video";
      }
      return "File";
    }

    return message;
  };

  const fetchAllChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      const response = await getConversationsApi();
      if (response.status && response.data) {
        const sortedChats = response.data.sort((a, b) => {
          const timeA = new Date(
            a.lastMessageTime || a.createdAt || 0
          ).getTime();
          const timeB = new Date(
            b.lastMessageTime || b.createdAt || 0
          ).getTime();
          return timeB - timeA;
        });
        const formattedChats = sortedChats.map((chat) => {
          let formattedLastMsg = chat.lastMsg;
          if (chat.lastMsg && chat.lastMsg !== "Chưa có tin nhắn") {
            if (chat.type === "group") {
              if (!chat.lastMsg.includes(": ")) {
                console.error("Group message without sender:", chat);
              }
              formattedLastMsg = chat.lastMsg
                .split(": ")
                .map((part, index) =>
                  index === 1 ? formatLastMessage(part) : part
                )
                .join(": ");
            } else {
              if (!chat.lastMsg.includes(": ")) {
                formattedLastMsg = formatLastMessage(chat.lastMsg);
              } else {
                const parts = chat.lastMsg.split(": ");
                formattedLastMsg = formatLastMessage(parts[1] || parts[0]);
              }
              if (chat.id === user?.userId) {
                formattedLastMsg = `Bạn: ${formattedLastMsg}`;
              }
            }
          }
          return {
            ...chat,
            lastMsg: formattedLastMsg,
            time: formatTime(chat.lastMessageTime || chat.createdAt),
          };
        });
        setChatList(formattedChats);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoadingChats(false);
    }
  }, [user?.userId]);

  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const response = await getFriendsApi();
      if (response.status && response.data) {
        setFriends(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setLoadingFriends(false);
    }
  };

  useEffect(() => {
    if (phone.length === 10) {
      handleSearch(phone);
    } else if (phone.length > 0) {
      setError(
        "Số điện thoại chưa đăng ký tài khoản hoặc không cho phép tìm kiếm."
      );
      setSearchResult(null);
    }
  }, [phone, handleSearch]);

  useEffect(() => {
    if (!socket) return;

    const updateChatList = (data) => {
      setChatList((prev) => {
        const updatedList = [...prev];
        const chatIndex = updatedList.findIndex(
          (chat) => chat.conversationId === data.conversationId
        );

        if (chatIndex !== -1) {
          const messageContent = formatLastMessage(data.content);

          const updatedChat = {
            ...updatedList[chatIndex],
            lastMsg:
              data.type === "group"
                ? `${data.sender?.name || data.senderName}: ${messageContent}`
                : data.sender?.id === user?.userId
                ? `Bạn: ${messageContent}`
                : messageContent,
            time: formatTime(data.createdAt || Date.now()),
            lastMessageTime: data.createdAt || Date.now(),
            unreadCount:
              data.sender?.id !== user?.userId
                ? (updatedList[chatIndex].unreadCount || 0) + 1
                : updatedList[chatIndex].unreadCount,
          };

          updatedList.splice(chatIndex, 1);
          updatedList.unshift(updatedChat);
        }

        return updatedList;
      });
    };

    const handleNewMessage = (data) => {
      updateChatList(data);
    };

    const handleSentMessage = (data) => {
      updateChatList(data);
    };

    const handleGroupCreated = (data) => {
      const { conversation, participants } = data;
      console.log("Received group-created event:", data);

      const isParticipant = participants.includes(user?.userId);
      if (!isParticipant) {
        console.log("Current user is not a participant, ignoring event");
        return;
      }

      const newChat = {
        ...conversation,
        type: "group",
        time: formatTime(conversation.createdAt || Date.now()),
        lastMessageTime: conversation.createdAt || Date.now(),
        unreadCount: 0,
        lastMsg: "Nhóm mới được tạo",
      };

      setChatList((prev) => {
        const exists = prev.some(
          (chat) => chat.conversationId === conversation.conversationId
        );

        if (exists) {
          return prev.map((chat) =>
            chat.conversationId === conversation.conversationId
              ? { ...chat, ...newChat }
              : chat
          );
        }

        return [newChat, ...prev];
      });
    };

    socket.on("group-created", handleGroupCreated);
    socket.on("receive-message", handleNewMessage);
    socket.on("send-message-success", handleSentMessage);

    return () => {
      socket.off("group-created", handleGroupCreated);
      socket.off("receive-message", handleNewMessage);
      socket.off("send-message-success", handleSentMessage);
    };
  }, [socket, user?.userId, chatList]);

  useEffect(() => {
    if (!socket) return;

    const handleUnfriend = (data) => {
      if (!user?.contacts) return;

      setUser((prev) => {
        const newContacts = prev.contacts.filter((id) => id !== data.friendId);
        return {
          ...prev,
          contacts: newContacts,
        };
      });

      if (searchResult?.userId === data.friendId) {
        setSearchResult((prev) => ({
          ...prev,
          isFriend: false,
        }));
      }
    };

    const handleAcceptFriend = (data) => {
      if (!user?.contacts) return;

      setUser((prev) => ({
        ...prev,
        contacts: [...prev.contacts, data.friendId],
      }));

      if (searchResult?.userId === data.friendId) {
        setSearchResult((prev) => ({
          ...prev,
          isFriend: true,
        }));
      }
    };

    const handleRejectFriend = (data) => {
      if (!searchResult) return;

      if (searchResult.userId === data.by) {
        setSearchResult((prev) => ({
          ...prev,
          isFriend: false,
        }));
      }
    };

    socket.on("friend-removed", handleUnfriend);
    socket.on("friend-request-accepted", handleAcceptFriend);
    socket.on("friend-request-rejected", handleRejectFriend);

    return () => {
      socket.off("friend-removed", handleUnfriend);
      socket.off("friend-request-accepted", handleAcceptFriend);
      socket.off("friend-request-rejected", handleRejectFriend);
    };
  }, [socket, user, searchResult, setUser]);

  useEffect(() => {
    if (!socket || !user?.userId) return;
    const handleMemberRemoved = (data) => {
      if (data.removedMembers.includes(user.userId)) {
        fetchAllChats();
      }
    };
    socket.on("member-removed", handleMemberRemoved);
    return () => {
      socket.off("member-removed", handleMemberRemoved);
    };
  }, [socket, user?.userId, fetchAllChats]);

  useEffect(() => {
    if (!socket || !user?.userId) return;
    const handleMemberAdded = (data) => {
      const allUserIds = (data.participants || []).map((u) => u.userId || u);
      if (allUserIds.includes(user.userId)) {
        setChatList((prev) => {
          const existsIdx = prev.findIndex(
            (chat) => chat.conversationId === data.conversationId
          );
          let newChat = {
            ...data.conversation,
            conversationId: data.conversationId,
            participants: data.participants,
            lastMsg: "Bạn vừa được thêm vào nhóm",
            time: new Date().toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            lastMessageTime: new Date().toISOString(),
            unreadCount: 0,
          };
          if (existsIdx !== -1) {
            const updated = [...prev];
            updated.splice(existsIdx, 1);
            return [newChat, ...updated];
          } else {
            return [newChat, ...prev];
          }
        });
        fetchAllChats();
      }
    };
    socket.on("member-added", handleMemberAdded);
    return () => {
      socket.off("member-added", handleMemberAdded);
    };
  }, [socket, user?.userId, fetchAllChats]);

  useEffect(() => {
    if (!socket || !user?.userId) return;
    const handleMemberLeft = (data) => {
      if (data.userId === user.userId) {
        fetchAllChats();
      }
    };
    socket.on("member-left", handleMemberLeft);
    return () => {
      socket.off("member-left", handleMemberLeft);
    };
  }, [socket, user?.userId, fetchAllChats]);

  useEffect(() => {
    fetchAllChats();
    fetchFriends();
  }, [fetchAllChats]);

  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult?.userId) return;

    setSending(true);
    try {
      const res = await sendFriendRequestApi(searchResult.userId);
      if (res.status) {
        messageApi.success(res.message || "Đã gửi lời mời kết bạn");
        socket.emit("send-friend-request", {
          receiverId: searchResult.userId,
          senderId: user.userId,
          senderName: user.fullName,
          senderAvatar: user.avatar,
        });
        setPhone("");
        setSearchResult(null);
      } else {
        messageApi.error(res.message || "Không thể gửi lời mời kết bạn");
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      messageApi.error("Có lỗi xảy ra khi gửi lời mời kết bạn");
    } finally {
      setSending(false);
    }
  };

  const handleClearSearch = () => {
    setPhone("");
    setSearchResult(null);
    setError("");
    searchResultRef.current.focus();
  };

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value.length <= 10) {
      setPhone(value);
      if (value.length === 0) {
        setSearchResult(null);
        setError("");
      }
    }
  };

  const handleSearchResultClick = () => {
    if (searchResult.userId === user?.userId) {
      setIsInfoModalOpen(true);
    } else {
      navigate(`/chat/${searchResult.userId}`);
    }
  };

  const handleNavigateToChat = (chat) => {
    if (chat.type === "group") {
      navigate(`/chat/${chat.conversationId}`);
    } else {
      navigate(`/chat/${chat.id}`);
    }
  };

  const renderFriendStatus = () => {
    if (searchResult?.userId === user?.userId) return null;

    if (!searchResult?.isFriend) {
      return (
        <button
          onClick={handleSendRequest}
          disabled={sending}
          className={`px-3 py-2 bg-[#0068ff] text-white text-sm rounded-lg transition-colors cursor-pointer ${
            sending ? "opacity-50 cursor-not-allowed" : "hover:bg-[#0052cc]"
          }`}
        >
          {sending ? (
            <div className="flex items-center gap-1">
              <Spin
                indicator={
                  <LoadingOutlined
                    style={{ color: "white", fontSize: 16 }}
                    spin
                  />
                }
              />
              <span>Kết bạn</span>
            </div>
          ) : (
            <span>Kết bạn</span>
          )}
        </button>
      );
    }

    return <div className="text-sm text-gray-500">Bạn bè</div>;
  };

  const formatTime = (timeString) => {
    if (!timeString) return "";

    const date = new Date(timeString);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      return days[date.getDay()];
    }

    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      });
    }

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleOpenCreateGroupModal = () => {
    setShowCreateGroupModal(true);
  };

  const handleCloseCreateGroupModal = () => {
    setShowCreateGroupModal(false);
  };

  const handleCreateGroup = async (groupData) => {
    try {
      messageApi.open({
        type: "success",
        content: "Tạo nhóm thành công",
      });

      handleCloseCreateGroupModal();

      if (groupData) {
        setChatList((prevChatList) => {
          const existingIndex = prevChatList.findIndex(
            (chat) => chat.conversationId === groupData.conversationId
          );

          if (existingIndex !== -1) {
            const updatedChatList = [...prevChatList];
            updatedChatList[existingIndex] = {
              ...updatedChatList[existingIndex],
              ...groupData,
            };
            return updatedChatList;
          } else {
            return [groupData, ...prevChatList];
          }
        });

        if (groupData.conversationId) {
          navigate(`/chat/${groupData.conversationId}`);
        }
      }
    } catch (error) {
      console.error("Lỗi khi tạo nhóm:", error);
      messageApi.open({
        type: "error",
        content: "Không thể tạo nhóm",
      });
    }
  };

  const renderChatSkeleton = () => {
    return Array(7)
      .fill(null)
      .map((_, index) => (
        <div key={index} className="p-3 flex items-start gap-3">
          <Skeleton.Avatar active size={48} className="flex-shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <Skeleton.Input active size="small" style={{ width: 180 }} />
              <Skeleton.Button active size="small" style={{ width: 30 }} />
            </div>
            <div className="mt-1">
              <Skeleton.Input active size="small" style={{ width: 10 }} />
            </div>
          </div>
        </div>
      ));
  };

  return (
    <div className="w-[350px] border-r border-[#00000026] bg-white flex flex-col h-full">
      <div className="p-3 pb-0 border-b border-[#00000026]">
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-[#ebecf0] rounded-lg px-3 py-2 flex-1">
            <IoSearchOutline size={20} color="#000000" />
            <input
              ref={searchResultRef}
              type="text"
              value={phone}
              onChange={handleInputChange}
              placeholder="Tìm kiếm số điện thoại"
              className="w-full bg-transparent outline-none text-sm ml-1"
            />
            {phone && (
              <button
                onClick={handleClearSearch}
                className="text-gray-500 hover:text-gray-700"
              >
                <IoClose size={18} />
              </button>
            )}
          </div>
          <div className="flex gap-1">
            <button className="text-gray-600 hover:bg-gray-100 p-2 cursor-pointer">
              <AiOutlineUserAdd size={20} color="#000000" />
            </button>
            <button
              className="text-gray-600 hover:bg-gray-100 p-2 cursor-pointer"
              onClick={handleOpenCreateGroupModal}
            >
              <AiOutlineUsergroupAdd size={20} color="#000000" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm mt-5 relative">
          <div className="flex items-center gap-4 font-medium relative w-full">
            <button
              className={`pb-1 transition-colors duration-300 cursor-pointer ${
                activeTab === "all" ? "text-blue-600" : "text-gray-500"
              }`}
              onClick={() => handleTabChange("all")}
            >
              Tất cả
            </button>
            <button
              className={`pb-1 transition-colors duration-300 cursor-pointer ${
                activeTab === "unread" ? "text-blue-600" : "text-gray-500"
              }`}
              onClick={() => handleTabChange("unread")}
            >
              Chưa đọc
            </button>

            <span
              className="absolute bottom-0 h-[2px] bg-blue-600 rounded transition-all duration-300"
              style={{
                width: activeTab === "all" ? "40px" : "62px",
                left: activeTab === "all" ? "0px" : "53px",
              }}
            />
          </div>

          <div className="flex items-center text-gray-500 text-sm cursor-pointer hover:bg-[#e5e7eb] rounded-full p-[3px] ml-2">
            <HiOutlineDotsHorizontal size={20} color="#081b3a" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {(error || phone.length > 0) && !searchResult && !loading && (
          <div className="flex flex-col items-center justify-center h-[300px] px-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <BsTelephone size={32} className="text-gray-500" />
            </div>
            <p className="text-center text-sm text-gray-500 max-w-[250px]">
              {error ||
                "Số điện thoại chưa đăng ký tài khoản hoặc không cho phép tìm kiếm."}
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-[300px]">
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
            />
          </div>
        )}

        {searchResult && (
          <div className="mt-2">
            <div
              className="flex items-center justify-between p-4 hover:bg-[#f1f2f4] cursor-pointer"
              onClick={handleSearchResultClick}
            >
              <div className="flex items-center gap-3">
                <img
                  src={searchResult.avatar || defaultAvatar}
                  alt={searchResult.fullName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <div className="font-medium text-[#081b3a]">
                    {searchResult.fullName}
                  </div>
                  <div className="text-sm text-gray-500">
                    Số điện thoại:{" "}
                    <span className="text-[#005ae0]">{searchResult.phone}</span>
                  </div>
                </div>
              </div>
              {searchResult.userId !== user?.userId && renderFriendStatus()}
            </div>
          </div>
        )}

        {!phone && (
          <div className="flex flex-col">
            {loadingChats || loadingFriends ? (
              renderChatSkeleton()
            ) : (
              <>
                {chatList.length > 0 && (
                  <>
                    {chatList.map((chat) => (
                      <div
                        key={
                          chat.type === "group" ? chat.conversationId : chat.id
                        }
                        onClick={() => handleNavigateToChat(chat)}
                        className={`p-3 cursor-pointer flex items-start gap-3 ${
                          (
                            chat.type === "group"
                              ? chat.conversationId === id
                              : chat.id === id
                          )
                            ? "bg-[#dbebff]"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        <div className="w-12 h-12 flex-shrink-0 relative">
                          <img
                            src={chat.avatar || defaultAvatar}
                            alt={chat.name}
                            className="w-full h-full object-cover rounded-full"
                          />
                          {chat.type === "group" && (
                            <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                              <AiOutlineUsergroupAdd className="text-white text-xs" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <div className="font-medium text-[16px] text-black truncate">
                              {chat.name}
                            </div>
                            <div className="text-gray-500 text-xs whitespace-nowrap">
                              {chat.time}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <div className="text-gray-600 text-sm truncate w-full">
                              {chat.lastMsg || "Chưa có tin nhắn"}
                            </div>
                            {chat.unreadCount > 0 && (
                              <div className="ml-2 text-[10px] bg-red-600 text-white font-bold rounded-full px-[6px] py-[2px] leading-none">
                                {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {friends.map((friend) => {
                  const hasChat = chatList.some(
                    (chat) => chat.type !== "group" && chat.id === friend.userId
                  );

                  if (hasChat) return null;

                  return (
                    <div
                      key={friend.userId}
                      onClick={() => navigate(`/chat/${friend.userId}`)}
                      className={`p-3 cursor-pointer flex items-start gap-3 ${
                        friend.userId === id
                          ? "bg-[#dbebff]"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <div className="w-12 h-12 flex-shrink-0">
                        <img
                          src={friend.avatar || defaultAvatar}
                          alt={friend.fullName}
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-[16px] text-black truncate">
                          {friend.fullName}
                        </div>
                        <div className="text-gray-600 text-sm truncate w-full mt-1">
                          Chưa có tin nhắn
                        </div>
                      </div>
                    </div>
                  );
                })}
                {friends.length === 0 && (
                  <p className="text-center text-xs text-gray-400 px-4">
                    Bạn chưa có bạn bè nào.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <InfoModal
        isInfoModalOpen={isInfoModalOpen}
        setIsInfoModalOpen={setIsInfoModalOpen}
      />

      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={handleCloseCreateGroupModal}
        onCreateGroup={handleCreateGroup}
      />
    </div>
  );
};

export default SidebarChatList;
