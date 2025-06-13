const { dynamodb } = require("../configs/dbConfig");

const TABLE_NAME = "Users";

const createUser = async (userData) => {
  const params = {
    TableName: TABLE_NAME,
    Item: {
      userId: userData.userId,
      email: userData.email || userData.account,
      password: userData.password,
      phoneNumber: userData.phoneNumber,
      fullName: userData.fullName,
      gender: userData.gender || "Nam",
      dateOfBirth: userData.dateOfBirth,
      avatar:
        userData.avatar ||
        "https://d2pg3f08ixuznn.cloudfront.net/avatars/m5wq-1744722089914-defaultAvatar.jpg",
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      role: userData.role || "USER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      contacts: userData.contacts || [],
      friendRequests: userData.friendRequests || [],
      settings: userData.settings || {
        notifications: true,
        theme: "light",
        language: "vi",
      },
    },
  };

  try {
    await dynamodb.put(params).promise();
    return params.Item;
  } catch (error) {
    console.error("Error creating user in DynamoDB:", error);
    throw new Error(`Error creating user: ${error.message}`);
  }
};

const getUserById = async (userId) => {
  const params = {
    TableName: TABLE_NAME,
    Key: { userId },
  };

  try {
    const result = await dynamodb.get(params).promise();

    if (!result.Item) {
      return null;
    }

    return result.Item;
  } catch (error) {
    console.error("Error getting user from DynamoDB:", error);
    throw new Error(`Error getting user: ${error.message}`);
  }
};

const updateUser = async (userId, updateData) => {
  let updateExpression = "set ";
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};

  if (
    updateData.hasOwnProperty("lastActive") &&
    (updateData.lastActive === undefined || updateData.lastActive === null)
  ) {
    updateData.lastActive = new Date().toISOString();
  }

  if (
    updateData.hasOwnProperty("isOnline") &&
    (updateData.isOnline === undefined || updateData.isOnline === null)
  ) {
    updateData.isOnline = false;
  }

  Object.keys(updateData).forEach((key) => {
    updateExpression += `#${key} = :${key}, `;
    expressionAttributeValues[`:${key}`] = updateData[key];
    expressionAttributeNames[`#${key}`] = key;
  });

  updateExpression += "#updatedAt = :updatedAt";
  expressionAttributeValues[":updatedAt"] = new Date().toISOString();
  expressionAttributeNames["#updatedAt"] = "updatedAt";

  const params = {
    TableName: TABLE_NAME,
    Key: { userId },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ExpressionAttributeNames: expressionAttributeNames,
    ReturnValues: "ALL_NEW",
  };

  try {
    const result = await dynamodb.update(params).promise();
    return result.Attributes;
  } catch (error) {
    console.error("Error updating user:", error);
    throw new Error(`Error updating user: ${error.message}`);
  }
};

const deleteUser = async (userId) => {
  const params = {
    TableName: TABLE_NAME,
    Key: { userId },
  };

  try {
    await dynamodb.delete(params).promise();
    return true;
  } catch (error) {
    throw new Error(`Error deleting user: ${error.message}`);
  }
};

const updateLastSeen = async (userId) => {
  return updateUser(userId, { lastSeen: new Date().toISOString() });
};

const addContact = async (userId, contactId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const contacts = user.contacts || [];
  if (!contacts.includes(contactId)) {
    contacts.push(contactId);
    return updateUser(userId, { contacts });
  }

  return user;
};

const removeContact = async (userId, contactId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const contacts = (user.contacts || []).filter((id) => id !== contactId);
  return updateUser(userId, { contacts });
};

const getUserByEmailOrPhone = async (account) => {
  try {
    const params = {
      TableName: "Users",
      FilterExpression: "email = :account OR phoneNumber = :account",
      ExpressionAttributeValues: {
        ":account": account,
      },
    };

    const result = await dynamodb.scan(params).promise();
    return result.Items[0];
  } catch (error) {
    console.error("Error in getUserByEmailOrPhone:", error);
    throw error;
  }
};

const getUserByPhone = async (phoneNumber) => {
  try {
    const params = {
      TableName: "Users",
      FilterExpression: "phoneNumber = :phoneNumber",
      ExpressionAttributeValues: {
        ":phoneNumber": phoneNumber,
      },
    };

    const result = await dynamodb.scan(params).promise();
    return result.Items[0] || null;
  } catch (error) {
    console.error("Error in getUserByPhone:", error);
    throw error;
  }
};

const checkEmailExists = async (email) => {
  try {
    const params = {
      TableName: "Users",
      FilterExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": email,
      },
    };

    const result = await dynamodb.scan(params).promise();
    return {
      exists: result.Items.length > 0,
    };
  } catch (error) {
    console.error("Error checking email existence:", error);
    throw error;
  }
};

const checkPhoneExists = async (phoneNumber) => {
  try {
    const params = {
      TableName: "Users",
      FilterExpression: "phoneNumber = :phoneNumber",
      ExpressionAttributeValues: {
        ":phoneNumber": phoneNumber,
      },
    };

    const result = await dynamodb.scan(params).promise();
    return {
      exists: result.Items.length > 0,
    };
  } catch (error) {
    console.error("Error checking phone number existence:", error);
    throw error;
  }
};

const getUserByResetToken = async (resetPasswordToken) => {
  try {
    const params = {
      TableName: "Users",
      FilterExpression:
        "resetPasswordToken = :token AND resetPasswordExpires > :now",
      ExpressionAttributeValues: {
        ":token": resetPasswordToken,
        ":now": Date.now(),
      },
    };

    const result = await dynamodb.scan(params).promise();
    return result.Items[0] || null;
  } catch (error) {
    console.error("Error in getUserByResetToken:", error);
    throw error;
  }
};

const addFriendRequest = async (userId, requesterId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  let friendRequests = user.friendRequests || [];

  if (!Array.isArray(friendRequests)) {
    friendRequests = [];
  }

  if (!friendRequests.includes(requesterId)) {
    friendRequests.push(requesterId);

    const params = {
      TableName: TABLE_NAME,
      Key: { userId },
      UpdateExpression:
        "SET friendRequests = :friendRequests, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":friendRequests": friendRequests,
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    };

    try {
      const result = await dynamodb.update(params).promise();
      return result.Attributes;
    } catch (error) {
      console.error("Error in addFriendRequest:", error);
      throw error;
    }
  }

  return user;
};

const removeFriendRequest = async (userId, requesterId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  let friendRequests = user.friendRequests || [];

  if (!Array.isArray(friendRequests)) {
    friendRequests = [];
  }

  friendRequests = friendRequests.filter((id) => id !== requesterId);

  const params = {
    TableName: TABLE_NAME,
    Key: { userId },
    UpdateExpression:
      "SET friendRequests = :friendRequests, updatedAt = :updatedAt",
    ExpressionAttributeValues: {
      ":friendRequests": friendRequests,
      ":updatedAt": new Date().toISOString(),
    },
    ReturnValues: "ALL_NEW",
  };

  try {
    const result = await dynamodb.update(params).promise();
    return result.Attributes;
  } catch (error) {
    console.error("Error in removeFriendRequest:", error);
    throw error;
  }
};

module.exports = {
  createUser,
  getUserById,
  getUserByPhone,
  getUserByEmailOrPhone,
  updateUser,
  deleteUser,
  updateLastSeen,
  addContact,
  removeContact,
  checkEmailExists,
  checkPhoneExists,
  getUserByResetToken,
  addFriendRequest,
  removeFriendRequest,
};
