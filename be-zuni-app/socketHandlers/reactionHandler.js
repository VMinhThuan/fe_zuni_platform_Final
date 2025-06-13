const reactionService = require("../services/reactionService");

const handleReactionEvents = (socket, userId) => {
  // Xử lý sự kiện khi người dùng thả tim tin nhắn
  socket.on("react-message", async (data) => {
    try {
      console.log("Received react-message event:", data);

      if (!data.messageId || !data.conversationId) {
        console.error("Missing required data for reaction:", data);
        return;
      }

      // Đảm bảo userId được lấy từ socket hoặc từ dữ liệu được gửi
      const authenticatedUserId = userId || data.userId;

      if (!authenticatedUserId) {
        console.error("Missing userId for reaction");
        return;
      }

      // Sử dụng io từ socket
      const io = socket.server;

      // Để debug, log cả đối tượng socket.server
      console.log("Socket server available:", !!io);

      // Kiểm tra room đã tham gia
      const rooms = Array.from(socket.rooms || []);
      console.log(`Socket ${socket.id} đã tham gia các room:`, rooms);
      console.log(`Sẽ gửi reaction đến room: ${data.conversationId}`);

      // Đảm bảo đã join room conversation
      if (!rooms.includes(data.conversationId)) {
        console.log(`Tự động join room ${data.conversationId}`);
        socket.join(data.conversationId);
      }

      // Xử lý reaction dựa vào action (add hoặc remove)
      let result;
      if (data.action === "remove") {
        result = await reactionService.removeMessageReaction(
          {
            messageId: data.messageId,
            userId: authenticatedUserId,
            conversationId: data.conversationId,
          },
          io
        );
      } else {
        // Mặc định là thêm reaction
        result = await reactionService.addMessageReaction(
          {
            messageId: data.messageId,
            userId: authenticatedUserId,
            conversationId: data.conversationId,
            type: data.type || "heart",
          },
          io
        );
      }

      // Log kết quả để debug
      console.log("Reaction handled successfully:", {
        action: data.action || "add",
        status: result.status,
        messageId: data.messageId,
        data: result.data,
      });
    } catch (error) {
      console.error("Error handling react-message event:", error);
    }
  });

  // Có thể thêm các sự kiện khác liên quan đến reaction ở đây
};

module.exports = handleReactionEvents;
