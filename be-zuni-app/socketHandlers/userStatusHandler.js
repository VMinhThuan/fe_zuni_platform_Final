const userService = require("../services/userService");

// Lưu trữ biến để theo dõi heartbeat ngay trong module này
const userLastHeartbeats = {};

const handleUserStatusEvents = (socket) => {
  // Xử lý khi người dùng cập nhật trạng thái
  socket.on("user-status", async (data) => {
    console.log(`User status update from ${data.userId}: ${data.status}`);

    // Cập nhật trạng thái trong DB
    await userService.updateUserStatus(data.userId, {
      isOnline: data.status === "online",
      lastActive:
        data.status === "offline" ? data.lastActive : new Date().toISOString(),
    });

    // Cập nhật heartbeat nếu người dùng online
    if (data.status === "online") {
      userLastHeartbeats[data.userId] = Date.now();
    }

    // Lấy io trực tiếp từ socket.server - giống reactionHandler
    const io = socket.server;

    // Broadcast to all users
    io.emit("user-status-change", {
      userId: data.userId,
      status: data.status,
      lastActive: data.lastActive || new Date().toISOString(),
    });
  });

  // Xử lý heartbeat để duy trì trạng thái online
  socket.on("heartbeat", async (data) => {
    if (data.userId) {
      const currentTime = new Date().toISOString();

      // Cập nhật trạng thái trong DB
      await userService.updateUserStatus(data.userId, {
        isOnline: true,
        lastActive: currentTime,
      });

      // Cập nhật heartbeat localy
      userLastHeartbeats[data.userId] = Date.now();
    }
  });
};

// Export để các module khác có thể truy cập vào danh sách heartbeat
handleUserStatusEvents.getUserHeartbeats = () => userLastHeartbeats;

module.exports = handleUserStatusEvents;
