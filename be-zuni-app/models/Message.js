const { dynamodb } = require("../configs/dbConfig");

const TABLE_NAME = "Messages";

const createMessage = async (messageData) => {
  const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const params = {
    TableName: TABLE_NAME,
    Item: {
      messageId,
      conversationId: messageData.conversationId,
      senderId: messageData.senderId,
      receiverId: messageData.receiverId,
      content: messageData.content,
      type: messageData.type || "text", // text, image, file, etc.
      status: "sent",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: messageData.metadata || {},
    },
  };

  try {
    await dynamodb.put(params).promise();
    return params.Item;
  } catch (error) {
    throw new Error(`Error creating message: ${error.message}`);
  }
};

const getMessageById = async (messageId) => {
  const params = {
    TableName: TABLE_NAME,
    Key: { messageId },
  };

  try {
    const result = await dynamodb.get(params).promise();
    return result.Item;
  } catch (error) {
    throw new Error(`Error getting message: ${error.message}`);
  }
};

const getMessagesByConversation = async (
  conversationId,
  limit = 50,
  lastEvaluatedKey = null
) => {
  console.log("Getting messages for conversation:", conversationId);
  console.log("Last evaluated key:", lastEvaluatedKey);

  const params = {
    TableName: TABLE_NAME,
    FilterExpression: "conversationId = :conversationId",
    ExpressionAttributeValues: {
      ":conversationId": conversationId,
    },
  };

  try {
    const result = await dynamodb.scan(params).promise();

    // Sort messages by createdAt in descending order
    const sortedMessages = result.Items.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Apply limit after sorting
    const limitedMessages = sortedMessages.slice(0, limit);

    return {
      success: true,
      data: {
        messages: limitedMessages,
        lastEvaluatedKey: result.LastEvaluatedKey,
      },
    };
  } catch (error) {
    console.error("Error getting messages:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

const updateMessage = async (messageId, updateData) => {
  const updateExpression = "set ";
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};

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
    Key: { messageId },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ExpressionAttributeNames: expressionAttributeNames,
    ReturnValues: "ALL_NEW",
  };

  try {
    const result = await dynamodb.update(params).promise();
    return result.Attributes;
  } catch (error) {
    throw new Error(`Error updating message: ${error.message}`);
  }
};

const updateMessageStatus = async (messageId, status) => {
  return updateMessage(messageId, { status });
};

const deleteMessage = async (messageId) => {
  const params = {
    TableName: TABLE_NAME,
    Key: { messageId },
  };

  try {
    await dynamodb.delete(params).promise();
    return true;
  } catch (error) {
    throw new Error(`Error deleting message: ${error.message}`);
  }
};

const getUnreadMessagesCount = async (userId, conversationId = null) => {
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: "receiverId = :userId AND #status = :status",
    ExpressionAttributeValues: {
      ":userId": userId,
      ":status": "sent",
    },
    ExpressionAttributeNames: {
      "#status": "status",
    },
  };

  if (conversationId) {
    params.FilterExpression += " AND conversationId = :conversationId";
    params.ExpressionAttributeValues[":conversationId"] = conversationId;
  }

  try {
    const result = await dynamodb.scan(params).promise();
    return result.Items.length;
  } catch (error) {
    throw new Error(`Error getting unread messages count: ${error.message}`);
  }
};

module.exports = {
  createMessage,
  getMessageById,
  getMessagesByConversation,
  updateMessage,
  updateMessageStatus,
  deleteMessage,
  getUnreadMessagesCount,
};
