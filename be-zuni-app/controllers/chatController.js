const chatService = require("../services/chatService");
const messageService = require("../services/messageService");

const getChatList = async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await chatService.getChatList(userId);
    return res.status(result.status ? 200 : 400).json(result);
  } catch (error) {
    console.error("Error in getChatList controller:", error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: error.message || "Lỗi khi lấy danh sách chat",
      data: null,
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, lastEvaluatedKey } = req.query;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: "Missing conversationId parameter",
      });
    }

    const result = await messageService.getMessagesByConversation(
      conversationId,
      parseInt(limit),
      lastEvaluatedKey
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in getMessages:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

module.exports = {
  getChatList,
  getMessages,
};
