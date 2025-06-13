const friendService = require("../services/friendService");
const { emitToUser } = require("../configs/socket");

const sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.user;
    const { friendId } = req.body;

    if (userId === friendId) {
      return res.status(400).json({
        status: false,
        error: 1,
        message: "Không thể gửi lời mời kết bạn cho chính mình",
        data: null,
      });
    }

    const result = await friendService.sendFriendRequest(userId, friendId);

    if (result.status) {
      // Emit sự kiện đến người nhận friend request
      emitToUser(friendId, "friend-request-received", {
        from: userId,
      });
    }

    return res.status(result.status ? 200 : 400).json(result);
  } catch (error) {
    console.error("Error in sendFriendRequest:", error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: error.message || "Lỗi khi gửi lời mời kết bạn",
      data: null,
    });
  }
};

const acceptFriendRequest = async (req, res) => {
  try {
    const { userId } = req.user;
    const { friendId } = req.params;

    const result = await friendService.acceptFriendRequest(userId, friendId);
    if (result.status) {
      // Nếu chấp nhận thành công, thêm bạn cho cả hai bên
      await friendService.addFriend(userId, friendId);
      await friendService.addFriend(friendId, userId);

      // Emit sự kiện đến cả hai người dùng
      emitToUser(userId, "friend-request-accepted", { friendId });
      emitToUser(friendId, "friend-request-accepted", { friendId: userId });
    }

    return res.status(result.status ? 200 : 400).json(result);
  } catch (error) {
    console.error("Error in acceptFriendRequest:", error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: error.message || "Lỗi khi chấp nhận lời mời kết bạn",
      data: null,
    });
  }
};

const rejectFriendRequest = async (req, res) => {
  try {
    const { userId } = req.user;
    const { friendId } = req.params;

    const result = await friendService.rejectFriendRequest(userId, friendId);

    if (result.status) {
      // Emit sự kiện đến người gửi friend request
      emitToUser(friendId, "friend-request-rejected", {
        by: userId,
      });
    }

    return res.status(result.status ? 200 : 400).json(result);
  } catch (error) {
    console.error("Error in rejectFriendRequest:", error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: error.message || "Lỗi khi từ chối lời mời kết bạn",
      data: null,
    });
  }
};

const getFriendRequests = async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await friendService.getFriendRequests(userId);
    return res.status(result.status ? 200 : 400).json(result);
  } catch (error) {
    console.error("Error in getFriendRequests:", error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: error.message || "Lỗi khi lấy danh sách lời mời kết bạn",
      data: null,
    });
  }
};

const removeFriend = async (req, res) => {
  try {
    const { userId } = req.user;
    const { friendId } = req.params;

    // Hủy kết bạn cho cả 2 bên và đợi cả hai hoàn thành
    const [result1, result2] = await Promise.all([
      friendService.removeFriend(userId, friendId),
      friendService.removeFriend(friendId, userId),
    ]);

    // Kiểm tra cả hai kết quả
    if (!result1.status || !result2.status) {
      return res.status(400).json({
        status: false,
        error: -1,
        message: "Lỗi khi hủy kết bạn",
        data: null,
      });
    }

    // Emit sự kiện đến cả hai người dùng
    emitToUser(userId, "friend-removed", { friendId });
    emitToUser(friendId, "friend-removed", { friendId: userId });

    return res.status(200).json(result1);
  } catch (error) {
    console.error("Error in removeFriend:", error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: error.message || "Lỗi khi hủy kết bạn",
      data: null,
    });
  }
};

const getFriends = async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await friendService.getFriends(userId);
    return res.status(result.status ? 200 : 400).json(result);
  } catch (error) {
    console.error("Error in getFriends:", error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: error.message || "Lỗi khi lấy danh sách bạn bè",
      data: null,
    });
  }
};

const checkSentFriendRequest = async (req, res) => {
  try {
    const { userId } = req.user;
    const { targetId } = req.params;

    const result = await friendService.checkSentFriendRequest(userId, targetId);
    return res.status(result.status ? 200 : 400).json(result);
  } catch (error) {
    console.error("Error in checkSentFriendRequest:", error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: error.message || "Lỗi khi kiểm tra lời mời kết bạn",
      data: null,
    });
  }
};

const checkReceivedFriendRequest = async (req, res) => {
  try {
    const { userId } = req.user;
    const { targetId } = req.params;

    const result = await friendService.checkReceivedFriendRequest(
      userId,
      targetId
    );
    return res.status(result.status ? 200 : 400).json(result);
  } catch (error) {
    console.error("Error in checkReceivedFriendRequest:", error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: error.message || "Lỗi khi kiểm tra lời mời kết bạn",
      data: null,
    });
  }
};

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  removeFriend,
  getFriends,
  checkSentFriendRequest,
  checkReceivedFriendRequest,
};
