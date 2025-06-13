const { getIO } = require("../configs/socket");

// Lưu trữ các cuộc gọi đang diễn ra
const activeCalls = new Map();

// Thời gian chờ phản hồi (30 giây)
const CALL_TIMEOUT = 30000;

const handleVideoEvents = (socket, userId, io) => {
  // Hàm helper để emit event đến user
  const emitToUser = (userId, event, data) => {
    if (io) {
      console.log(`[emitToUser] Emit ${event} to user_${userId}`);
      io.to(`user_${userId}`).emit(event, data);
    }
  };

  // Helper: tìm callId giữa 2 user
  function findCallIdBetweenUsers(userA, userB) {
    for (const [callId, call] of activeCalls.entries()) {
      if (
        (call.callerId === userA && call.receiverId === userB) ||
        (call.callerId === userB && call.receiverId === userA)
      ) {
        return callId;
      }
    }
    return null;
  }

  // Xử lý khi người dùng bắt đầu cuộc gọi
  socket.on("call-user", (data) => {
    const { offer, to, from, fromName, fromAvatar } = data;
    console.log(`${from} đang gọi cho ${to}`);

    // Nếu đã có callId giữa 2 user thì không tạo mới
    const existingCallId = findCallIdBetweenUsers(from, to);
    if (existingCallId) {
      emitToUser(from, "call-busy", { from: to });
      return;
    }

    // Lưu thông tin cuộc gọi
    const callId = `${from}_${to}_${Date.now()}`;
    activeCalls.set(callId, {
      callerId: from,
      callerName: fromName,
      callerAvatar: fromAvatar,
      receiverId: to,
      offer,
      startedAt: new Date(),
      status: "ringing", // ringing, active, ended
      timeoutId: setTimeout(() => {
        // Nếu sau CALL_TIMEOUT mà không có phản hồi, hủy cuộc gọi
        const call = activeCalls.get(callId);
        if (call && call.status === "ringing") {
          emitToUser(from, "call-timeout", {
            from: to,
          });
          activeCalls.delete(callId);
        }
      }, CALL_TIMEOUT),
    });

    // Gửi thông báo đến người nhận
    emitToUser(to, "incoming-call", {
      from,
      fromName,
      fromAvatar,
      offer,
      callId,
    });
  });

  // Xử lý khi người nhận chấp nhận cuộc gọi
  socket.on("accept-call", (data) => {
    const { to, from, answer } = data;
    console.log(`[BACKEND] Nhận accept-call từ ${from} đến ${to}`);

    // Tìm đúng callId giữa 2 user
    const callId = findCallIdBetweenUsers(to, from);
    let callInfo = null;

    if (callId) {
      callInfo = activeCalls.get(callId);
      console.log(
        `[BACKEND] Tìm thấy cuộc gọi ID=${callId}, status=${callInfo.status}`
      );

      // Cập nhật trạng thái cuộc gọi
      callInfo.status = "active";

      // Xóa timeout
      if (callInfo.timeoutId) {
        console.log(`[BACKEND] Xóa timeout cho cuộc gọi ID=${callId}`);
        clearTimeout(callInfo.timeoutId);
        delete callInfo.timeoutId;
      }

      // Lưu lại vào Map
      activeCalls.set(callId, callInfo);

      console.log(`[BACKEND] Gửi call-accepted từ ${from} đến ${to}`);
      // Thông báo cho người gọi biết cuộc gọi đã được chấp nhận
      emitToUser(to, "call-accepted", {
        answer,
        from: from,
      });
    } else {
      console.log(`[BACKEND] Không tìm thấy cuộc gọi từ ${to} đến ${from}`);
      emitToUser(from, "call-error", {
        error: "Cuộc gọi không tồn tại hoặc đã kết thúc",
      });
      emitToUser(to, "call-error", {
        error: "Cuộc gọi không tồn tại hoặc đã kết thúc",
      });
    }
  });

  // Xử lý khi người nhận từ chối cuộc gọi
  socket.on("reject-call", (data) => {
    const { to, from, reason } = data;
    console.log(
      `[BACKEND] Nhận reject-call từ ${from} đến ${to}, lý do: ${
        reason || "không xác định"
      }`
    );
    console.log(
      `[BACKEND] Socket IDs - Hiện tại: ${socket.id}, Người từ chối: ${from}`
    );

    // Tìm đúng callId giữa 2 user
    const callId = findCallIdBetweenUsers(to, from);
    if (callId) {
      console.log(
        `[BACKEND] Tìm thấy cuộc gọi ID=${callId}, đang từ chối cuộc gọi`
      );
      const call = activeCalls.get(callId);
      console.log(
        `[BACKEND] Thông tin cuộc gọi: callerId=${call.callerId}, receiverId=${call.receiverId}`
      );

      if (call.timeoutId) {
        clearTimeout(call.timeoutId);
      }

      // Xác định ai là người gọi (caller) từ thông tin cuộc gọi
      const callerId = call.callerId;

      // LOG TRỰC TIẾP ROOM CỦA NGƯỜI GỌI
      if (io.sockets.adapter.rooms.has(`user_${callerId}`)) {
        console.log(
          `[BACKEND] Room user_${callerId} tồn tại, số lượng socket: ${
            io.sockets.adapter.rooms.get(`user_${callerId}`).size
          }`
        );
      } else {
        console.log(`[BACKEND] Room user_${callerId} KHÔNG tồn tại!`);
      }

      // Thông báo cho người gọi biết cuộc gọi đã bị từ chối
      console.log(
        `[BACKEND] Gửi call-rejected từ ${from} đến người gọi ${callerId}`
      );

      // Gửi thông báo đến người gọi
      emitToUser(callerId, "call-rejected", {
        from,
        reason: reason || "user_rejected",
      });

      // Phát trực tiếp đến room của người gọi
      io.to(`user_${callerId}`).emit("call-rejected", {
        from,
        reason: reason || "user_rejected",
      });

      // Xóa thông tin cuộc gọi
      activeCalls.delete(callId);
      console.log(`[BACKEND] Đã xóa cuộc gọi ID=${callId} sau khi từ chối`);
    } else {
      console.log(
        `[BACKEND] Không tìm thấy cuộc gọi giữa ${to} và ${from} để từ chối`
      );
    }
  });

  // Xử lý khi người dùng kết thúc cuộc gọi
  socket.on("end-call", (data) => {
    const { to, from } = data;
    console.log(`[BACKEND] Nhận end-call từ ${from} đến ${to}`);

    // Tìm và xóa thông tin cuộc gọi
    let callFound = false;
    for (const [callId, call] of activeCalls.entries()) {
      if (
        (call.callerId === from && call.receiverId === to) ||
        (call.callerId === to && call.receiverId === from)
      ) {
        console.log(`[BACKEND] Tìm thấy cuộc gọi ID=${callId}, đang kết thúc`);
        callFound = true;

        // Xóa timeout nếu có
        if (call.timeoutId) {
          clearTimeout(call.timeoutId);
        }

        // Thông báo cho đối phương biết cuộc gọi đã kết thúc
        emitToUser(to, "call-ended", {
          from,
        });

        // Xóa thông tin cuộc gọi
        activeCalls.delete(callId);
        console.log(`[BACKEND] Đã xóa cuộc gọi ID=${callId}`);
        break;
      }
    }

    if (!callFound) {
      console.log(`[BACKEND] Không tìm thấy cuộc gọi giữa ${from} và ${to}`);
    }
  });

  // Xử lý trao đổi ICE candidates
  socket.on("ice-candidate", (data) => {
    const { candidate, to } = data;
    emitToUser(to, "ice-candidate", {
      candidate,
      from: userId,
    });
  });

  // Xử lý khi người dùng ngắt kết nối
  socket.on("disconnect", () => {
    // Tìm tất cả các cuộc gọi đang diễn ra của người dùng này
    for (const [callId, callInfo] of activeCalls.entries()) {
      if (callInfo.callerId === userId || callInfo.receiverId === userId) {
        // Xóa timeout
        if (callInfo.timeoutId) {
          clearTimeout(callInfo.timeoutId);
        }

        // Thông báo cho đối phương biết cuộc gọi đã kết thúc
        const receiverId =
          callInfo.callerId === userId
            ? callInfo.receiverId
            : callInfo.callerId;

        emitToUser(receiverId, "call-ended", {
          from: userId,
          reason: "disconnect",
        });

        // Xóa thông tin cuộc gọi
        activeCalls.delete(callId);
      }
    }
  });
};

module.exports = handleVideoEvents;
