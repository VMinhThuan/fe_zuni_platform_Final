const userService = require("../services/userService");
const {
  validateUpdateUser,
  validateUpdatePassword,
} = require("../validation/validate");

const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const validPage = parseInt(page) || 1;
    const validLimit = parseInt(limit) || 10;

    if (validPage < 1 || validLimit < 1) {
      return res.status(400).json({
        status: false,
        error: 1,
        message: "Trang và giới hạn phải lớn hơn 0",
        data: null,
      });
    }

    const data = await userService.getUsers(validPage, validLimit, search);
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

const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        status: false,
        error: 1,
        message: "Thiếu thông tin ID người dùng",
        data: null,
      });
    }

    const data = await userService.getUser(id);
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

const updateUser = async (req, res) => {
  try {
    const { id, ...updateData } = req.body;

    const { error } = validateUpdateUser({ id, ...updateData });
    if (error) {
      return res.status(400).json({
        status: false,
        error: 1,
        message: error.details[0].message,
        data: null,
      });
    }

    const data = await userService.updateUser(id, updateData);
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

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        status: false,
        error: 1,
        message: "Thiếu thông tin ID người dùng",
        data: null,
      });
    }

    const data = await userService.deleteUser(id);
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

const createUser = async (req, res) => {
  try {
    const { email, matKhau, gioiTinh, sdt, tenNguoiDung, quyen } = req.body;
    const avatar = req.body.avatar
      ? req.body.avatar
      : process.env.DEFAULT_AVATAR_URL;

    const data = await userService.createUser({
      email,
      matKhau,
      gioiTinh,
      sdt,
      tenNguoiDung,
      quyen,
      avatar,
    });

    return res.status(201).json(data);
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

const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.userId;

    const { error } = validateUpdatePassword({ oldPassword, newPassword });
    if (error) {
      return res.status(400).json({
        status: false,
        error: 1,
        message: error.details[0].message,
        data: null,
      });
    }

    const data = await userService.updatePassword(
      userId,
      oldPassword,
      newPassword
    );
    return res.status(data.status ? 200 : 400).json(data);
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

const searchUserByPhone = async (req, res) => {
  try {
    const { phoneNumber } = req.query;
    if (!phoneNumber) {
      return res.status(400).json({
        status: false,
        error: 1,
        message: "Vui lòng nhập số điện thoại",
        data: null,
      });
    }

    const data = await userService.searchUserByPhone(phoneNumber);
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

const getUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        status: false,
        error: 1,
        message: "Thiếu thông tin ID người dùng",
        data: null,
      });
    }

    const data = await userService.getUserStatus(id);
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

const updateUserStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { isOnline } = req.body;
    let { lastActive } = req.body;

    // Đảm bảo lastActive luôn có giá trị hợp lệ
    if (!lastActive) {
      lastActive = new Date().toISOString();
    }

    const data = await userService.updateUserStatus(userId, {
      isOnline,
      lastActive,
    });

    // Emit socket event để thông báo các người dùng khác
    const io = require("../configs/socket").getIO();
    io.emit("user-status-change", {
      userId,
      status: isOnline ? "online" : "offline",
      lastActive,
    });

    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: -1,
      message: "error from server: " + error.message,
      data: null,
    });
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updatePassword,
  searchUserByPhone,
  getUserStatus,
  updateUserStatus,
};
