const express = require("express");
const router = express.Router();
const uploadController = require("../controllers/uploadController");
const upload = require("../middlewares/uploadMiddleware");
const { verifyToken } = require("../middlewares/authMiddleware");

router.post(
  "/avatar",
  verifyToken,
  upload.single("avatar"),
  uploadController.uploadAvatar
);

router.post(
  "/groupAvatar",
  verifyToken,
  upload.single("avatar"),
  uploadController.uploadGroupAvatar
);

router.post(
  "/file",
  verifyToken,
  upload.single("file"),
  uploadController.uploadFile
);

module.exports = router;
