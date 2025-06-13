const { dynamodb } = require("../configs/dbConfig");
const Conversation = require("../models/Conversation");
const User = require("../models/User");

const TABLE_NAME = "Messages";

const createMessage = async (messageData) => {
  const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Lấy thông tin conversation để kiểm tra loại (private hay group)
  const conversationResult = await dynamodb
    .get({
      TableName: "Conversations",
      Key: { conversationId: messageData.conversationId },
    })
    .promise();

  const conversation = conversationResult.Item;

  // Lấy thông tin người gửi cho mọi loại tin nhắn
  const sender = await User.getUserById(messageData.senderId);
  if (!sender) {
    throw new Error("Sender not found");
  }

  const senderInfo = {
    senderName: sender.fullName,
    senderAvatar: sender.avatar,
  };

  const params = {
    TableName: TABLE_NAME,
    Item: {
      conversationId: messageData.conversationId,
      messageId,
      senderId: messageData.senderId,
      receiverId: messageData.receiverId,
      content: messageData.content,
      type: messageData.type || "text",
      status: "sent",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: messageData.metadata || {},
      ...senderInfo, // Thêm thông tin người gửi cho mọi tin nhắn
    },
  };

  try {
    await dynamodb.put(params).promise();

    // Xử lý khác nhau dựa trên loại cuộc trò chuyện
    if (conversation) {
      if (conversation.type === "group") {
        console.log(
          `Tin nhắn nhóm từ ${sender.fullName} tới nhóm "${
            conversation.name || "Nhóm không tên"
          }" (ID: ${conversation.conversationId})`
        );

        // Ghi log danh sách thành viên nhóm
        if (conversation.participants && conversation.participants.length > 0) {
          console.log(
            `Thành viên nhóm (${
              conversation.participants.length
            }): ${conversation.participants.join(", ")}`
          );
        }
      } else if (conversation.type === "private") {
        console.log(
          `Tin nhắn trực tiếp từ ${sender.fullName} tới ${messageData.receiverId}`
        );
      }
    }

    // Cập nhật tin nhắn cuối cùng trong conversation
    await Conversation.updateLastMessage(messageData.conversationId, {
      content: messageData.content,
      type: messageData.type || "text",
      senderId: messageData.senderId,
      senderName: sender.fullName,
      senderAvatar: sender.avatar,
    });

    return params.Item;
  } catch (error) {
    throw new Error(`Error creating message: ${error.message}`);
  }
};

const getMessagesByConversation = async (
  conversationId,
  lastEvaluatedKey = null
) => {
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: "conversationId = :conversationId",
    ExpressionAttributeValues: {
      ":conversationId": conversationId,
    },
  };

  try {
    console.log("Getting messages for conversation:", conversationId);
    const result = await dynamodb.scan(params).promise();
    console.log("Messages found:", result.Items?.length || 0);

    // Sắp xếp tin nhắn theo thời gian
    const messages = result.Items || [];
    messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Lấy thông tin người gửi cho mỗi tin nhắn
    const formattedMessages = await Promise.all(
      messages.map(async (message) => {
        // Lấy thông tin người gửi từ bảng Users
        const sender = await User.getUserById(message.senderId);

        return {
          messageId: message.messageId,
          conversationId: message.conversationId,
          content: message.content,
          type: message.type || "text",
          status: message.status,
          createdAt: message.createdAt,
          metadata: message.metadata || {},
          isDeleted: message.isDeleted || false,
          sender: {
            id: message.senderId,
            name: sender ? sender.fullName : "Unknown User",
            avatar: sender ? sender.avatar : null,
          },
          receiver: message.receiverId,
        };
      })
    );

    return {
      messages: formattedMessages,
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  } catch (error) {
    console.error("Error getting messages:", error);
    throw new Error(`Error getting messages: ${error.message}`);
  }
};

const updateMessageStatus = async (conversationId, messageId, status) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      conversationId,
      messageId,
    },
    UpdateExpression: "set #status = :status, #updatedAt = :updatedAt",
    ExpressionAttributeValues: {
      ":status": status,
      ":updatedAt": new Date().toISOString(),
    },
    ExpressionAttributeNames: {
      "#status": "status",
      "#updatedAt": "updatedAt",
    },
    ReturnValues: "ALL_NEW",
  };

  try {
    const result = await dynamodb.update(params).promise();
    return result.Attributes;
  } catch (error) {
    throw new Error(`Error updating message status: ${error.message}`);
  }
};

