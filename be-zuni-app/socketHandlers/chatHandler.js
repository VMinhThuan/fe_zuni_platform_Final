const MessageService = require("../services/messageService");
const ConversationService = require("../services/conversationService");

const handleChatEvents = (socket, userId) => {
  // Handle joining conversation
  socket.on("join-conversation", (data) => {
    const { conversationId } = data;
    console.log(`[DEBUG] User ${userId} joining conversation:`, conversationId);

    // Chỉ leave các room conversation, KHÔNG leave room user_{userId}
    const rooms = Array.from(socket.rooms);
    rooms.forEach((room) => {
      // Nếu room là conversationId cũ (không phải room user_xxx và không phải socket.id)
      if (room !== socket.id && !room.startsWith("user_")) {
        console.log(`[DEBUG] User ${userId} leaving room:`, room);
        socket.leave(room);
      }
    });

    // Join room conversation mới
    socket.join(conversationId);
    console.log(
      `[DEBUG] User ${userId} rooms after join:`,
      Array.from(socket.rooms)
    );
  });

  // Xử lý khi một nhóm mới được tạo
  socket.on("group-created", async (data) => {
    const { conversation, participants } = data;
    console.log("New group created:", conversation);
    console.log("Participants:", participants);

    // Broadcast event đến tất cả thành viên
    const io = socket.server;
    io.emit("group-created", {
      conversation,
      participants,
    });
  });

  // Xử lý khi người dùng gửi tin nhắn mới
  socket.on("send-message", async (data) => {
    try {
      console.log("Received send-message event:", { userId, data });
      const { conversationId, content, type, metadata, receiverId } = data;

      // Lấy thông tin của cuộc trò chuyện
      const conversation = await ConversationService.getConversationById(
        conversationId
      );
      if (!conversation) {
        socket.emit("chat-error", {
          message: "Không tìm thấy cuộc trò chuyện",
        });
        return;
      }

      // Tạo message data để gửi cho cả người gửi và người nhận
      const messageData = {
        ...data,
        senderId: userId,
        time: new Date().toISOString(),
        formattedTime: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      // Gửi xác nhận thành công về cho người gửi
      socket.emit("send-message-success", messageData);

      // Broadcast tin nhắn cho những người khác trong cuộc trò chuyện
      console.log("Broadcasting message to conversation:", conversationId);
      socket.to(conversationId).emit("receive-message", messageData);
    } catch (error) {
      console.error("Error handling send-message:", error);
      socket.emit("chat-error", {
        message: "Không thể gửi tin nhắn",
      });
    }
  });

  // Xử lý khi người dùng xóa tin nhắn
  socket.on("message-deleted", async (data) => {
    try {
      console.log("Received message-deleted event:", { userId, data });
      const { messageId, conversationId, senderId, receiverId } = data;

      // Lấy thông tin của cuộc trò chuyện
      const conversation = await ConversationService.getConversationById(
        conversationId
      );
      if (!conversation) {
        socket.emit("chat-error", {
          message: "Không tìm thấy cuộc trò chuyện",
        });
        return;
      }

      // Broadcast tin nhắn đã xóa cho tất cả người dùng trong cuộc trò chuyện
      const io = socket.server;
      io.to(conversationId).emit("message-deleted", {
        messageId,
        conversationId,
        senderId,
        receiverId,
        isDeleted: true,
        content: "Tin nhắn đã được xóa",
      });

      console.log(
        "Broadcasted message-deleted event to conversation:",
        conversationId
      );
    } catch (error) {
      console.error("Error handling message-deleted:", error);
      socket.emit("chat-error", {
        message: "Không thể xóa tin nhắn",
      });
    }
  });

  // Xử lý khi người dùng đang nhập tin nhắn
  socket.on("typing", (data) => {
    const { conversationId } = data;
    socket.to(conversationId).emit("user-typing", {
      userId,
      conversationId,
    });
  });

  // Xử lý khi người dùng dừng nhập tin nhắn
  socket.on("stop-typing", (data) => {
    const { conversationId } = data;
    socket.to(conversationId).emit("user-stop-typing", {
      userId,
      conversationId,
    });
  });

  // Xử lý khi người dùng đã xem tin nhắn
  socket.on("mark-read", async (data) => {
    try {
      const { conversationId } = data;
      await MessageService.markMessagesAsRead(conversationId, userId);

      // Thông báo cho những người khác trong cuộc trò chuyện
      socket.to(conversationId).emit("messages-read", {
        conversationId,
        userId,
      });
    } catch (error) {
      console.error("Error handling mark-read:", error);
    }
  });

  // Handle leaving conversation
  socket.on("leave-conversation", (data) => {
    const { conversationId } = data;
    console.log(`[DEBUG] User ${userId} leaving conversation:`, conversationId);
    socket.leave(conversationId);
    console.log(
      `[DEBUG] User ${userId} rooms after leave:`,
      Array.from(socket.rooms)
    );
  });
};

module.exports = handleChatEvents;
