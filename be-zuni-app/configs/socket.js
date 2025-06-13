const socketIO = require("socket.io");
const handleFriendEvents = require("../socketHandlers/friendHandler");
const handleChatEvents = require("../socketHandlers/chatHandler");
const handleReactionEvents = require("../socketHandlers/reactionHandler");
const handleUserStatusEvents = require("../socketHandlers/userStatusHandler");
const handleVideoEvents = require("../socketHandlers/videoHandler");
const userService = require("../services/userService");

let io;
// Thời gian timeout cho mỗi người dùng (2 phút = 120000ms)
const ONLINE_TIMEOUT = 120000;

// Cấu hình ICE servers cho WebRTC
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

// Cơ chế kiểm tra người dùng nào đã offline
const startHeartbeatMonitoring = () => {
  setInterval(async () => {
    const now = Date.now();
    const usersToOffline = [];

    // Lấy danh sách heartbeat từ userStatusHandler
    const userHeartbeats = handleUserStatusEvents.getUserHeartbeats
      ? handleUserStatusEvents.getUserHeartbeats()
      : {};

    // Kiểm tra các người dùng đã quá thời gian timeout
    for (const userId in userHeartbeats) {
      const lastHeartbeat = userHeartbeats[userId];
      if (now - lastHeartbeat > ONLINE_TIMEOUT) {
        usersToOffline.push(userId);
      }
    }

    // Cập nhật trạng thái offline cho những người dùng đã timeout
    for (const userId of usersToOffline) {
      console.log(`User ${userId} timed out - marking as offline`);
      try {
        await userService.updateUserStatus(userId, {
          isOnline: false,
          lastActive: new Date().toISOString(),
        });

        // Thông báo cho tất cả người dùng
        if (io) {
          io.emit("user-status-change", {
            userId,
            status: "offline",
            lastActive: new Date().toISOString(),
          });
        }

        // Xóa khỏi tracking
        if (handleUserStatusEvents.getUserHeartbeats) {
          delete handleUserStatusEvents.getUserHeartbeats()[userId];
        }
      } catch (error) {
        console.error(`Error updating offline status for ${userId}:`, error);
      }
    }
  }, 30000); // Kiểm tra mỗi 30 giây
};

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || "http://172.16.2.230:3001", // Web local
        "http://192.168.1.*:3000", // Cho phép web từ mạng LAN
        "http://*:3000", // Cho phép web từ bất kỳ IP nào
        "http://192.168.1.*:3001", // Cho phép web từ mạng LAN
        "http://192.168.1.14:3001",
        "http://192.168.1.14:3000",
        "http://192.168.179.172:3000",
        "http://192.168.179.172:3001",
      ],
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    pingTimeout: 12000, // 2 phút
    pingInterval: 6000, // 1 phút
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    const userId = socket.handshake.query.userId;
    if (userId) {
      socket.userId = userId;
      socket.join(`user_${userId}`);
      // Log các room mà socket đã join
      console.log(`Socket ${socket.id} join room: user_${userId}`);
      console.log(`Socket ${socket.id} rooms:`, Array.from(socket.rooms));
      // Gửi cấu hình ICE servers cho client
      socket.emit("ice-servers", ICE_SERVERS);
    }

    // Đăng ký các handlers cho từng loại event
    handleFriendEvents(io, socket);
    handleChatEvents(socket, userId);
    handleReactionEvents(socket, userId);
    handleUserStatusEvents(socket, userId);
    handleVideoEvents(socket, userId, io);

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);

      // Nếu có userId, đánh dấu là offline ngay lập tức
      if (socket.userId) {
        const userId = socket.userId;

        // Delay 5 giây trước khi đánh dấu offline - đề phòng reconnect nhanh
        setTimeout(async () => {
          // Lấy danh sách heartbeat từ userStatusHandler
          const userHeartbeats = handleUserStatusEvents.getUserHeartbeats
            ? handleUserStatusEvents.getUserHeartbeats()
            : {};

          // Kiểm tra xem người dùng đã kết nối lại chưa
          if (
            !userHeartbeats[userId] ||
            Date.now() - userHeartbeats[userId] > 5000
          ) {
            try {
              await userService.updateUserStatus(userId, {
                isOnline: false,
                lastActive: new Date().toISOString(),
              });

              // Thông báo cho tất cả người dùng
              io.emit("user-status-change", {
                userId,
                status: "offline",
                lastActive: new Date().toISOString(),
              });

              // Xóa khỏi tracking
              if (handleUserStatusEvents.getUserHeartbeats) {
                delete handleUserStatusEvents.getUserHeartbeats()[userId];
              }
            } catch (error) {
              console.error(
                `Error updating offline status for ${userId}:`,
                error
              );
            }
          }
        }, 5000);
      }
    });
  });

  // Bắt đầu giám sát heartbeat
  startHeartbeatMonitoring();

  return io;
};

const getIO = () => {
  if (!io) {
    console.warn("Socket.IO not initialized yet, returning dummy emitter");
    // Trả về một đối tượng giả để tránh lỗi
    return {
      to: () => ({
        emit: () => console.log("Socket not initialized, message not sent"),
      }),
    };
  }
  return io;
};

// Hàm gửi thông báo đến một user cụ thể
const emitToUser = (userId, event, data) => {
  if (!io) {
    console.error("Socket.IO not initialized!");
    return;
  }
  io.to(`user_${userId}`).emit(event, data);
};

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  ICE_SERVERS,
};
