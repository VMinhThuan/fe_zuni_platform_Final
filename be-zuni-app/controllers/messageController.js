const MessageService = require("../services/messageService");
const ConversationService = require("../services/conversationService");
const uploadService = require("../services/uploadService");

const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, type, metadata } = req.body;
    const senderId = req.user.userId;

    // Lấy thông tin conversation để xác định receiverId
    const conversation = await ConversationService.getConversationById(
      conversationId
    );
    if (!conversation) {
      return res.status(404).json({
        status: false,
        error: 404,
        message: "Không tìm thấy cuộc trò chuyện",
        data: null,
      });
    }

    // Tùy thuộc vào kiểu cuộc trò chuyện (direct hoặc group)
    let receiverId = null;
    if (conversation.type === "direct") {
      // Tìm receiverId (người còn lại trong conversation)
      receiverId = conversation.participants.find(
        (participant) => participant !== senderId
      );

      if (!receiverId) {
        return res.status(400).json({
          status: false,
          error: 400,
          message: "Thành viên trong cuộc trò chuyện không hợp lệ",
          data: null,
        });
      }
    } else if (conversation.type === "group") {
      // Với nhóm chat, receiverId là null, tin nhắn sẽ đến tất cả thành viên
      receiverId = conversation.conversationId;
    }

    const messageData = {
      conversationId,
      senderId,
      receiverId,
      content,
      type,
      metadata,
    };

    const message = await MessageService.createMessage(messageData);
    res.status(201).json({
      status: true,
      error: 0,
      message: "Gửi tin nhắn thành công",
      data: message,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      error: 500,
      message: error.message,
      data: null,
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit, lastEvaluatedKey } = req.query;

    const messages = await MessageService.getMessagesByConversation(
      conversationId,
      parseInt(limit) || 50,
      lastEvaluatedKey
    );

    res.status(200).json({
      status: true,
      error: 0,
      message: "Lấy danh sách tin nhắn thành công",
      data: messages,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      error: 500,
      message: error.message,
      data: null,
    });
  }
};

const updateMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;

    const message = await MessageService.updateMessageStatus(messageId, status);
    res.status(200).json({
      status: true,
      error: 0,
      message: "Cập nhật trạng thái tin nhắn thành công",
      data: message,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      error: 500,
      message: error.message,
      data: null,
    });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { conversationId } = req.body;
    const userId = req.user.userId;

    await MessageService.deleteMessage(messageId, conversationId, userId);

    res.status(200).json({
      status: true,
      message: "Xóa tin nhắn thành công",
    });
  } catch (error) {
    console.error("Error in deleteMessage controller:", error);
    res.status(500).json({
      status: false,
      message: error.message || "Lỗi khi xóa tin nhắn",
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    await MessageService.markMessagesAsRead(conversationId, userId);
    res.status(200).json({
      status: true,
      error: 0,
      message: "Đánh dấu tin nhắn đã đọc thành công",
      data: null,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      error: 500,
      message: error.message,
      data: null,
    });
  }
};

const uploadImage = async (req, res) => {
  try {
    const { conversationId, messageText } = req.body;
    const senderId = req.user.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        status: false,
        error: 400,
        message: "Không tìm thấy file ảnh",
        data: null,
      });
    }

    // Lấy thông tin conversation để xác định receiverId
    const conversation = await ConversationService.getConversationById(
      conversationId
    );
    if (!conversation) {
      return res.status(404).json({
        status: false,
        error: 404,
        message: "Không tìm thấy cuộc trò chuyện",
        data: null,
      });
    }

    // Xác định receiverId dựa trên loại cuộc trò chuyện
    let receiverId = null;
    if (conversation.type === "private") {
      // Tìm receiverId (người còn lại trong conversation)
      receiverId = conversation.participants.find(
        (participant) => participant !== senderId
      );

      if (!receiverId) {
        return res.status(400).json({
          status: false,
          error: 400,
          message: "Thành viên trong cuộc trò chuyện không hợp lệ",
          data: null,
        });
      }
    } else if (conversation.type === "group") {
      // Với nhóm chat, receiverId là ID của nhóm (conversationId)
      receiverId = conversationId;
    }

    // Upload ảnh lên S3
    const imageUrl = await uploadService.uploadToS3(file, "chatImages");

    // Chuẩn bị metadata
    const metadata = {
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };

    // Thêm messageText vào metadata nếu có
    if (messageText) {
      metadata.messageText = messageText;
    }

    // Tạo tin nhắn mới với type là image
    const messageData = {
      conversationId,
      senderId,
      receiverId,
      type: "image",
      content: imageUrl,
      metadata: metadata,
    };

    const message = await MessageService.createMessage(messageData);

    // Đảm bảo metadata được trả về dưới dạng object, không phải string
    const responseMessage = {
      ...message,
      metadata:
        typeof message.metadata === "string"
          ? JSON.parse(message.metadata)
          : message.metadata,
    };

    res.status(201).json({
      status: true,
      error: 0,
      message: "Upload ảnh thành công",
      data: responseMessage,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      status: false,
      error: 500,
      message: error.message || "Lỗi khi upload ảnh",
      data: null,
    });
  }
};

const uploadMessageFile = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const senderId = req.user.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        status: false,
        error: 400,
        message: "Không tìm thấy file",
        data: null,
      });
    }

    // Lấy thông tin conversation để xác định receiverId
    const conversation = await ConversationService.getConversationById(
      conversationId
    );
    if (!conversation) {
      return res.status(404).json({
        status: false,
        error: 404,
        message: "Không tìm thấy cuộc trò chuyện",
        data: null,
      });
    }

    // Xác định receiverId dựa trên loại cuộc trò chuyện
    let receiverId = null;
    if (conversation.type === "private") {
      // Tìm receiverId (người còn lại trong conversation)
      receiverId = conversation.participants.find(
        (participant) => participant !== senderId
      );

      if (!receiverId) {
        return res.status(400).json({
          status: false,
          error: 400,
          message: "Thành viên trong cuộc trò chuyện không hợp lệ",
          data: null,
        });
      }
    } else if (conversation.type === "group") {
      // Với nhóm chat, receiverId là ID của nhóm (conversationId)
      receiverId = conversationId;
    }

    // Upload file lên S3
    const fileUrl = await uploadService.uploadToS3(file, "chatFiles");

    // Tạo tin nhắn mới với type là file
    const messageData = {
      conversationId,
      senderId,
      receiverId,
      type: "file",
      content: {
        url: fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        type: file.mimetype,
      },
    };

    // Lưu tin nhắn vào database
    const message = await MessageService.createMessage(messageData);

    // Emit socket event
    const io = req.app.get("io");
    io.to(conversationId).emit("receive-message", {
      ...message,
      conversationId,
      content: {
        url: fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        type: file.mimetype,
      },
    });

    res.status(201).json({
      status: true,
      error: 0,
      message: "Upload file thành công",
      data: {
        ...message,
        content: {
          url: fileUrl,
          fileName: file.originalname,
          fileSize: file.size,
          type: file.mimetype,
        },
      },
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({
      status: false,
      error: 500,
      message: error.message || "Lỗi khi upload file",
      data: null,
    });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  updateMessageStatus,
  deleteMessage,
  markAsRead,
  uploadImage,
  uploadMessageFile,
};