const deleteMessage = async (messageId, conversationId, userId) => {
  try {
    const message = await dynamodb
      .get({
        TableName: "Messages",
        Key: { messageId },
      })
      .promise();

    if (!message.Item) {
      throw new Error("Tin nhắn không tồn tại");
    }

    if (message.Item.senderId !== userId) {
      throw new Error("Bạn không có quyền xóa tin nhắn này");
    }

    // Cập nhật tin nhắn thành đã xóa/thu hồi
    await dynamodb
      .update({
        TableName: "Messages",
        Key: { messageId },
        UpdateExpression: "SET isDeleted = :isDeleted, content = :content",
        ExpressionAttributeValues: {
          ":isDeleted": true,
          ":content": "Tin nhắn đã được xóa",
        },
      })
      .promise();

    // Cập nhật tin nhắn cuối cùng trong conversation
    const conversation = await dynamodb
      .get({
        TableName: "Conversations",
        Key: { conversationId },
      })
      .promise();

    if (
      conversation.Item &&
      conversation.Item.lastMessage?.messageId === messageId
    ) {
      await dynamodb
        .update({
          TableName: "Conversations",
          Key: { conversationId },
          UpdateExpression: "SET lastMessage = :lastMessage",
          ExpressionAttributeValues: {
            ":lastMessage": {
              content: "Tin nhắn đã được xóa",
              type: "text",
              senderId: userId,
              timestamp: new Date().toISOString(),
            },
          },
        })
        .promise();
    }

    return true;
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
};

const recallMessage = async (messageId, conversationId, userId) => {
  try {
    const message = await dynamodb
      .get({
        TableName: "Messages",
        Key: { messageId },
      })
      .promise();

    if (!message.Item) {
      throw new Error("Tin nhắn không tồn tại");
    }

    if (message.Item.senderId !== userId) {
      throw new Error("Bạn không có quyền thu hồi tin nhắn này");
    }

    // Cập nhật tin nhắn thành đã thu hồi
    await dynamodb
      .update({
        TableName: "Messages",
        Key: { messageId },
        UpdateExpression: "SET isRecalled = :isRecalled, content = :content",
        ExpressionAttributeValues: {
          ":isRecalled": true,
          ":content": "Tin nhắn đã được thu hồi",
        },
      })
      .promise();

    // Cập nhật tin nhắn cuối cùng trong conversation
    const conversation = await dynamodb
      .get({
        TableName: "Conversations",
        Key: { conversationId },
      })
      .promise();

    if (
      conversation.Item &&
      conversation.Item.lastMessage?.messageId === messageId
    ) {
      await dynamodb
        .update({
          TableName: "Conversations",
          Key: { conversationId },
          UpdateExpression: "SET lastMessage = :lastMessage",
          ExpressionAttributeValues: {
            ":lastMessage": {
              content: "Tin nhắn đã được thu hồi",
              type: "text",
              senderId: userId,
              timestamp: new Date().toISOString(),
            },
          },
        })
        .promise();
    }

    return true;
  } catch (error) {
    console.error("Error recalling message:", error);
    throw error;
  }
};

const markMessagesAsRead = async (conversationId, userId) => {
  const params = {
    TableName: TABLE_NAME,
    FilterExpression:
      "conversationId = :conversationId AND receiverId = :userId AND #status = :status",
    ExpressionAttributeValues: {
      ":conversationId": conversationId,
      ":userId": userId,
      ":status": "sent",
    },
    ExpressionAttributeNames: {
      "#status": "status",
    },
  };

  try {
    const result = await dynamodb.scan(params).promise();
    const updatePromises = result.Items.map((message) =>
      updateMessageStatus(conversationId, message.messageId, "read")
    );
    await Promise.all(updatePromises);
    return true;
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  createMessage,
  getMessagesByConversation,
  updateMessageStatus,
  deleteMessage,
  recallMessage,
  markMessagesAsRead,
};
