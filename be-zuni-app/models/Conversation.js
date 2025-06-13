const { dynamodb } = require("../configs/dbConfig");

const TABLE_NAME = "Conversations";

const createConversation = async (conversationData) => {
  const conversationId = `${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  const params = {
    TableName: TABLE_NAME,
    Item: {
      conversationId,
      participants: conversationData.participants,
      type: conversationData.type || "direct",
      name: conversationData.name || null,
      avatar: conversationData.avatar || null,
      lastMessage: conversationData.lastMessage || null,
      lastMessageTime:
        conversationData.lastMessageTime || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: conversationData.settings || {
        notifications: true,
      },
    },
  };

  try {
    await dynamodb.put(params).promise();
    return params.Item;
  } catch (error) {
    throw new Error(`Error creating conversation: ${error.message}`);
  }
};

const getConversationById = async (conversationId) => {
  const params = {
    TableName: TABLE_NAME,
    Key: { conversationId },
  };

  try {
    const result = await dynamodb.get(params).promise();
    return result.Item;
  } catch (error) {
    throw new Error(`Error getting conversation: ${error.message}`);
  }
};

const getConversationsByUser = async (userId) => {
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: "contains(participants, :userId)",
    ExpressionAttributeValues: {
      ":userId": userId,
    },
  };

  try {
    const result = await dynamodb.scan(params).promise();
    return result.Items;
  } catch (error) {
    throw new Error(`Error getting conversations: ${error.message}`);
  }
};

const updateConversation = async (conversationId, updateData) => {
  let updateExpression = "set ";
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};

  Object.keys(updateData).forEach((key) => {
    updateExpression += `#${key} = :${key}, `;
    expressionAttributeValues[`:${key}`] = updateData[key];
    expressionAttributeNames[`#${key}`] = key;
  });

  // Xóa dấu phẩy cuối cùng và thêm updatedAt
  updateExpression =
    updateExpression.slice(0, -2) + ", #updatedAt = :updatedAt";
  expressionAttributeValues[":updatedAt"] = new Date().toISOString();
  expressionAttributeNames["#updatedAt"] = "updatedAt";

  const params = {
    TableName: TABLE_NAME,
    Key: { conversationId },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ExpressionAttributeNames: expressionAttributeNames,
    ReturnValues: "ALL_NEW",
  };

  try {
    const result = await dynamodb.update(params).promise();
    return result.Attributes;
  } catch (error) {
    throw new Error(`Error updating conversation: ${error.message}`);
  }
};

const deleteConversation = async (conversationId) => {
  const params = {
    TableName: TABLE_NAME,
    Key: { conversationId },
  };

  try {
    await dynamodb.delete(params).promise();
    return true;
  } catch (error) {
    throw new Error(`Error deleting conversation: ${error.message}`);
  }
};

const findDirectConversation = async (userId1, userId2) => {
  const params = {
    TableName: TABLE_NAME,
    FilterExpression:
      "contains(participants, :userId1) AND contains(participants, :userId2) AND #type = :type",
    ExpressionAttributeValues: {
      ":userId1": userId1,
      ":userId2": userId2,
      ":type": "direct",
    },
    ExpressionAttributeNames: {
      "#type": "type",
    },
  };

  try {
    const result = await dynamodb.scan(params).promise();
    return result.Items[0] || null;
  } catch (error) {
    throw new Error(`Error finding direct conversation: ${error.message}`);
  }
};

const updateLastMessage = async (conversationId, messageData) => {
  return updateConversation(conversationId, {
    lastMessage: {
      content: messageData.content,
      type: messageData.type || "text",
      senderId: messageData.senderId,
      timestamp: new Date().toISOString(),
    },
    lastMessageTime: new Date().toISOString(),
  });
};

module.exports = {
  createConversation,
  getConversationById,
  getConversationsByUser,
  updateConversation,
  deleteConversation,
  findDirectConversation,
  updateLastMessage,
};
