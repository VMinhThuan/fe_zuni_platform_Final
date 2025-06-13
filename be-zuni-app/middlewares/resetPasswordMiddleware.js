const crypto = require("crypto");
const User = require("../models/User");

const verifyResetPasswordToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        status: false,
        error: 1,
        message: "Token không hợp lệ",
        data: null,
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Tìm user với token hợp lệ
    const user = await User.getUserByResetToken(hashedToken);

    if (!user) {
      return res.status(400).json({
        status: false,
        error: 1,
        message: "Token không hợp lệ hoặc đã hết hạn",
        data: null,
      });
    }

    // Lưu thông tin token hợp lệ vào request để sử dụng ở các middleware tiếp theo
    req.resetPasswordToken = hashedToken;
    req.userId = user.userId;

    next();
  } catch (error) {
    console.error("Error in verifyResetPasswordToken:", error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: "Lỗi server",
      data: null,
    });
  }
};

module.exports = {
  verifyResetPasswordToken,
};
