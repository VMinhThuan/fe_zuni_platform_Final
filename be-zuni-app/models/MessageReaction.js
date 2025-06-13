const { dynamodb } = require("../configs/dbConfig");

const TABLE_NAME = "MessageReactions";

const addReaction = async (reactionData) => {
  const { messageId, userId, type } = reactionData;
  const reactionId = `${messageId}:${userId}`;

  try {
    // Kiểm tra xem reaction đã tồn tại chưa
    const existingReaction = await getReactionById(reactionId);

    const params = {
      TableName: TABLE_NAME,
      Item: {
        reactionId,
        messageId,
        userId,
        type: type || "heart", // Mặc định là heart
        count: existingReaction ? existingReaction.count + 1 : 1,
        createdAt: existingReaction
          ? existingReaction.createdAt
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    await dynamodb.put(params).promise();
    console.log(
      `Reaction saved with count=${params.Item.count}, id=${reactionId}`
    );
    return params.Item;
  } catch (error) {
    console.error(`Error adding reaction: ${error.message}`);
    throw new Error(`Error adding reaction: ${error.message}`);
  }
};

const removeReaction = async (messageId, userId) => {
  const reactionId = `${messageId}:${userId}`;

  const params = {
    TableName: TABLE_NAME,
    Key: { reactionId },
  };

  try {
    await dynamodb.delete(params).promise();
    return true;
  } catch (error) {
    console.error(`Error removing reaction: ${error.message}`);
    throw new Error(`Error removing reaction: ${error.message}`);
  }
};

const getReactionById = async (reactionId) => {
  const params = {
    TableName: TABLE_NAME,
    Key: { reactionId },
  };

  try {
    const result = await dynamodb.get(params).promise();
    return result.Item || null;
  } catch (error) {
    console.error(`Error getting reaction: ${error.message}`);
    return null;
  }
};

const getReactionsByMessageId = async (messageId) => {
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: "messageId = :messageId",
    ExpressionAttributeValues: {
      ":messageId": messageId,
    },
  };

  try {
    const result = await dynamodb.scan(params).promise();
    return result.Items || [];
  } catch (error) {
    console.error(`Error getting reactions: ${error.message}`);
    return [];
  }
};

const getReactionsForMessages = async (messageIds) => {
  if (!messageIds || !messageIds.length) {
    return {};
  }

  try {
    // Tạo biểu thức lọc với OR
    let filterExpression = "";
    const expressionAttributeValues = {};

    messageIds.forEach((messageId, index) => {
      if (index > 0) filterExpression += " OR ";
      filterExpression += `messageId = :messageId${index}`;
      expressionAttributeValues[`:messageId${index}`] = messageId;
    });

    const params = {
      TableName: TABLE_NAME,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    };

    const result = await dynamodb.scan(params).promise();

    // Nhóm kết quả theo messageId
    const reactionsMap = {};

    if (result.Items && result.Items.length > 0) {
      result.Items.forEach((reaction) => {
        if (!reactionsMap[reaction.messageId]) {
          reactionsMap[reaction.messageId] = {};
        }

        reactionsMap[reaction.messageId][reaction.userId] = {
          type: reaction.type,
          count: reaction.count,
        };
      });
    }

    return reactionsMap;
  } catch (error) {
    console.error(`Error getting reactions for messages: ${error.message}`);
    return {};
  }
};

module.exports = {
  addReaction,
  removeReaction,
  getReactionById,
  getReactionsByMessageId,
  getReactionsForMessages,
};
