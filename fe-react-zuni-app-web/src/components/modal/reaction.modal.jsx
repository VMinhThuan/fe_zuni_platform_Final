import React from "react";
import { Modal, Tabs, Avatar, Skeleton } from "antd";
import { AiFillHeart } from "react-icons/ai";
import defaultAvatar from "../../assets/images/defaultAvatar.jpg";

const ReactionModal = ({ isOpen, onClose, data, userDetails = {} }) => {
  if (!isOpen || !data) return null;

  // Tính tổng số reaction
  const totalReactions = Object.values(data.reactions).reduce(
    (sum, reaction) => sum + reaction.count,
    0
  );

  // Lấy danh sách người dùng đã thả tim
  const reactedUsers = Object.entries(data.reactions).map(
    ([userId, reaction]) => ({
      userId,
      type: reaction.type,
      count: reaction.count,
      // Chỉ lấy thông tin từ userDetails nếu có đầy đủ
      ...(userDetails[userId]?.fullName ? userDetails[userId] : null),
    })
  );

  // Kiểm tra xem có đang loading userDetails không
  const isLoading = reactedUsers.some((user) => !user.fullName);

  const renderUserList = () => (
    <div className="max-h-[400px] overflow-y-auto">
      {reactedUsers.map((user) => (
        <div key={user.userId} className="flex items-center mb-3">
          {isLoading ? (
            <>
              <Skeleton.Avatar active size={45} className="mr-4" />
              <Skeleton.Input style={{ width: "240%" }} active size="small" />
            </>
          ) : (
            <>
              <Avatar
                src={user.avatar || defaultAvatar}
                size={45}
                style={{ cursor: "pointer" }}
              />
              <div className="flex-grow ml-2 select-none">
                <div className="font-medium">
                  {user.fullName || "Đang tải..."}
                </div>
              </div>
              <div className="flex items-center select-none">
                <AiFillHeart className="text-red-500 mr-1" size={16} />
                <span className="text-sm">{user.count}</span>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Modal
      open={isOpen}
      footer={null}
      onCancel={onClose}
      width={400}
      title="Biểu cảm"
      centered
    >
      <Tabs
        defaultActiveKey="all"
        items={[
          {
            key: "all",
            label: (
              <span className="select-none">
                Tất cả <span className="ml-2">{totalReactions}</span>
              </span>
            ),
            children: renderUserList(),
          },
          {
            key: "heart",
            label: (
              <span className="flex items-center select-none">
                <AiFillHeart className="text-red-500 mr-2" size={16} />
                <span>{totalReactions}</span>
              </span>
            ),
            children: renderUserList(),
          },
        ]}
      />
    </Modal>
  );
};

export default ReactionModal;
