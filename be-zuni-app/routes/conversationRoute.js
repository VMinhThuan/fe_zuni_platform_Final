const express = require("express");
const router = express.Router();
const conversationController = require("../controllers/conversationController");
const { verifyToken } = require("../middlewares/authMiddleware");

router.use(verifyToken);

// Route cho group chat - đặt trước các route có param để tránh conflict
router.get("/groups", conversationController.getGroupConversations);

// Các routes chính
router.post("/", conversationController.createConversation);
router.get("/", conversationController.getConversations);
router.get("/:conversationId", conversationController.getConversation);
router.put("/:conversationId", conversationController.updateConversation);
router.delete("/:conversationId", conversationController.deleteConversation);

// Routes cho participants
router.post(
  "/:conversationId/participants",
  conversationController.addParticipants
);
router.delete(
  "/:conversationId/participants",
  conversationController.removeParticipants
);

// Route cho việc rời nhóm
router.post("/:conversationId/leave", conversationController.leaveGroup);

module.exports = router;
