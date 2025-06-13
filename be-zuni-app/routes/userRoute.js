const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { verifyToken } = require("../middlewares/authMiddleware");

router.use(verifyToken);

router.get("/", userController.getUsers);
router.get("/search", userController.searchUserByPhone);
router.get("/:id", userController.getUser);
router.post("/", userController.createUser);
router.put("/", userController.updateUser);
router.put("/changePassword", userController.updatePassword);
router.delete("/:id", userController.deleteUser);
router.get("/:id/status", userController.getUserStatus);
router.post("/status", userController.updateUserStatus);

module.exports = router;
