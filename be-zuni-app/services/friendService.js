const User = require("../models/User");

const sendFriendRequest = async (userId, friendId) => {
  try {
    // Kiểm tra xem người dùng có tồn tại không
    const [user, friend] = await Promise.all([
      User.getUserById(userId),
      User.getUserById(friendId),
    ]);

    if (!user || !friend) {
      return {
        status: false,
        error: 1,
        message: "Người dùng không tồn tại",
        data: null,
      };
    }

    // Kiểm tra xem đã là bạn bè chưa
    const contacts = user.contacts || [];
    if (contacts.includes(friendId)) {
      return {
        status: false,
        error: 2,
        message: "Đã là bạn bè",
        data: null,
      };
    }

    // Kiểm tra xem người được gửi lời mời đã có trong danh sách friend requests chưa
    const receiverFriendRequests = friend.friendRequests || [];

    if (receiverFriendRequests.includes(userId)) {
      return {
        status: false,
        error: 3,
        message: "Đã gửi lời mời kết bạn trước đó",
        data: null,
      };
    }

    // Thêm vào danh sách lời mời kết bạn của người được gửi
    const updatedFriend = await User.addFriendRequest(friendId, userId);

    return {
      status: true,
      error: 0,
      message: "Gửi lời mời kết bạn thành công",
      data: null,
    };
  } catch (error) {
    console.error("Error in sendFriendRequest service:", error);
    throw error;
  }
};

const acceptFriendRequest = async (userId, friendId) => {
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

    const friendRequests = user.friendRequests || [];
    if (!friendRequests.includes(friendId)) {
      return {
        status: false,
        error: 2,
        message: "Không tìm thấy lời mời kết bạn",
        data: null,
      };
    }

    // Thêm bạn bè cho cả hai bên
    await Promise.all([
      User.addContact(userId, friendId),
      User.addContact(friendId, userId),
    ]);

    // Xóa lời mời kết bạn
    await User.removeFriendRequest(userId, friendId);

    return {
      status: true,
      error: 0,
      message: "Chấp nhận lời mời kết bạn thành công",
      data: null,
    };
  } catch (error) {
    console.error("Error in acceptFriendRequest service:", error);
    throw error;
  }
};

const rejectFriendRequest = async (userId, friendId) => {
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

    // Xóa lời mời kết bạn
    const friendRequests = user.friendRequests || [];
    const updatedFriendRequests = friendRequests.filter(
      (id) => id !== friendId
    );
    await User.updateUser(userId, { friendRequests: updatedFriendRequests });

    return {
      status: true,
      error: 0,
      message: "Từ chối lời mời kết bạn thành công",
      data: null,
    };
  } catch (error) {
    console.error("Error in rejectFriendRequest service:", error);
    throw error;
  }
};

const getFriendRequests = async (userId) => {
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

    // Lấy thông tin chi tiết của những người gửi lời mời
    const friendRequests = user.friendRequests || [];

    const requestDetails = await Promise.all(
      friendRequests.map(async (requesterId) => {
        const requester = await User.getUserById(requesterId);
        return {
          userId: requester.userId,
          fullName: requester.fullName,
          avatar: requester.avatar,
        };
      })
    );

    return {
      status: true,
      error: 0,
      message: "Lấy danh sách lời mời kết bạn thành công",
      data: requestDetails,
    };
  } catch (error) {
    console.error("Error in getFriendRequests service:", error);
    throw error;
  }
};

const addFriend = async (userId, friendId) => {
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

    const contacts = user.contacts || [];
    if (contacts.includes(friendId)) {
      return {
        status: false,
        error: 2,
        message: "Đã là bạn bè",
        data: null,
      };
    }

    await User.addContact(userId, friendId);

    return {
      status: true,
      error: 0,
      message: "Thêm bạn thành công",
      data: null,
    };
  } catch (error) {
    console.error("Error in addFriend service:", error);
    throw error;
  }
};

const removeFriend = async (userId, friendId) => {
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

    await User.removeContact(userId, friendId);

    return {
      status: true,
      error: 0,
      message: "Hủy kết bạn thành công",
      data: null,
    };
  } catch (error) {
    console.error("Error in removeFriend service:", error);
    throw error;
  }
};

const getFriends = async (userId) => {
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
    const friendDetails = await Promise.all(
      contacts.map(async (friendId) => {
        const friend = await User.getUserById(friendId);
        return {
          userId: friend.userId,
          fullName: friend.fullName,
          avatar: friend.avatar,
        };
      })
    );

    return {
      status: true,
      error: 0,
      message: "Lấy danh sách bạn bè thành công",
      data: friendDetails,
    };
  } catch (error) {
    console.error("Error in getFriends service:", error);
    throw error;
  }
};

const checkSentFriendRequest = async (userId, targetId) => {
  try {
    const targetUser = await User.getUserById(targetId);
    if (!targetUser) {
      return {
        status: false,
        error: 1,
        message: "Người dùng không tồn tại",
        data: null,
      };
    }

    const friendRequests = targetUser.friendRequests || [];
    const hasSentRequest = friendRequests.includes(userId);

    return {
      status: true,
      error: 0,
      message: "Kiểm tra lời mời kết bạn thành công",
      data: {
        hasSentRequest,
      },
    };
  } catch (error) {
    console.error("Error in checkSentFriendRequest service:", error);
    throw error;
  }
};

const checkReceivedFriendRequest = async (userId, targetId) => {
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

    const friendRequests = user.friendRequests || [];
    const hasReceivedRequest = friendRequests.includes(targetId);

    return {
      status: true,
      error: 0,
      message: "Kiểm tra lời mời kết bạn thành công",
      data: {
        hasReceivedRequest,
      },
    };
  } catch (error) {
    console.error("Error in checkReceivedFriendRequest service:", error);
    throw error;
  }
};

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  addFriend,
  removeFriend,
  getFriends,
  checkSentFriendRequest,
  checkReceivedFriendRequest,
};
