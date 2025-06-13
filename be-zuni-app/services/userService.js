const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const { s3 } = require("../configs/dbConfig");
const User = require("../models/User");

const S3_BUCKET = process.env.AWS_S3_BUCKET;

const getUsers = async (page = 1, limit = 10, search = "") => {
  try {
    // Nếu có search email
    if (search) {
      const user = await User.getUserByEmailOrPhone(search);
      const users = user ? [user] : [];
      return {
        status: true,
        error: 0,
        message: "Lấy danh sách người dùng thành công",
        data: {
          users: users,
          pagination: {
            totalUsers: users.length,
            currentPage: 1,
            limit: 1,
            totalPages: 1,
          },
        },
      };
    }

    // Nếu không có search, scan tất cả users
    const params = {
      TableName: "Users",
    };
    const result = await dynamodb.scan(params).promise();
    const users = result.Items;
    const totalUsers = users.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    return {
      status: true,
      error: 0,
      message: "Lấy danh sách người dùng thành công",
      data: {
        users: paginatedUsers,
        pagination: {
          totalUsers,
          currentPage: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalUsers / limit),
        },
      },
    };
  } catch (error) {
    console.log(error);
    return {
      status: false,
      error: -1,
      message: "error from server",
      data: null,
    };
  }
};

const getUser = async (userId) => {
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

    // Loại bỏ thông tin nhạy cảm
    delete user.password;
    delete user.refreshToken;

    return {
      status: true,
      error: 0,
      message: "Lấy thông tin người dùng thành công",
      data: user,
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

const updateUser = async (userId, updateData) => {
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

    // Không cho phép cập nhật refreshToken, email và mật khẩu qua route này
    delete updateData.refreshToken;
    delete updateData.email;
    delete updateData.password;

    const updatedUser = await User.updateUser(userId, updateData);

    // Loại bỏ thông tin nhạy cảm
    delete updatedUser.password;
    delete updatedUser.refreshToken;

    return {
      status: true,
      error: 0,
      message: "Cập nhật thông tin người dùng thành công",
      data: updatedUser,
    };
  } catch (error) {
    console.error("Error in updateUser:", error);
    return {
      status: false,
      error: -1,
      message: error.message,
      data: null,
    };
  }
};

const deleteUser = async (userId) => {
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

    // Xóa avatar từ S3 nếu có
    if (user.avatar) {
      const key = user.avatar.split("/").pop();
      await s3
        .deleteObject({
          Bucket: S3_BUCKET,
          Key: `avatars/${key}`,
        })
        .promise();
    }

    await User.deleteUser(userId);
    return {
      status: true,
      error: 0,
      message: "Xóa người dùng thành công",
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

const createUser = async (userData) => {
  try {
    // Tạo userId nếu chưa có
    if (!userData.userId) {
      userData.userId = uuidv4();
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.getUserByEmailOrPhone(userData.email);
    if (existingUser) {
      return {
        status: false,
        error: 1,
        message: "Email đã tồn tại",
        data: null,
      };
    }

    const user = await User.createUser(userData);

    // Loại bỏ thông tin nhạy cảm
    delete user.password;
    delete user.refreshToken;

    return {
      status: true,
      error: 0,
      message: "Tạo user thành công",
      data: user,
    };
  } catch (error) {
    console.log(error);
    return {
      status: false,
      error: -1,
      message: "error from server",
      data: null,
    };
  }
};

const updatePassword = async (userId, oldPassword, newPassword) => {
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
    const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordMatch) {
      return {
        status: false,
        error: 1,
        message: "Mật khẩu cũ không chính xác",
        data: null,
      };
    }

    // Cập nhật mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await User.updateUser(userId, { password: hashedPassword });

    return {
      status: true,
      error: 0,
      message: "Cập nhật mật khẩu thành công",
      data: null,
    };
  } catch (error) {
    console.error("Error in updatePassword:", error);
    return {
      status: false,
      error: -1,
      message: error.message,
      data: null,
    };
  }
};

const updateUserProfile = async (userId, profileData) => {
  try {
    const user = await User.getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updateData = {
      fullName: profileData.fullName || user.fullName,
      phoneNumber: profileData.phoneNumber || user.phoneNumber,
      status: profileData.status || user.status,
    };

    const updatedUser = await User.updateUser(userId, updateData);
    return updatedUser;
  } catch (error) {
    throw new Error(`Error in userService.updateUserProfile: ${error.message}`);
  }
};

const updateUserAvatar = async (userId, file) => {
  try {
    const user = await User.getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Xóa avatar cũ nếu có
    if (user.avatar) {
      const oldKey = user.avatar.split("/").pop();
      await s3
        .deleteObject({
          Bucket: S3_BUCKET,
          Key: `avatars/${oldKey}`,
        })
        .promise();
    }

    // Upload avatar mới
    const fileExtension = file.originalname.split(".").pop();
    const key = `avatars/${userId}-${Date.now()}.${fileExtension}`;

    await s3
      .putObject({
        Bucket: S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
      .promise();

    const avatarUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;

    // Cập nhật URL avatar trong database
    const updatedUser = await User.updateUser(userId, { avatar: avatarUrl });
    return updatedUser;
  } catch (error) {
    throw new Error(`Error in userService.updateUserAvatar: ${error.message}`);
  }
};

const updateUserSettings = async (userId, settings) => {
  try {
    const user = await User.getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updatedSettings = {
      ...user.settings,
      ...settings,
    };

    const updatedUser = await User.updateUser(userId, {
      settings: updatedSettings,
    });
    return updatedUser;
  } catch (error) {
    throw new Error(
      `Error in userService.updateUserSettings: ${error.message}`
    );
  }
};

const updateLastSeen = async (userId) => {
  try {
    const user = await User.getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser = await User.updateLastSeen(userId);
    return updatedUser;
  } catch (error) {
    throw new Error(`Error in userService.updateLastSeen: ${error.message}`);
  }
};

const searchUserByPhone = async (phoneNumber) => {
  try {
    const user = await User.getUserByPhone(phoneNumber);
    if (!user) {
      return {
        status: false,
        error: 1,
        message:
          "Số điện thoại chưa đăng ký tài khoản hoặc không cho phép tìm kiếm",
        data: null,
      };
    }

    // Chỉ trả về thông tin cần thiết
    const userData = {
      userId: user.userId,
      fullName: user.fullName,
      phone: user.phoneNumber,
      avatar: user.avatar,
    };

    return {
      status: true,
      error: 0,
      message: "Tìm thấy người dùng",
      data: userData,
    };
  } catch (error) {
    console.error("Error in searchUserByPhone:", error);
    return {
      status: false,
      error: -1,
      message: error.message,
      data: null,
    };
  }
};

const getUserStatus = async (userId) => {
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

    return {
      status: true,
      error: 0,
      message: "Lấy trạng thái người dùng thành công",
      data: {
        isOnline: user.isOnline || false,
        lastActive: user.lastActive || null,
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

const updateUserStatus = async (userId, statusData) => {
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

    // Đảm bảo lastActive luôn có giá trị
    const updatedStatusData = { ...statusData };
    if (
      updatedStatusData.lastActive === undefined ||
      updatedStatusData.lastActive === null
    ) {
      updatedStatusData.lastActive = new Date().toISOString();
    }

    const updatedUser = await User.updateUser(userId, updatedStatusData);

    return {
      status: true,
      error: 0,
      message: "Cập nhật trạng thái người dùng thành công",
      data: {
        isOnline: updatedUser.isOnline,
        lastActive: updatedUser.lastActive,
      },
    };
  } catch (error) {
    console.error("Error in updateUserStatus:", error);
    return {
      status: false,
      error: -1,
      message: error.message,
      data: null,
    };
  }
};

module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  createUser,
  updatePassword,
  updateUserProfile,
  updateUserAvatar,
  updateUserSettings,
  updateLastSeen,
  searchUserByPhone,
  getUserStatus,
  updateUserStatus,
};
