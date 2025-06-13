import { useState, useEffect, useRef } from "react";
import { Button, Input, Spin, Modal } from "antd";
import { FaCamera } from "react-icons/fa";
import {
  getFriendsApi,
  createConversationApi,
  uploadGroupAvatarApi,
} from "../../services/api";
import { LoadingOutlined } from "@ant-design/icons";
import { useCurrentApp } from "../../contexts/app.context";
import { useSocket } from "../../contexts/socket.context";

const CreateGroupModal = ({ isOpen, onClose, onCreateGroup }) => {
  const [groupName, setGroupName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [groupAvatar, setGroupAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const { messageApi, user } = useCurrentApp();
  const fileInputRef = useRef(null);
  const { socket } = useSocket();

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
      // Reset state khi mở modal
      setGroupName("");
      setSearchTerm("");
      setSelectedFriends([]);
      setGroupAvatar(null);
      setAvatarPreview(null);
      setCreatingGroup(false);
    }
  }, [isOpen]);

  // Dọn dẹp khi component unmount
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const response = await getFriendsApi();
      if (response.status) {
        setFriends(response.data || []);
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách bạn bè:", error);
      messageApi.open({
        type: "error",
        content: "Không thể lấy danh sách bạn bè",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Kiểm tra kích thước và loại file
    if (file.size > 2 * 1024 * 1024) {
      messageApi.error({
        type: "error",
        content: "Kích thước ảnh không được vượt quá 2MB",
      });
      return;
    }

    if (!file.type.includes("image/")) {
      messageApi.error({
        type: "error",
        content: "Vui lòng chọn file ảnh",
      });
      return;
    }

    // Tạo URL để xem trước ảnh
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setGroupAvatar(file);
  };

  const filteredFriends = friends.filter((friend) => {
    const fullNameMatch = friend.fullName
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const phoneMatch = friend.phoneNumber?.includes(searchTerm);
    return fullNameMatch || phoneMatch;
  });

  const groupedFriends = filteredFriends.reduce((groups, friend) => {
    const firstLetter = friend.fullName?.charAt(0).toUpperCase() || "#";
    if (!groups[firstLetter]) {
      groups[firstLetter] = [];
    }
    groups[firstLetter].push(friend);
    return groups;
  }, {});

  const sortedGroups = Object.keys(groupedFriends).sort();

  const handleSelectFriend = (friendId) => {
    setSelectedFriends((prev) => {
      if (prev.includes(friendId)) {
        return prev.filter((id) => id !== friendId);
      } else {
        return [...prev, friendId];
      }
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      messageApi.error({
        type: "error",
        content: "Vui lòng nhập tên nhóm",
      });
      return;
    }

    if (selectedFriends.length < 2) {
      messageApi.error({
        type: "error",
        content: "Vui lòng chọn ít nhất 2 thành viên",
      });
      return;
    }

    setCreatingGroup(true);

    try {
      // Đầu tiên tạo nhóm với avatar mặc định
      const createGroupData = {
        participants: selectedFriends,
        type: "group",
        name: groupName,
        avatar: null, // Ban đầu để avatar là null
        settings: {
          notifications: true,
        },
      };

      const response = await createConversationApi(createGroupData);

      if (!response.status) {
        throw new Error(response.message || "Không thể tạo nhóm chat");
      }

      // Nếu có chọn avatar, upload sau khi tạo nhóm
      if (groupAvatar) {
        const formData = new FormData();
        formData.append("avatar", groupAvatar);
        formData.append("conversationId", response.data.conversationId);

        const uploadResponse = await uploadGroupAvatarApi(formData);

        if (!uploadResponse.status) {
          throw new Error(
            uploadResponse.message || "Không thể tải lên ảnh đại diện"
          );
        }

        // Cập nhật avatar trong response data
        response.data.avatar = uploadResponse.data.avatar;
      }

      // Tạo conversation object để cập nhật UI ngay lập tức
      const newConversation = {
        ...response.data,
        type: "group",
        lastMsg: "Nhóm mới được tạo",
        unreadCount: 0,
        time: new Date().toISOString(),
        lastMessageTime: new Date().toISOString(),
      };

      // Emit socket event để thông báo tạo nhóm thành công
      if (socket) {
        socket.emit("group-created", {
          conversation: newConversation,
          participants: [...selectedFriends, user.userId],
        });
      }

      // Thông báo cho component cha về việc tạo nhóm thành công
      if (onCreateGroup) {
        onCreateGroup(newConversation);
      }

      // Đặt lại trạng thái
      setGroupName("");
      setSelectedFriends([]);
      setGroupAvatar(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }

      // Đóng modal
      onClose();
    } catch (error) {
      console.error("Lỗi khi tạo nhóm:", error);
      messageApi.error({
        type: "error",
        content: error.message || "Có lỗi xảy ra khi tạo nhóm",
      });
    } finally {
      setCreatingGroup(false);
    }
  };

  const countSelectedFriends = () => {
    const count = selectedFriends.length;
    return count === 0
      ? "Chưa chọn thành viên"
      : `Đã chọn ${count} thành viên${count < 2 ? " (cần ít nhất 2)" : ""}`;
  };

  const modalFooter = (
    <div className="flex items-center justify-end gap-3 border-t border-[#d9d9d9] pt-3">
      <span className="text-sm text-gray-500 mr-auto">
        {countSelectedFriends()}
      </span>
      <Button onClick={onClose} disabled={creatingGroup}>
        Hủy
      </Button>
      <Button
        type="primary"
        onClick={handleCreateGroup}
        disabled={
          !groupName.trim() || selectedFriends.length < 2 || creatingGroup
        }
        loading={creatingGroup}
      >
        {creatingGroup ? "Đang tạo..." : "Tạo nhóm"}
      </Button>
    </div>
  );

  return (
    <Modal
      title="Tạo nhóm chat"
      open={isOpen}
      onCancel={onClose}
      footer={modalFooter}
      width={480}
      centered
      className="group-modal"
      maskClosable={!creatingGroup}
      closable={!creatingGroup}
    >
      {/* Group name and avatar input */}
      <div className="flex items-center gap-3 py-4 border-b border-t border-[#d9d9d9]">
        <div
          className="w-12 h-12 bg-white rounded-full border border-[#d9d9d9] flex items-center justify-center cursor-pointer overflow-hidden"
          onClick={() => !creatingGroup && fileInputRef.current?.click()}
        >
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Ảnh nhóm"
              className="w-full h-full object-cover"
            />
          ) : (
            <FaCamera className="text-gray-500" size={20} />
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleAvatarChange}
            disabled={creatingGroup}
          />
        </div>
        <Input
          placeholder="Nhập tên nhóm..."
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="flex-1"
          style={{
            padding: "7px 0",
            border: "none",
            borderBottom: "1px solid #e0e0e0",
            borderRadius: "0",
            boxShadow: "none",
          }}
          autoComplete="off"
          disabled={creatingGroup}
        />
      </div>

      {/* Search input */}
      <div className="py-4 border-b border-[#d9d9d9]">
        <Input
          placeholder="Tìm kiếm bạn bè..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "7px 20px",
            borderRadius: "20px",
            boxShadow: "none",
          }}
          autoComplete="off"
          disabled={creatingGroup}
        />
      </div>

      {/* Friend list */}
      <div className="mt-3 max-h-[40vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 20 }} spin />}
            />
          </div>
        ) : filteredFriends.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            {searchTerm
              ? "Không tìm thấy bạn bè phù hợp"
              : "Bạn chưa có bạn bè nào"}
          </div>
        ) : (
          sortedGroups.map((letter) => (
            <div key={letter} className="mb-3">
              <div className="px-2 py-2 font-semibold text-lg">{letter}</div>
              {groupedFriends[letter].map((friend) => (
                <div
                  key={friend.userId}
                  className="flex items-center gap-3 px-2 py-2 hover:bg-gray-100 rounded-md cursor-pointer"
                >
                  <input
                    type="checkbox"
                    id={`friend-${friend.userId}`}
                    checked={selectedFriends.includes(friend.userId)}
                    onChange={() =>
                      !creatingGroup && handleSelectFriend(friend.userId)
                    }
                    className="h-5 w-5 rounded-full cursor-pointer"
                    disabled={creatingGroup}
                  />
                  <img
                    src={friend.avatar || "https://via.placeholder.com/40"}
                    alt={friend.fullName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <label
                    htmlFor={`friend-${friend.userId}`}
                    className={`flex-1 cursor-pointer ${
                      creatingGroup ? "pointer-events-none" : ""
                    }`}
                  >
                    {friend.fullName}
                  </label>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};

export default CreateGroupModal;
