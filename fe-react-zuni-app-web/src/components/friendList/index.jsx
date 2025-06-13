import { useState, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import { Spin, Dropdown, Modal } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { useCurrentApp } from "../../contexts/app.context";
import { useSocket } from "../../contexts/socket.context";
import { getFriendsApi, removeFriendApi } from "../../services/api";
import { useNavigate } from "react-router-dom";

const FriendList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const { messageApi, user, setUser } = useCurrentApp();
  const { socket } = useSocket();

  const getFriends = async () => {
    console.log("🔄 Đang lấy danh sách bạn bè...");
    try {
      const res = await getFriendsApi();
      console.log("📥 Kết quả API getFriends:", res);
      if (res.status) {
        setFriends(res.data || []);
        console.log("👥 Danh sách bạn bè mới:", res.data);
      } else {
        console.error("❌ Lỗi getFriends:", res.message);
        messageApi.open({
          type: "error",
          content: res.message || "Lỗi khi lấy danh sách bạn bè",
        });
      }
    } catch (error) {
      console.error("🚨 Exception trong getFriends:", error);
      messageApi.open({
        type: "error",
        content: "Không thể lấy danh sách bạn bè",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("⚡ FriendList mounted - Gọi getFriends()");
    getFriends();
  }, []);

  const handleRemoveFriend = async (friendId) => {
    console.log("🗑️ Bắt đầu xóa bạn, friendId:", friendId);
    setConfirmLoading(true);
    try {
      const res = await removeFriendApi(friendId);
      console.log("📤 Kết quả API removeFriend:", res);
      if (res.status) {
        messageApi.open({
          type: "success",
          content: res.message || "Hủy kết bạn thành công",
        });

        // Cập nhật user.contacts
        if (user?.contacts) {
          console.log("📋 Contacts trước khi xóa:", user.contacts);
          setUser((prev) => {
            const newContacts = prev.contacts.filter((id) => id !== friendId);
            console.log("📋 Contacts sau khi xóa:", newContacts);
            return {
              ...prev,
              contacts: newContacts,
            };
          });
        }

        // Emit sự kiện friend-removed để cập nhật UI realtime
        console.log("🔔 Emit sự kiện friend-removed:", {
          friendId,
          removerId: user?.userId,
          removerName: user?.fullName,
          removerAvatar: user?.avatar,
          to: friendId,
          removedUser: {
            userId: friendId,
            fullName: friendToRemove?.fullName,
            avatar: friendToRemove?.avatar,
          },
        });

        socket?.emit("friend-removed", {
          friendId: friendId,
          removerId: user?.userId,
          removerName: user?.fullName,
          removerAvatar: user?.avatar,
          to: friendId,
          removedUser: {
            userId: friendId,
            fullName: friendToRemove?.fullName,
            avatar: friendToRemove?.avatar,
          },
        });

        getFriends();
      } else {
        console.error("❌ Lỗi removeFriend:", res.message);
        messageApi.open({
          type: "error",
          content: res.message || "Lỗi khi hủy kết bạn",
        });
      }
    } catch (error) {
      console.error("🚨 Exception trong removeFriend:", error);
      messageApi.open({
        type: "error",
        content: "Không thể hủy kết bạn",
      });
    } finally {
      setConfirmLoading(false);
      setFriendToRemove(null);
    }
  };

  const showConfirmModal = (friend) => {
    console.log("🔍 Hiển thị modal xác nhận xóa bạn:", friend);
    setFriendToRemove(friend);
  };

  const handleCancel = () => {
    console.log("❌ Hủy xóa bạn");
    setFriendToRemove(null);
  };

  const handleNavigateToChat = (userId) => {
    navigate(`/chat/${userId}`);
  };

  const filteredFriends = friends.filter((friend) =>
    friend.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log("🔍 Kết quả tìm kiếm:", {
    searchTerm,
    totalFriends: friends.length,
    filteredCount: filteredFriends.length,
  });

  const groupedFriends = filteredFriends.reduce((groups, friend) => {
    const firstLetter = friend.fullName.charAt(0).toUpperCase();
    if (!groups[firstLetter]) {
      groups[firstLetter] = [];
    }
    groups[firstLetter].push(friend);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="flex-col items-center justify-between p-4 bg-[#ebecf0] h-screen">
        <div className="flex items-center justify-center h-full">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 30 }} spin />} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-col items-center justify-between px-6 py-8 bg-[#ebecf0]">
      <div className="bg-white rounded-lg">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Bạn bè ({friends.length})
          </h2>
        </div>

        <div className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm bạn"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.target.value.length === 0 && e.key === " ") {
                  e.preventDefault();
                }
              }}
              className="w-full bg-gray-100 text-gray-900 pl-10 pr-4 py-2 rounded-lg focus:outline-none"
            />
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
        </div>

        <div
          className="px-4 overflow-y-auto"
          style={{ height: "calc(100vh - 250px)" }}
        >
          {friends.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              Chưa có bạn bè nào
            </div>
          ) : (
            Object.keys(groupedFriends)
              .sort()
              .map((letter) => (
                <div key={letter}>
                  <div className="text-sm font-semibold text-gray-500 mb-2">
                    {letter}
                  </div>
                  {groupedFriends[letter].map((friend) => (
                    <div
                      key={friend.userId}
                      className="flex items-center justify-between py-2 mb-3 hover:bg-gray-50 rounded-lg px-2 cursor-pointer"
                      onClick={() => handleNavigateToChat(friend.userId)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <img
                            src={friend.avatar}
                            alt={friend.fullName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        </div>
                        <span className="font-medium text-gray-900 select-none">
                          {friend.fullName}
                        </span>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Dropdown
                          menu={{
                            items: [
                              {
                                key: "1",
                                label: "Hủy kết bạn",
                                onClick: () => showConfirmModal(friend),
                                danger: true,
                              },
                            ],
                          }}
                          trigger={["click"]}
                          placement="bottomRight"
                        >
                          <button className="text-gray-400 cursor-pointer hover:bg-gray-200 rounded-md p-1">
                            <HiOutlineDotsHorizontal
                              size={20}
                              color="#081b3a"
                            />
                          </button>
                        </Dropdown>
                      </div>
                    </div>
                  ))}
                </div>
              ))
          )}
        </div>
      </div>

      <Modal
        title="Xác nhận hủy kết bạn "
        open={!!friendToRemove}
        onOk={() => handleRemoveFriend(friendToRemove?.userId)}
        onCancel={handleCancel}
        okText="Xác nhận"
        cancelText="Hủy"
        okButtonProps={{ danger: true, loading: confirmLoading }}
        maskClosable={false}
        style={{ top: "30%" }}
      >
        <p>
          Bạn có chắc chắn muốn hủy kết bạn với{" "}
          <span className="font-semibold">{friendToRemove?.fullName}</span>{" "}
          không?
        </p>
      </Modal>
    </div>
  );
};

export default FriendList;
