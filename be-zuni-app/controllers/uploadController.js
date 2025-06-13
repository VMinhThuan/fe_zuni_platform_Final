const uploadService = require("../services/uploadService");
const User = require("../models/User");
const {
  getConversationById,
  updateConversation,
} = require("../models/Conversation");

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: false,
        error: 1,
        message: "Không có file nào được tải lên",
        data: null,
      });
    }

    const fileUrl = await uploadService.uploadToS3(req.file, "avatars");

    // Cập nhật avatar trong user profile
    await User.updateUser(req.user.userId, { avatar: fileUrl });

    res.status(200).json({
      status: true,
      error: 0,
      message: "Tải lên avatar thành công",
      data: {
        avatar: fileUrl,
      },
    });
  } catch (error) {
    console.error("Error in uploadAvatar:", error);
    res.status(500).json({
      status: false,
      error: -1,
      message: "Lỗi khi tải lên avatar",
      data: null,
    });
  }
};

const uploadFile = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        status: false,
        message: "Vui lòng chọn file",
      });
    }

    // Upload file lên S3
    const fileUrl = await uploadService.uploadToS3(file, "chatFiles");

    res.status(200).json({
      status: true,
      data: {
        url: fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        type: file.mimetype,
      },
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({
      status: false,
      message: "Có lỗi xảy ra khi tải file lên",
    });
  }
};

const uploadGroupAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: false,
        error: -1,
        message: "Vui lòng chọn ảnh đại diện",
        data: null,
      });
    }

    if (!req.body.conversationId) {
      return res.status(400).json({
        status: false,
        error: -1,
        message: "Thiếu conversationId",
        data: null,
      });
    }

    const conversation = await getConversationById(req.body.conversationId);
    if (!conversation) {
      return res.status(404).json({
        status: false,
        error: -1,
        message: "Không tìm thấy cuộc trò chuyện",
        data: null,
      });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({
        status: false,
        error: -1,
        message: "Chỉ có thể thay đổi avatar cho nhóm chat",
        data: null,
      });
    }

    if (!conversation.participants.includes(req.user.userId)) {
      return res.status(403).json({
        status: false,
        error: -1,
        message: "Bạn không phải thành viên của nhóm này",
        data: null,
      });
    }

    // Upload ảnh lên S3
    const result = await uploadService.uploadToS3(req.file, "groupAvatars");
    if (!result) {
      return res.status(500).json({
        status: false,
        error: -1,
        message: "Lỗi khi tải lên ảnh",
        data: null,
      });
    }

    // Cập nhật avatar cho conversation
    await updateConversation(conversation.conversationId, {
      avatar: result,
    });

    return res.status(200).json({
      status: true,
      error: 0,
      message: "Tải lên avatar thành công",
      data: {
        avatar: result,
      },
    });
  } catch (error) {
    console.error("Error in uploadGroupAvatar:", error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: "Lỗi khi tải lên avatar nhóm",
      data: null,
    });
  }
};

module.exports = {
  uploadAvatar,
  uploadFile,
  uploadGroupAvatar,
};
