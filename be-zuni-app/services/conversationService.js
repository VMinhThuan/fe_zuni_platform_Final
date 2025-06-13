const { dynamodb } = require("../configs/dbConfig");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { v4: uuidv4 } = require("uuid");
const TABLE_NAME = "Conversations";

const createConversation = async (conversationData) => {
  // Kiểm tra xem đã tồn tại cuộc trò chuyện giữa 2 người chưa
  if (conversationData.type === "private") {
    const existingConversation = await findDirectConversation(
      conversationData.participants[0],
      conversationData.participants[1]
    );
    if (existingConversation) {
      console.log("Using existing conversation:", existingConversation);
      return existingConversation;
    }
  }
  // Với nhóm chat, yêu cầu ít nhất 3 thành viên
  else if (conversationData.type === "group") {
    if (conversationData.participants.length < 3) {
      throw new Error("Nhóm chat phải có ít nhất 3 thành viên");
    }
  }

  // Sử dụng conversationId được truyền vào nếu có, nếu không thì tạo mới
  const conversationId = conversationData.conversationId || uuidv4();

  console.log("Creating new conversation with ID:", conversationId);

  // Nếu là nhóm và không có avatar, sử dụng avatar mặc định
  const defaultGroupAvatar =
    "https://d2xhlscj0ra0lw.cloudfront.net/groupAvatars/fm0m-1745330731551-defaultGroupAvatar.jpg";
  const avatar =
    conversationData.type === "group" && !conversationData.avatar
      ? defaultGroupAvatar
      : conversationData.avatar;

  const params = {
    TableName: TABLE_NAME,
    Item: {
      conversationId,
      participants: conversationData.participants,
      type: conversationData.type || "private",
      name: conversationData.name || null,
      avatar: avatar,
      lastMessage: null,
      lastMessageTime: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: conversationData.settings || {
        notifications: true,
      },
      creator: conversationData.creator || conversationData.participants[0],
      admin:
        conversationData.type === "group"
          ? conversationData.creator || conversationData.participants[0]
          : null,
    },
  };

  try {
    await dynamodb.put(params).promise();
    return params.Item;
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw new Error(`Error creating conversation: ${error.message}`);
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
      ":type": "private",
    },
    ExpressionAttributeNames: {
      "#type": "type",
    },
  };

  try {
    const result = await dynamodb.scan(params).promise();
    if (result.Items && result.Items.length > 0) {
      console.log("Found existing conversation:", result.Items[0]);
      return result.Items[0];
    }
    console.log("No existing conversation found");
    return null;
  } catch (error) {
    console.error("Error finding private conversation:", error);
    throw new Error(`Error finding private conversation: ${error.message}`);
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

    // Lấy thông tin người dùng và tin nhắn cuối cùng cho mỗi cuộc trò chuyện
    const conversations = await Promise.all(
      result.Items.map(async (conversation) => {
        if (conversation.type === "private") {
          const otherUserId = conversation.participants.find(
            (id) => id !== userId
          );
          const otherUser = await User.getUserById(otherUserId);

          // Lấy tin nhắn cuối cùng của cuộc trò chuyện
          const messageParams = {
            TableName: "Messages",
            FilterExpression: "conversationId = :conversationId",
            ExpressionAttributeValues: {
              ":conversationId": conversation.conversationId,
            },
          };

          const messages = await dynamodb.scan(messageParams).promise();
          let lastMessage = null;
          let unreadCount = 0;

          if (messages.Items && messages.Items.length > 0) {
            // Sắp xếp tin nhắn theo thời gian giảm dần
            const sortedMessages = messages.Items.sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );
            lastMessage = sortedMessages[0];

            // Đếm số tin nhắn chưa đọc
            unreadCount = messages.Items.filter(
              (msg) => msg.receiverId === userId && msg.status === "sent"
            ).length;
          }

          return {
            id: otherUserId,
            conversationId: conversation.conversationId,
            name: otherUser.fullName,
            avatar: otherUser.avatar,
            lastMsg: lastMessage?.content || "Chưa có tin nhắn",
            time: lastMessage
              ? new Date(lastMessage.createdAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "",
            lastMessageTime: lastMessage?.createdAt || conversation.createdAt,
            unreadCount,
            type: conversation.type,
            participants: conversation.participants,
          };
        } else if (conversation.type === "group") {
          // Lấy tin nhắn cuối cùng của cuộc trò chuyện nhóm
          const messageParams = {
            TableName: "Messages",
            FilterExpression: "conversationId = :conversationId",
            ExpressionAttributeValues: {
              ":conversationId": conversation.conversationId,
            },
          };

          const messages = await dynamodb.scan(messageParams).promise();
          let lastMessage = null;
          let unreadCount = 0;

          if (messages.Items && messages.Items.length > 0) {
            // Sắp xếp tin nhắn theo thời gian giảm dần
            const sortedMessages = messages.Items.sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            );
            lastMessage = sortedMessages[0];

            // Đếm số tin nhắn chưa đọc
            unreadCount = messages.Items.filter(
              (msg) => msg.senderId !== userId && msg.status === "sent"
            ).length;
          }

          // Lấy tên người gửi tin nhắn cuối cùng (nếu có)
          let lastMessageSender = "";
          if (lastMessage && lastMessage.senderId) {
            const sender = await User.getUserById(lastMessage.senderId);
            if (sender) {
              lastMessageSender = sender.fullName.split(" ").pop(); // Lấy tên (không lấy họ)
            }
          }

          return {
            id: conversation.conversationId,
            conversationId: conversation.conversationId,
            admin: conversation.admin,
            name: conversation.name || "Nhóm chat",
            avatar: conversation.avatar,
            lastMsg: lastMessage
              ? (lastMessageSender ? `${lastMessageSender}: ` : "") +
                (typeof lastMessage.content === "string"
                  ? lastMessage.content
                  : "Đã gửi một file")
              : "Chưa có tin nhắn",
            time: lastMessage
              ? new Date(lastMessage.createdAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "",
            lastMessageTime: lastMessage?.createdAt || conversation.createdAt,
            unreadCount,
            type: conversation.type,
            participants: conversation.participants,
            isGroup: true,
          };
        }
        return conversation;
      })
    );

    // Sắp xếp cuộc trò chuyện theo thời gian tin nhắn cuối cùng
    conversations.sort((a, b) => {
      const timeA = new Date(a.lastMessageTime || 0);
      const timeB = new Date(b.lastMessageTime || 0);
      return timeB - timeA;
    });

    return conversations;
  } catch (error) {
    console.error("Error getting conversations:", error);
    throw new Error(`Error getting conversations: ${error.message}`);
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

const updateConversation = async (conversationId, updateData) => {
  let updateExpression = "set ";
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

const deleteConversation = async (conversationId, requesterId) => {
  // Kiểm tra conversation có tồn tại không
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    throw new Error("Cuộc trò chuyện không tồn tại");
  }

  // Kiểm tra quyền admin nếu là group chat
  if (conversation.type === "group") {
    if (conversation.admin !== requesterId) {
      throw new Error("Bạn không có quyền xóa nhóm chat này");
    }
  } else {
    // Nếu là chat 1-1, kiểm tra xem người yêu cầu có trong cuộc trò chuyện không
    if (!conversation.participants.includes(requesterId)) {
      throw new Error("Bạn không có quyền xóa cuộc trò chuyện này");
    }
  }

  try {
    // Xóa tất cả tin nhắn trong cuộc trò chuyện
    const messageParams = {
      TableName: "Messages",
      FilterExpression: "conversationId = :conversationId",
      ExpressionAttributeValues: {
        ":conversationId": conversationId,
      },
    };

    const messages = await dynamodb.scan(messageParams).promise();
    if (messages.Items && messages.Items.length > 0) {
      await Promise.all(
        messages.Items.map(async (message) => {
          await dynamodb
            .delete({
              TableName: "Messages",
              Key: { messageId: message.messageId },
            })
            .promise();
        })
      );
    }

    // Xóa cuộc trò chuyện
    const params = {
      TableName: TABLE_NAME,
      Key: { conversationId },
    };
    await dynamodb.delete(params).promise();

    // Gửi socket event thông báo cho tất cả thành viên
    const io = require("../configs/socket").getIO();
    io.to(`conversation_${conversationId}`).emit("conversation-deleted", {
      conversationId,
      type: conversation.type,
      by: requesterId,
      deletedAt: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Error deleting conversation:", error);
    throw new Error(`Lỗi khi xóa cuộc trò chuyện: ${error.message}`);
  }
};

const addParticipants = async (conversationId, participants) => {
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const updatedParticipants = [
    ...new Set([...conversation.participants, ...participants]),
  ];
  const updatedConversation = await updateConversation(conversationId, {
    participants: updatedParticipants,
  });

  // Lấy thông tin user cho tất cả participants
  const participantsInfo = await Promise.all(
    updatedParticipants.map(async (userId) => {
      const user = await User.getUserById(userId);
      if (!user) return null;
      return {
        userId: user.userId,
        fullName: user.fullName,
        avatar: user.avatar,
        phoneNumber: user.phoneNumber,
      };
    })
  );

  // Emit socket cho tất cả thành viên cũ và mới
  const io = require("../configs/socket").getIO();
  updatedParticipants.forEach((userId) => {
    io.to(`user_${userId}`).emit("member-added", {
      conversationId,
      addedMembers: participants,
      participants: participantsInfo.filter(Boolean), // Trả về mảng object user
      conversation: updatedConversation,
    });
  });

  return updatedConversation;
};

const removeParticipants = async (
  conversationId,
  participants,
  requesterId
) => {
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // Kiểm tra xem người yêu cầu có phải là admin không
  if (conversation.admin !== requesterId) {
    throw new Error("Bạn không có quyền xóa thành viên khỏi nhóm");
  }

  // Kiểm tra xem có đang cố gắng xóa admin không
  if (participants.includes(conversation.admin)) {
    throw new Error("Không thể xóa admin khỏi nhóm");
  }

  const updatedParticipants = conversation.participants.filter(
    (participant) => !participants.includes(participant)
  );

  const updatedConversation = await updateConversation(conversationId, {
    participants: updatedParticipants,
  });

  // Lấy thông tin socket.io để emit event
  const io = require("../configs/socket").getIO();

  // Gửi event cho tất cả thành viên còn lại và cả user bị xóa
  const notifyUserIds = [...new Set([...updatedParticipants, ...participants])];
  notifyUserIds.forEach((userId) => {
    io.to(`user_${userId}`).emit("member-removed", {
      conversationId,
      removedMembers: participants,
      by: requesterId,
      conversation: updatedConversation,
    });
  });

  return updatedConversation;
};

const getGroupConversationsByUser = async (userId) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression:
        "contains(participants, :userId) AND #type = :groupType",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":groupType": "group",
      },
      ExpressionAttributeNames: {
        "#type": "type",
      },
    };

    const result = await dynamodb.scan(params).promise();
    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    // Lấy thông tin tin nhắn cuối cùng và thông tin thành viên cho mỗi nhóm
    const enrichedConversations = await Promise.all(
      result.Items.map(async (conversation) => {
        // Lấy tin nhắn cuối cùng
        const messageParams = {
          TableName: "Messages",
          FilterExpression: "conversationId = :conversationId",
          ExpressionAttributeValues: {
            ":conversationId": conversation.conversationId,
          },
        };

        const messages = await dynamodb.scan(messageParams).promise();
        let lastMessage = null;
        let unreadCount = 0;

        if (messages.Items && messages.Items.length > 0) {
          // Sắp xếp tin nhắn theo thời gian giảm dần
          const sortedMessages = messages.Items.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
          lastMessage = sortedMessages[0];

          // Đếm số tin nhắn chưa đọc
          unreadCount = messages.Items.filter(
            (msg) => msg.senderId !== userId && msg.status === "sent"
          ).length;
        }

        // Lấy thông tin cơ bản của các thành viên
        const participantsInfo = await Promise.all(
          conversation.participants.map(async (participantId) => {
            const userParams = {
              TableName: "Users",
              Key: { userId: participantId },
            };
            const userResult = await dynamodb.get(userParams).promise();
            const user = userResult.Item;
            return {
              userId: user.userId,
              fullName: user.fullName,
              avatar: user.avatar,
            };
          })
        );

        // Lấy tên người gửi tin nhắn cuối cùng (nếu có)
        let lastMessageSender = "";
        if (lastMessage && lastMessage.senderId) {
          const senderParams = {
            TableName: "Users",
            Key: { userId: lastMessage.senderId },
          };
          const senderResult = await dynamodb.get(senderParams).promise();
          const sender = senderResult.Item;
          if (sender) {
            lastMessageSender = sender.fullName.split(" ").pop(); // Lấy tên (không lấy họ)
          }
        }

        return {
          ...conversation,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                sender: lastMessageSender,
                time: new Date(lastMessage.createdAt).toLocaleTimeString(
                  "vi-VN",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                ),
              }
            : null,
          participants: participantsInfo,
          unreadCount,
        };
      })
    );

    // Sắp xếp theo thời gian tin nhắn cuối cùng
    return enrichedConversations.sort((a, b) => {
      const timeA = a.lastMessage
        ? new Date(a.lastMessage.createdAt)
        : new Date(a.createdAt);
      const timeB = b.lastMessage
        ? new Date(b.lastMessage.createdAt)
        : new Date(b.createdAt);
      return timeB - timeA;
    });
  } catch (error) {
    console.error("Error in getGroupConversationsByUser:", error);
    throw new Error("Không thể lấy danh sách nhóm chat");
  }
};

