const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { verifyToken } = require("../middlewares/authMiddleware");

router.get("/", verifyToken, chatController.getChatList);

module.exports = router;
