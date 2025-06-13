const reactionService = require("../services/reactionService");

const addReaction = async (req, res) => {
  try {
    const { messageId, conversationId, type } = req.body;
    const userId = req.user.userId;

    if (!messageId || !conversationId) {
      return res.status(400).json({
        status: false,
        error: 400,
        message: "Thiếu messageId hoặc conversationId",
        data: null,
      });
    }

    const result = await reactionService.addMessageReaction({
      messageId,
      userId,
      conversationId,
      type: type || "heart",
    });

    if (result.status) {
      return res.status(200).json({
        status: true,
        error: 0,
        message: "Đã thêm reaction thành công",
        data: result.data,
      });
    } else {
      return res.status(400).json({
        status: false,
        error: 400,
        message: result.message,
        data: null,
      });
    }
  } catch (error) {
    console.error("Error in addReaction controller:", error);
    return res.status(500).json({
      status: false,
      error: 500,
      message: error.message || "Lỗi khi thêm reaction",
      data: null,
    });
  }
};

const removeReaction = async (req, res) => {
  try {
    const { messageId, conversationId } = req.params;
    const userId = req.user.userId;

    if (!messageId || !conversationId) {
      return res.status(400).json({
        status: false,
        error: 400,
        message: "Thiếu messageId hoặc conversationId",
        data: null,
      });
    }

    const result = await reactionService.removeMessageReaction({
      messageId,
      userId,
      conversationId,
    });

    if (result.status) {
      return res.status(200).json({
        status: true,
        error: 0,
        message: "Đã xóa reaction thành công",
        data: result.data,
      });
    } else {
      return res.status(400).json({
        status: false,
        error: 400,
        message: result.message,
        data: null,
      });
    }
  } catch (error) {
    console.error("Error in removeReaction controller:", error);
    return res.status(500).json({
      status: false,
      error: 500,
      message: error.message || "Lỗi khi xóa reaction",
      data: null,
    });
  }
};

const getMessageReactions = async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({
        status: false,
        error: 400,
        message: "Thiếu messageId",
        data: null,
      });
    }

    const result = await reactionService.getMessageReactions(messageId);

    if (result.status) {
      return res.status(200).json({
        status: true,
        error: 0,
        message: "Lấy reactions thành công",
        data: result.data,
      });
    } else {
      return res.status(400).json({
        status: false,
        error: 400,
        message: result.message,
        data: null,
      });
    }
  } catch (error) {
    console.error("Error in getMessageReactions controller:", error);
    return res.status(500).json({
      status: false,
      error: 500,
      message: error.message || "Lỗi khi lấy reactions",
      data: null,
    });
  }
};

const getReactionsForMessages = async (req, res) => {
  try {
    const { messageIds } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        status: false,
        error: 400,
        message: "messageIds phải là một mảng không rỗng",
        data: null,
      });
    }

    const result = await reactionService.getReactionsForMessages(messageIds);

    if (result.status) {
      return res.status(200).json({
        status: true,
        error: 0,
        message: "Lấy reactions thành công",
        data: result.data,
      });
    } else {
      return res.status(400).json({
        status: false,
        error: 400,
        message: result.message,
        data: null,
      });
    }
  } catch (error) {
    console.error("Error in getReactionsForMessages controller:", error);
    return res.status(500).json({
      status: false,
      error: 500,
      message: error.message || "Lỗi khi lấy reactions",
      data: null,
    });
  }
};

module.exports = {
  addReaction,
  removeReaction,
  getMessageReactions,
  getReactionsForMessages,
};