const leaveGroup = async (conversationId, userId) => {
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    throw new Error("Cuộc trò chuyện không tồn tại");
  }

  // Kiểm tra xem có phải là group chat không
  if (conversation.type !== "group") {
    throw new Error("Chỉ có thể rời khỏi nhóm chat");
  }

  // Kiểm tra xem người dùng có trong nhóm không
  if (!conversation.participants.includes(userId)) {
    throw new Error("Bạn không phải là thành viên của nhóm này");
  }

  // Xóa người dùng khỏi danh sách thành viên
  const updatedParticipants = conversation.participants.filter(
    (participantId) => participantId !== userId
  );

  // Nếu là admin và còn nhiều hơn 1 thành viên, cần chuyển quyền admin trước
  if (conversation.admin === userId && updatedParticipants.length > 0) {
    throw new Error(
      "Admin không thể rời khỏi nhóm. Hãy chuyển quyền admin trước khi rời nhóm."
    );
  }

  // Cập nhật conversation
  const updatedConversation = await updateConversation(conversationId, {
    participants: updatedParticipants,
  });

  // Lấy thông tin user cho tất cả participants
  const participantsInfo = await Promise.all(
    updatedParticipants.map(async (userId) => {
      const user = await User.getUserById(userId);
      if (!user) return null;
      return {
        userId: user.userId,
        fullName: user.fullName,
        avatar: user.avatar,
        phoneNumber: user.phoneNumber,
      };
    })
  );

  // Gửi socket event thông báo cho tất cả thành viên
  const io = require("../configs/socket").getIO();

  // Emit cho tất cả thành viên trong nhóm
  io.to(conversationId).emit("member-left", {
    conversationId,
    userId,
    leftAt: new Date().toISOString(),
    conversation: {
      ...updatedConversation,
      participants: participantsInfo.filter(Boolean),
    },
  });

  // Emit riêng cho user vừa rời nhóm
  io.to(`user_${userId}`).emit("member-left", {
    conversationId,
    userId,
    leftAt: new Date().toISOString(),
    conversation: {
      ...updatedConversation,
      participants: participantsInfo.filter(Boolean),
    },
  });

  return updatedConversation;
};

module.exports = {
  createConversation,
  findDirectConversation,
  getConversationsByUser,
  getConversationById,
  updateConversation,
  deleteConversation,
  addParticipants,
  removeParticipants,
  getGroupConversationsByUser,
  leaveGroup,
};
