const express = require("express");
const router = express.Router();
const reactionController = require("../controllers/reactionController");
const { verifyToken } = require("../middlewares/authMiddleware");

router.use(verifyToken);

// Thêm reaction cho tin nhắn
router.post("/", reactionController.addReaction);

// Xóa reaction của người dùng hiện tại khỏi một tin nhắn
router.delete("/:messageId/:conversationId", reactionController.removeReaction);

// Lấy tất cả reaction cho một tin nhắn
router.get("/:messageId", reactionController.getMessageReactions);

// Lấy reaction cho nhiều tin nhắn (sử dụng POST vì có request body)
router.post("/batch", reactionController.getReactionsForMessages);

module.exports = router;
