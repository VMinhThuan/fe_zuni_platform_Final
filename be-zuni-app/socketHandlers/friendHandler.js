const handleFriendEvents = (io, socket) => {
  // Xử lý sự kiện gửi lời mời kết bạn
  socket.on("send-friend-request", (data) => {
    const { receiverId, senderId, senderName, senderAvatar } = data;
    if (receiverId) {
      // Emit tới người nhận lời mời
      io.to(`user_${receiverId}`).emit("friend-request-received", {
        senderId,
        senderName,
        senderAvatar,
      });
      // Emit tới người gửi để cập nhật UI
      io.to(`user_${senderId}`).emit("send-friend-request", {
        receiverId,
        receiverName: senderName,
        receiverAvatar: senderAvatar,
      });
    }
  });

  // Xử lý sự kiện từ chối lời mời kết bạn
  socket.on("friend-request-rejected", (data) => {
    const { friendId } = data;
    if (friendId) {
      // Emit tới người bị từ chối
      io.to(`user_${friendId}`).emit("friend-request-rejected", {
        by: socket.userId,
      });
      // Emit friend-removed cho cả hai bên
      io.to(`user_${friendId}`).emit("friend-removed", {
        friendId: socket.userId,
      });
      io.to(`user_${socket.userId}`).emit("friend-removed", {
        friendId,
      });
    }
  });

  // Xử lý sự kiện chấp nhận lời mời kết bạn
  socket.on("friend-request-accepted", (data) => {
    const { friendId } = data;
    if (friendId) {
      io.to(`user_${friendId}`).emit("friend-request-accepted", {
        friendId: socket.userId,
      });
    }
  });

  // Xử lý sự kiện hủy kết bạn
  socket.on("friend-removed", (data) => {
    const { friendId } = data;
    if (friendId) {
      io.to(`user_${friendId}`).emit("friend-removed", {
        friendId: socket.userId,
      });
    }
  });
};

module.exports = handleFriendEvents;
