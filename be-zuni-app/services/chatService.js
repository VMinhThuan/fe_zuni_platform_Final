const User = require("../models/User");

const getChatList = async (userId) => {
  try {
    const user = await User.getUserById(userId);
    if (!user) {
      return {
        status: false,
        error: 1,
        message: "Người dùng không tồn tại",
        data: null,
      };
    }

    // Lấy thông tin chi tiết của bạn bè
    const contacts = user.contacts || [];
    const chatList = await Promise.all(
      contacts.map(async (friendId) => {
        const friend = await User.getUserById(friendId);
        return {
          id: friend.userId,
          name: friend.fullName,
          lastMsg: "Chưa có tin nhắn",
          time: "Vừa xong",
          avatar: friend.avatar,
          unreadCount: 0,
        };
      })
    );

    return {
      status: true,
      error: 0,
      message: "Lấy danh sách chat thành công",
      data: chatList,
    };
  } catch (error) {
    console.error("Error in getChatList service:", error);
    throw error;
  }
};

module.exports = {
  getChatList,
};
