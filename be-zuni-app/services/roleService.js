const Role = require("../models/Role");
const dynamodb = require("../configs/dbConfig");

const createRole = async (roleData) => {
  try {
    const existingRole = await Role.getRoleByName(roleData.tenQuyen);
    if (existingRole) {
      return {
        status: false,
        error: 1,
        message: "Quyền này đã tồn tại",
        data: null,
      };
    }

    const role = await Role.createRole(roleData);
    return {
      status: true,
      error: 0,
      message: "Tạo quyền thành công",
      data: role,
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

const getRoles = async () => {
  try {
    const roles = await Role.getAllRoles();
    return {
      status: true,
      error: 0,
      message: "Lấy danh sách quyền thành công",
      data: roles,
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

const initializeRoles = async () => {
  try {
    const defaultRoles = ["ADMIN", "USER"];
    const existingRoles = await Role.getAllRoles();

    if (existingRoles.length === 0) {
      const rolePromises = defaultRoles.map((role) =>
        Role.createRole({ tenQuyen: role })
      );
      await Promise.all(rolePromises);
      return {
        status: true,
        error: 0,
        message: "Khởi tạo dữ liệu quyền mặc định thành công",
        data: null,
      };
    }

    return {
      status: true,
      error: 0,
      message: "Dữ liệu quyền đã tồn tại",
      data: existingRoles,
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

const updateRole = async (roleId, updateData) => {
  try {
    // Kiểm tra role có tồn tại không
    const role = await Role.getRoleById(roleId);
    if (!role) {
      return {
        status: false,
        error: 1,
        message: "Không tìm thấy role",
        data: null,
      };
    }

    // Kiểm tra tên role mới có trùng với role khác không
    if (updateData.tenQuyen && updateData.tenQuyen !== role.name) {
      const existingRole = await Role.getRoleByName(updateData.tenQuyen);
      if (existingRole && existingRole.roleId !== roleId) {
        return {
          status: false,
          error: 1,
          message: "Tên quyền đã tồn tại",
          data: null,
        };
      }
    }

    // Cập nhật role
    const updatedRole = await Role.updateRole(roleId, updateData);
    return {
      status: true,
      error: 0,
      message: "Cập nhật quyền thành công",
      data: updatedRole,
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

const deleteRole = async (roleId) => {
  try {
    // Kiểm tra role có tồn tại không
    const role = await Role.getRoleById(roleId);
    if (!role) {
      return {
        status: false,
        error: 1,
        message: "Không tìm thấy role",
        data: null,
      };
    }

    // Kiểm tra xem có user nào đang sử dụng role này không
    const params = {
      TableName: "Users",
      FilterExpression: "#role = :roleName",
      ExpressionAttributeNames: {
        "#role": "role",
      },
      ExpressionAttributeValues: {
        ":roleName": role.name,
      },
    };

    const result = await dynamodb.scan(params).promise();
    if (result.Items.length > 0) {
      return {
        status: false,
        error: 1,
        message: "Không thể xóa quyền này vì đang có người dùng sử dụng",
        data: null,
      };
    }

    // Xóa role
    await Role.deleteRole(roleId);
    return {
      status: true,
      error: 0,
      message: "Xóa quyền thành công",
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

module.exports = {
  createRole,
  getRoles,
  initializeRoles,
  updateRole,
  deleteRole,
};
