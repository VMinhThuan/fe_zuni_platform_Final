const MessageReaction = require("../models/MessageReaction");

const addMessageReaction = async (reactionData, io = null) => {
  try {
    const { messageId, userId, conversationId, type } = reactionData;

    if (!messageId || !userId || !conversationId) {
      return {
        status: false,
        error: 400,
        message: "Thiếu thông tin cần thiết cho reaction",
        data: null,
      };
    }

    // Lưu reaction vào database
    const savedReaction = await MessageReaction.addReaction({
      messageId,
      userId,
      type: type || "heart",
    });

    console.log("Reaction saved in DB:", {
      messageId,
      userId,
      type: type || "heart",
      count: savedReaction.count,
    });

    // Lấy tất cả reaction cho tin nhắn này
    const allReactions = await MessageReaction.getReactionsByMessageId(
      messageId
    );

    // Chuyển đổi thành dạng map của userId -> count
    const reactionsMap = {};
    allReactions.forEach((reaction) => {
      reactionsMap[reaction.userId] = {
        type: reaction.type,
        count: reaction.count,
      };
    });

    // Nếu có io được truyền vào, sử dụng nó
    if (io) {
      try {
        // Log trước khi emit
        console.log(
          `Emitting 'message-reaction' event to room ${conversationId}:`,
          {
            messageId,
            reactionsCount: Object.keys(reactionsMap).length,
            userReaction: reactionsMap[userId],
          }
        );

        // Emit reaction event
        io.to(conversationId).emit("message-reaction", {
          messageId,
          conversationId,
          reactions: reactionsMap,
          lastReactedBy: userId,
          lastReactedAt: new Date().toISOString(),
        });

        // Kiểm tra sự kiện đã được gửi
        console.log(`Socket emit completed for room ${conversationId}`);
      } catch (emitError) {
        console.error("Error emitting message-reaction event:", emitError);
      }
    } else {
      console.warn(
        `No socket.io instance provided for reaction on message ${messageId}`
      );
    }

    return {
      status: true,
      error: 0,
      message: "Thêm reaction thành công",
      data: {
        reaction: savedReaction,
        allReactions: reactionsMap,
      },
    };
  } catch (error) {
    console.error("Error adding message reaction:", error);
    return {
      status: false,
      error: 500,
      message: error.message,
      data: null,
    };
  }
};

const removeMessageReaction = async (data, io = null) => {
  try {
    const { messageId, userId, conversationId } = data;

    if (!messageId || !userId || !conversationId) {
      return {
        status: false,
        error: 400,
        message: "Thiếu thông tin cần thiết để xóa reaction",
        data: null,
      };
    }

    // Xóa reaction
    await MessageReaction.removeReaction(messageId, userId);

    // Lấy tất cả reaction còn lại
    const allReactions = await MessageReaction.getReactionsByMessageId(
      messageId
    );

    // Chuyển đổi thành dạng map
    const reactionsMap = {};
    allReactions.forEach((reaction) => {
      reactionsMap[reaction.userId] = {
        type: reaction.type,
        count: reaction.count,
      };
    });

    // Nếu có io được truyền vào, sử dụng nó
    if (io) {
      io.to(conversationId).emit("message-reaction", {
        messageId,
        conversationId,
        reactions: reactionsMap,
        lastUpdatedBy: userId,
        lastUpdatedAt: new Date().toISOString(),
      });
    }

    return {
      status: true,
      error: 0,
      message: "Xóa reaction thành công",
      data: {
        allReactions: reactionsMap,
      },
    };
  } catch (error) {
    console.error("Error removing message reaction:", error);
    return {
      status: false,
      error: 500,
      message: error.message,
      data: null,
    };
  }
};

const getMessageReactions = async (messageId) => {
  try {
    if (!messageId) {
      return {
        status: false,
        error: 400,
        message: "messageId là bắt buộc",
        data: null,
      };
    }

    const reactions = await MessageReaction.getReactionsByMessageId(messageId);

    // Chuyển đổi sang dạng map
    const reactionsMap = {};
    reactions.forEach((reaction) => {
      reactionsMap[reaction.userId] = {
        type: reaction.type,
        count: reaction.count,
      };
    });

    return {
      status: true,
      error: 0,
      message: "Lấy reaction thành công",
      data: {
        reactions: reactionsMap,
      },
    };
  } catch (error) {
    console.error("Error getting message reactions:", error);
    return {
      status: false,
      error: 500,
      message: error.message,
      data: null,
    };
  }
};

const getReactionsForMessages = async (messageIds) => {
  try {
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return {
        status: false,
        error: 400,
        message: "messageIds là bắt buộc và phải là một mảng không rỗng",
        data: null,
      };
    }

    const reactionsMap = await MessageReaction.getReactionsForMessages(
      messageIds
    );

    return {
      status: true,
      error: 0,
      message: "Lấy reaction thành công",
      data: {
        reactions: reactionsMap,
      },
    };
  } catch (error) {
    console.error("Error getting reactions for messages:", error);
    return {
      status: false,
      error: 500,
      message: error.message,
      data: null,
    };
  }
};

module.exports = {
  addMessageReaction,
  removeMessageReaction,
  getMessageReactions,
  getReactionsForMessages,
};
