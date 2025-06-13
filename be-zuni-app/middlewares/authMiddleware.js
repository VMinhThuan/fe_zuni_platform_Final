const jwt = require("jsonwebtoken");
const User = require("../models/User");

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: false,
        error: -1,
        message: "Không tìm thấy token xác thực",
        data: null,
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        status: false,
        error: -1,
        message: "Người dùng không tồn tại",
        data: null,
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        status: false,
        error: -1,
        message: "Tài khoản đã bị vô hiệu hóa",
        data: null,
      });
    }

    delete user.password;
    delete user.refreshToken;

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      status: false,
      error: -1,
      message: "Token không hợp lệ hoặc đã hết hạn",
      data: null,
    });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        error: -1,
        message: "Vui lòng đăng nhập",
        data: null,
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: false,
        error: -1,
        message: "Bạn không có quyền truy cập",
        data: null,
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: -1,
      message: "Lỗi server",
      data: null,
    });
  }
};

const isModerator = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        error: -1,
        message: "Vui lòng đăng nhập",
        data: null,
      });
    }

    if (req.user.role !== "admin" && req.user.role !== "moderator") {
      return res.status(403).json({
        status: false,
        error: -1,
        message: "Bạn không có quyền truy cập",
        data: null,
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: -1,
      message: "Lỗi server",
      data: null,
    });
  }
};

module.exports = {
  verifyToken,
  isAdmin,
  isModerator,
};
