const { dynamodb } = require("../configs/dbConfig");
const { v4: uuidv4 } = require("uuid");

const TABLE_NAME = "Roles";

// Tạo role mới
const createRole = async (roleData) => {
  try {
    const roleId = uuidv4();
    const timestamp = Date.now();

    const params = {
      TableName: TABLE_NAME,
      Item: {
        roleId,
        name: roleData.tenQuyen,
        description: roleData.moTa || "",
        permissions: roleData.quyenHan || [],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    };

    await dynamodb.put(params).promise();

    return {
      roleId,
      name: roleData.tenQuyen,
      description: roleData.moTa || "",
      permissions: roleData.quyenHan || [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  } catch (error) {
    throw new Error(`Error in Role.createRole: ${error.message}`);
  }
};

// Lấy role theo ID
const getRoleById = async (roleId) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: { roleId },
    };

    const result = await dynamodb.get(params).promise();
    return result.Item;
  } catch (error) {
    throw new Error(`Error in Role.getRoleById: ${error.message}`);
  }
};

// Lấy role theo tên
const getRoleByName = async (name) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      IndexName: "NameIndex",
      KeyConditionExpression: "#name = :name",
      ExpressionAttributeNames: {
        "#name": "name",
      },
      ExpressionAttributeValues: {
        ":name": name,
      },
    };

    const result = await dynamodb.query(params).promise();
    return result.Items[0];
  } catch (error) {
    throw new Error(`Error in Role.getRoleByName: ${error.message}`);
  }
};

// Lấy tất cả roles
const getAllRoles = async () => {
  try {
    const params = {
      TableName: TABLE_NAME,
    };

    const result = await dynamodb.scan(params).promise();
    return result.Items;
  } catch (error) {
    throw new Error(`Error in Role.getAllRoles: ${error.message}`);
  }
};

// Cập nhật role
const updateRole = async (roleId, updateData) => {
  try {
    const timestamp = Date.now();

    // Xây dựng biểu thức cập nhật
    let updateExpression = "SET #updatedAt = :updatedAt";
    let expressionAttributeNames = {
      "#updatedAt": "updatedAt",
    };
    let expressionAttributeValues = {
      ":updatedAt": timestamp,
    };

    // Thêm các trường cần cập nhật
    if (updateData.tenQuyen) {
      updateExpression += ", #name = :name";
      expressionAttributeNames["#name"] = "name";
      expressionAttributeValues[":name"] = updateData.tenQuyen;
    }

    if (updateData.moTa !== undefined) {
      updateExpression += ", #description = :description";
      expressionAttributeNames["#description"] = "description";
      expressionAttributeValues[":description"] = updateData.moTa;
    }

    if (updateData.quyenHan) {
      updateExpression += ", #permissions = :permissions";
      expressionAttributeNames["#permissions"] = "permissions";
      expressionAttributeValues[":permissions"] = updateData.quyenHan;
    }

    const params = {
      TableName: TABLE_NAME,
      Key: { roleId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    };

    const result = await dynamodb.update(params).promise();
    return result.Attributes;
  } catch (error) {
    throw new Error(`Error in Role.updateRole: ${error.message}`);
  }
};

// Xóa role
const deleteRole = async (roleId) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: { roleId },
    };

    await dynamodb.delete(params).promise();
    return true;
  } catch (error) {
    throw new Error(`Error in Role.deleteRole: ${error.message}`);
  }
};

module.exports = {
  createRole,
  getRoleById,
  getRoleByName,
  getAllRoles,
  updateRole,
  deleteRole,
};
