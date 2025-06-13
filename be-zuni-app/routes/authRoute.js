const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");
const {
  verifyResetPasswordToken,
} = require("../middlewares/resetPasswordMiddleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refreshToken", authController.refresh);
router.post("/logout", verifyToken, authController.logout);
router.get("/account", verifyToken, authController.getAccount);
router.post("/forgotPassword", authController.forgotPassword);
router.get(
  "/resetPassword/:token",
  verifyResetPasswordToken,
  authController.verifyResetPasswordToken
);
router.post(
  "/resetPassword/:token",
  verifyResetPasswordToken,
  authController.resetPassword
);
router.get("/email", authController.checkEmailExists);
router.get("/phone", authController.checkPhoneExists);

module.exports = router;
