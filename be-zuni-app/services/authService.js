const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const {
  sendResetPasswordEmail,
  sendWelcomeEmail,
} = require("../utils/emailService");
const { validateResetPassword } = require("../validation/validate");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

const register = async (userData) => {
  try {
    // Kiểm tra email đã tồn tại chưa
    const existingUserByEmail = await User.getUserByEmailOrPhone(
      userData.email
    );
    if (existingUserByEmail) {
      return {
        status: false,
        error: 1,
        message: "Email đã tồn tại. Vui lòng sử dụng email khác",
        data: null,
      };
    }

    // Kiểm tra số điện thoại đã tồn tại chưa
    const existingUserByPhone = await User.getUserByPhone(userData.phoneNumber);
    if (existingUserByPhone) {
      return {
        status: false,
        error: 2,
        message:
          "Số điện thoại đã tồn tại. Vui lòng sử dụng số điện thoại khác",
        data: null,
      };
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    // Tạo user mới
    const newUser = await User.createUser({
      ...userData,
      password: hashedPassword,
      userId: uuidv4(),
      isActive: true,
      role: "USER",
    });

    // Tạo token
    const accessToken = jwt.sign({ userId: newUser.userId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign({ userId: newUser.userId }, JWT_SECRET, {
      expiresIn: "7d",
    });

    // Cập nhật refresh token
    await User.updateUser(newUser.userId, { refreshToken });

    // Gửi email chào mừng
    try {
      await sendWelcomeEmail(newUser.email, newUser.fullName);
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
    }

    // Loại bỏ thông tin nhạy cảm
    delete newUser.password;
    delete newUser.refreshToken;

    return {
      status: true,
      error: 0,
      message: "Đăng ký thành công",
      data: {
        user: newUser,
        accessToken,
      },
    };
  } catch (error) {
    console.error("Error in register:", error);
    return {
      status: false,
      error: -1,
      message: error.message,
      data: null,
    };
  }
};

const login = async (account, password) => {
  try {
    // Tìm user bằng account
    const user = await User.getUserByEmailOrPhone(account);

    if (!user || !user.isActive) {
      return {
        status: false,
        error: 1,
        message: "Tài khoản hoặc mật khẩu không chính xác",
        data: null,
      };
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return {
        status: false,
        error: 1,
        message: "Tài khoản hoặc mật khẩu không chính xác",
        data: null,
      };
    }

    // Tạo token
    const accessToken = jwt.sign({ userId: user.userId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign({ userId: user.userId }, JWT_SECRET, {
      expiresIn: "7d",
    });

    // Cập nhật refresh token
    await User.updateUser(user.userId, { refreshToken });

    // Cập nhật last seen
    await User.updateLastSeen(user.userId);

    // Loại bỏ thông tin nhạy cảm
    delete user.password;

    return {
      status: true,
      error: 0,
      message: "Đăng nhập thành công",
      data: {
        user,
        accessToken,
        refreshToken,
      },
    };
  } catch (error) {
    console.log(error);
    return {
      status: false,
      error: -1,
      message: error.message,
      data: null,
    };
  }
};

const refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const user = await User.getUserById(decoded.userId);

    if (!user || !user.isActive || user.refreshToken !== refreshToken) {
      return {
        status: false,
        error: 1,
        message: "Refresh token không hợp lệ",
        data: null,
      };
    }

    const newAccessToken = jwt.sign({ userId: user.userId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return {
      status: true,
      error: 0,
      message: "Tạo access token mới thành công",
      data: {
        accessToken: newAccessToken,
      },
    };
  } catch (error) {
    return {
      status: false,
      error: -1,
      message: "Refresh token không hợp lệ hoặc đã hết hạn",
      data: null,
    };
  }
};

const logout = async (userId) => {
  try {
    await User.updateUser(userId, { refreshToken: null });
    return {
      status: true,
      error: 0,
      message: "Đăng xuất thành công",
      data: null,
    };
  } catch (error) {
    return {
      status: false,
      error: -1,
      message: error.message,
      data: null,
    };
  }
};

const forgotPassword = async (email) => {
  try {
    const user = await User.getUserByEmailOrPhone(email);

    if (!user) {
      return {
        status: false,
        error: 1,
        message: "Email không tồn tại trong hệ thống",
        data: null,
      };
    }

    // Tạo token reset password
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Cập nhật token và thời gian hết hạn
    await User.updateUser(user.userId, {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: Date.now() + 15 * 60 * 1000, // 15 phút
    });

    // Tạo URL reset password
    const resetURL = `${process.env.FRONTEND_URL}/resetPassword/${resetToken}`;

    // Gửi email
    const emailResult = await sendResetPasswordEmail(
      user.email,
      user.fullName,
      resetURL
    );

    if (!emailResult.status) {
      return {
        status: false,
        error: -1,
        message: "Lỗi khi gửi email: " + emailResult.message,
        data: null,
      };
    }

    return {
      status: true,
      error: 0,
      message: "Link đặt lại mật khẩu đã được gửi đến email của bạn",
      data: null,
    };
  } catch (error) {
    return {
      status: false,
      error: -1,
      message: error.message,
      data: null,
    };
  }
};

const resetPassword = async (userId, newPassword) => {
  try {
    const { error } = validateResetPassword({ password: newPassword });
    if (error) {
      return {
        status: false,
        error: 1,
        message: error.details[0].message,
        data: null,
      };
    }

    // Mã hóa mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Cập nhật mật khẩu và xóa token
    await User.updateUser(userId, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return {
      status: true,
      error: 0,
      message: "Đặt lại mật khẩu thành công",
      data: null,
    };
  } catch (error) {
    return {
      status: false,
      error: -1,
      message: error.message,
      data: null,
    };
  }
};

const getAccount = async (userId) => {
  try {
    const user = await User.getUserById(userId);
    if (!user) {
      return {
        status: false,
        error: 1,
        message: "Không tìm thấy thông tin tài khoản",
        data: null,
      };
    }

    delete user.password;
    delete user.refreshToken;

    return {
      status: true,
      error: 0,
      message: "Lấy thông tin tài khoản thành công",
      data: {
        user,
      },
    };
  } catch (error) {
    return {
      status: false,
      error: -1,
      message: error.message,
      data: null,
    };
  }
};

const changePassword = async (userId, oldPassword, newPassword) => {
  try {
    const user = await User.getUserById(userId);
    if (!user) {
      return {
        status: false,
        error: 1,
        message: "Không tìm thấy người dùng",
        data: null,
      };
    }

    // Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return {
        status: false,
        error: 1,
        message: "Mật khẩu cũ không chính xác",
        data: null,
      };
    }

    // Mã hóa mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Cập nhật mật khẩu
    await User.updateUser(userId, {
      password: hashedPassword,
    });

    return {
      status: true,
      error: 0,
      message: "Đổi mật khẩu thành công",
      data: null,
    };
  } catch (error) {
    return {
      status: false,
      error: -1,
      message: error.message,
      data: null,
    };
  }
};

const checkEmailExists = async (email) => {
  try {
    const result = await User.checkEmailExists(email);
    return result;
  } catch (error) {
    console.error("Error checking email existence:", error);
    throw error;
  }
};

const checkPhoneExists = async (phoneNumber) => {
  try {
    const result = await User.checkPhoneExists(phoneNumber);
    return result;
  } catch (error) {
    console.error("Error checking phone number existence:", error);
    throw error;
  }
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
  getAccount,
  changePassword,
  checkEmailExists,
  checkPhoneExists,
};
