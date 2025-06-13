const express = require("express");
const router = express.Router();
const friendController = require("../controllers/friendController");
const { verifyToken } = require("../middlewares/authMiddleware");

router.use(verifyToken);

router.get("/", friendController.getFriends);
router.get("/requests", friendController.getFriendRequests);
router.post("/request", friendController.sendFriendRequest);
router.post("/accept/:friendId", friendController.acceptFriendRequest);
router.post("/reject/:friendId", friendController.rejectFriendRequest);
router.get("/checkRequest/:targetId", friendController.checkSentFriendRequest);
router.get(
  "/checkReceivedRequest/:targetId",
  friendController.checkReceivedFriendRequest
);
router.delete("/:friendId", friendController.removeFriend);

module.exports = router;
