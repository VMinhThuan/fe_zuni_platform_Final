import React from "react";
import { Dropdown } from "antd";
import { FaEllipsisH } from "react-icons/fa";

const MessageDropdown = ({ message, currentUserId, onDelete }) => {
  // Nếu tin nhắn đã bị xóa, không hiển thị menu
  if (message.isDeleted) {
    return null;
  }

  const items = [
    {
      key: "delete",
      label: "Xóa tin nhắn",
      danger: true,
      disabled: message.sender?.id !== currentUserId,
    },
  ];

  return (
    <Dropdown
      menu={{
        items,
        onClick: ({ key }) => {
          if (key === "delete") {
            onDelete(message);
          }
        },
      }}
      trigger={["click"]}
      placement="bottomRight"
    >
      <div className="w-6 h-6 flex items-center justify-center bg-[#ffffffcc] rounded-full cursor-pointer">
        <FaEllipsisH
          className="text-[#5a6981] hover:text-[#005ae0]"
          size={10}
        />
      </div>
    </Dropdown>
  );
};

export default MessageDropdown;
