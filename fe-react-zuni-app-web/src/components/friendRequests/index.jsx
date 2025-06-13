import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useCurrentApp } from "../../contexts/app.context";
import { useSocket } from "../../contexts/socket.context";
import {
  getFriendRequestsApi,
  acceptFriendRequestApi,
  rejectFriendRequestApi,
} from "../../services/api";

const FriendRequests = ({ onUpdateCount }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState({});
  const { messageApi, user, setUser } = useCurrentApp();
  const { socket } = useSocket();
  const location = useLocation();
  const updateSidebarCount = location.state?.updateSidebarCount;

  const getRequests = async () => {
    try {
      const res = await getFriendRequestsApi();
      if (res.status) {
        setRequests(res.data || []);
        if (updateSidebarCount) {
          updateSidebarCount();
        }
        if (onUpdateCount) {
          onUpdateCount();
        }
      } else {
        messageApi.open({
          type: "error",
          content: res.message || "Lỗi khi lấy danh sách lời mời kết bạn",
        });
      }
    } catch (error) {
      console.error("Error fetching friend requests:", error);
      messageApi.open({
        type: "error",
        content: "Không thể lấy danh sách lời mời kết bạn",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getRequests();
  }, []);

  useEffect(() => {
    if (!socket) {
      console.log("FriendRequests - Socket chưa được khởi tạo");
      return;
    }

    const handleFriendRequestReceived = (data) => {
      console.log("FriendRequests - Nhận được lời mời kết bạn mới:", data);
      getRequests(); // Cập nhật lại danh sách khi có lời mời mới
    };

    const handleFriendRequestAccepted = (data) => {
      console.log("FriendRequests - Lời mời kết bạn được chấp nhận:", data);
      getRequests(); // Cập nhật lại danh sách khi có người chấp nhận
    };

    const handleFriendRequestRejected = (data) => {
      console.log("FriendRequests - Lời mời kết bạn bị từ chối:", data);
      getRequests(); // Cập nhật lại danh sách khi có người từ chối
    };

    // Đăng ký lắng nghe các event
    socket.on("friend-request-received", handleFriendRequestReceived);
    socket.on("friend-request-accepted", handleFriendRequestAccepted);
    socket.on("friend-request-rejected", handleFriendRequestRejected);

    // Cleanup function
    return () => {
      socket.off("friend-request-received", handleFriendRequestReceived);
      socket.off("friend-request-accepted", handleFriendRequestAccepted);
      socket.off("friend-request-rejected", handleFriendRequestRejected);
    };
  }, [socket]);

  const handleAccept = async (friendId) => {
    setLoadingStates((prev) => ({ ...prev, [`accept_${friendId}`]: true }));
    try {
      const res = await acceptFriendRequestApi(friendId);
      if (res.status) {
        await getRequests();

        console.log(
          "🔍 FriendRequests - Trước khi emit friend-request-accepted:",
          {
            friendId,
            currentUser: {
              userId: user?.userId,
              contacts: user?.contacts,
            },
          }
        );

        // Emit event friend-request-accepted với đầy đủ thông tin
        socket?.emit("friend-request-accepted", {
          friendId: friendId, // ID của người được chấp nhận
          accepterId: user?.userId, // ID của người chấp nhận
          accepterName: user?.fullName,
          accepterAvatar: user?.avatar,
          to: friendId, // ID của người nhận thông báo
        });

        console.log("📝 FriendRequests - Trước khi cập nhật user context:", {
          currentContacts: user?.contacts,
          willAdd: friendId,
        });

        // Cập nhật contacts trong user context
        setUser((prev) => {
          const newContacts = [...(prev.contacts || [])];
          if (!newContacts.includes(friendId)) {
            newContacts.push(friendId);
          }
          console.log("✅ FriendRequests - Sau khi tạo newContacts:", {
            oldContacts: prev.contacts,
            newContacts,
          });
          return {
            ...prev,
            contacts: newContacts,
          };
        });

        // Cập nhật UI ở sidebar và chat
        if (window.updateSidebarFriendRequests) {
          window.updateSidebarFriendRequests();
        }
        if (onUpdateCount) {
          onUpdateCount();
        }
        messageApi.open({
          type: "success",
          content: res.message || "Đã chấp nhận lời mời kết bạn",
        });
      } else {
        messageApi.open({
          type: "error",
          content: res.message || "Lỗi khi chấp nhận lời mời kết bạn",
        });
      }
    } catch (error) {
      console.error("Error accepting friend request:", error);
      messageApi.open({
        type: "error",
        content: "Không thể chấp nhận lời mời kết bạn",
      });
    } finally {
      setLoadingStates((prev) => ({ ...prev, [`accept_${friendId}`]: false }));
    }
  };

  const handleReject = async (friendId) => {
    setLoadingStates((prev) => ({ ...prev, [`reject_${friendId}`]: true }));
    try {
      const res = await rejectFriendRequestApi(friendId);
      if (res.status) {
        await getRequests();

        console.log(
          "🔍 FriendRequests - Trước khi emit friend-request-rejected:",
          {
            friendId,
            currentUser: {
              userId: user?.userId,
              contacts: user?.contacts,
            },
          }
        );

        // Emit event friend-request-rejected với đầy đủ thông tin
        socket?.emit("friend-request-rejected", {
          friendId: friendId, // ID của người bị từ chối
          rejecterId: user?.userId, // ID của người từ chối
          rejecterName: user?.fullName,
          rejecterAvatar: user?.avatar,
          to: friendId, // ID của người nhận thông báo
        });

        console.log("📝 FriendRequests - Trước khi cập nhật user context:", {
          currentContacts: user?.contacts,
          willRemove: friendId,
        });

        // Cập nhật lại contacts trong user context
        setUser((prev) => {
          const newContacts = (prev.contacts || []).filter(
            (id) => id !== friendId
          );
          console.log("✅ FriendRequests - Sau khi tạo newContacts:", {
            oldContacts: prev.contacts,
            newContacts,
          });
          return {
            ...prev,
            contacts: newContacts,
          };
        });

        // Cập nhật UI ở sidebar và chat
        if (window.updateSidebarFriendRequests) {
          window.updateSidebarFriendRequests();
        }
        if (onUpdateCount) {
          onUpdateCount();
        }
        messageApi.open({
          type: "success",
          content: res.message || "Đã từ chối lời mời kết bạn",
        });
      } else {
        messageApi.open({
          type: "error",
          content: res.message || "Lỗi khi từ chối lời mời kết bạn",
        });
      }
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      messageApi.open({
        type: "error",
        content: "Không thể từ chối lời mời kết bạn",
      });
    } finally {
      setLoadingStates((prev) => ({ ...prev, [`reject_${friendId}`]: false }));
    }
  };

  const filteredRequests = requests.filter((request) =>
    request.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 30 }} spin />} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <div className="bg-white my-8 mx-6 flex-1 rounded-lg">
        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.target.value.length === 0 && e.key === " ") {
                  e.preventDefault();
                }
              }}
              className="w-full bg-[#f0f2f5] text-[#4a4a4a] pl-10 pr-4 py-2 rounded-lg focus:outline-none"
            />
            <MagnifyingGlassIcon className="h-5 w-5 text-[#4a4a4a] absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Friend Requests List */}
        <div className="flex-1 overflow-y-auto px-4">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              Không có lời mời kết bạn nào
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div
                key={request.userId}
                className="flex items-center justify-between py-3 hover:bg-[#f1f2f4] rounded-lg px-2"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={request.avatar}
                    alt={request.fullName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-medium text-[#081b3a] select-none">
                      {request.fullName}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(request.userId)}
                    disabled={
                      loadingStates[`accept_${request.userId}`] ||
                      loadingStates[`reject_${request.userId}`]
                    }
                    className={`px-4 py-1.5 bg-[#0068ff] text-white rounded-lg transition-colors cursor-pointer ${
                      loadingStates[`accept_${request.userId}`] ||
                      loadingStates[`reject_${request.userId}`]
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-[#0052cc]"
                    }`}
                  >
                    {loadingStates[`accept_${request.userId}`] ? (
                      <div className="flex items-center gap-2">
                        <Spin
                          indicator={
                            <LoadingOutlined
                              style={{ color: "white", fontSize: 16 }}
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
                    onClick={() => handleReject(request.userId)}
                    disabled={
                      loadingStates[`accept_${request.userId}`] ||
                      loadingStates[`reject_${request.userId}`]
                    }
                    className={`px-4 py-1.5 bg-[#f0f2f5] text-[#081b3a] rounded-lg transition-colors cursor-pointer ${
                      loadingStates[`accept_${request.userId}`] ||
                      loadingStates[`reject_${request.userId}`]
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-[#e4e6eb]"
                    }`}
                  >
                    {loadingStates[`reject_${request.userId}`] ? (
                      <div className="flex items-center gap-2">
                        <Spin
                          indicator={
                            <LoadingOutlined style={{ fontSize: 16 }} spin />
                          }
                        />
                        <span>Từ chối</span>
                      </div>
                    ) : (
                      "Từ chối"
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendRequests;
