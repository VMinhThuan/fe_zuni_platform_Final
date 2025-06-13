const authService = require("../services/authService");
const { validateRegister } = require("../validation/validate");

const register = async (req, res) => {
  try {
    const { error } = validateRegister(req.body);
    if (error) {
      return res.status(400).json({
        status: false,
        error: 1,
        message: error.details[0].message,
        data: null,
      });
    }

    const data = await authService.register(req.body);

    if (data.error === 0) {
      // Set refresh token vào cookie
      res.cookie("refreshToken", data.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Không trả về refresh token trong response
      const { refreshToken, ...responseData } = data.data;
      return res.status(200).json({
        ...data,
        data: responseData,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: "error from server",
      data: null,
    });
  }
};

const login = async (req, res) => {
  try {
    const { account, password } = req.body;
    if (!account || !password) {
      return res.status(400).json({
        status: false,
        error: 1,
        message: "Thiếu thông tin đăng nhập",
        data: null,
      });
    }

    const data = await authService.login(account, password);

    if (data.error === 0) {
      res.cookie("refreshToken", data.data.refreshToken, {
        httpOnly: true,
        secure: false, // Set to false for development
        sameSite: "lax",
        domain: "localhost",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Không trả về refresh token trong response
      const { refreshToken, ...responseData } = data.data;
      return res.status(200).json({
        ...data,
        data: responseData,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: "error from server",
      data: null,
    });
  }
};

const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        status: false,
        error: 1,
        message: "Không tìm thấy refresh token",
        data: null,
      });
    }

    const data = await authService.refreshAccessToken(refreshToken);
    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: "error from server",
      data: null,
    });
  }
};

const logout = async (req, res) => {
  try {
    const data = await authService.logout(req.user.userId);
    res.clearCookie("refreshToken");
    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: "error from server",
      data: null,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        status: false,
        error: 1,
        message: "Vui lòng cung cấp email",
        data: null,
      });
    }

    const data = await authService.forgotPassword(email);
    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: "error from server",
      data: null,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        status: false,
        error: 1,
        message: "Thiếu thông tin cần thiết",
        data: null,
      });
    }

    const data = await authService.resetPassword(req.userId, password);
    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: "error from server",
      data: null,
    });
  }
};

const getAccount = async (req, res) => {
  try {
    const delay = req.headers.delay ? parseInt(req.headers.delay) : 0;

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const data = await authService.getAccount(req.user.userId);
    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: "error from server",
      data: null,
    });
  }
};

const checkEmailExists = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({
        status: false,
        error: 1,
        message: "Email không được để trống",
        data: null,
      });
    }

    const result = await authService.checkEmailExists(email);
    return res.status(200).json({
      status: true,
      error: 0,
      message: result.exists ? "Email đã tồn tại" : "Email có thể sử dụng",
      data: result,
    });
  } catch (error) {
    console.error("Error in checkEmailExists controller:", error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: "Lỗi server",
      data: null,
    });
  }
};

const checkPhoneExists = async (req, res) => {
  try {
    const { phoneNumber } = req.query;
    if (!phoneNumber) {
      return res.status(400).json({
        status: false,
        error: 1,
        message: "Số điện thoại không được để trống",
        data: null,
      });
    }

    const result = await authService.checkPhoneExists(phoneNumber);
    return res.status(200).json({
      status: true,
      error: 0,
      message: result.exists
        ? "Số điện thoại đã tồn tại"
        : "Số điện thoại có thể sử dụng",
      data: result,
    });
  } catch (error) {
    console.error("Error in checkPhoneExists controller:", error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: "Lỗi server",
      data: null,
    });
  }
};

const verifyResetPasswordToken = async (req, res) => {
  try {
    return res.status(200).json({
      status: true,
      error: 0,
      message: "Token hợp lệ",
      data: null,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: "error from server",
      data: null,
    });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getAccount,
  checkEmailExists,
  checkPhoneExists,
  verifyResetPasswordToken,
};
