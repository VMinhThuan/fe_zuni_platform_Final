const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const { verifyToken } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

router.use(verifyToken);

// Gửi tin nhắn mới
router.post("/", messageController.sendMessage);

// Upload và gửi tin nhắn ảnh
router.post(
  "/uploadImage",
  upload.single("image"),
  messageController.uploadImage
);

// Lấy danh sách tin nhắn trong cuộc trò chuyện
router.get("/conversation/:conversationId", messageController.getMessages);

// Cập nhật trạng thái tin nhắn
router.put("/:messageId/status", messageController.updateMessageStatus);

// Xóa tin nhắn
router.delete("/:messageId", messageController.deleteMessage);

// Đánh dấu tin nhắn đã đọc
router.post("/conversation/:conversationId/read", messageController.markAsRead);

module.exports = router;
