import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useCurrentApp } from "./app.context";
import { useNavigate } from "react-router-dom";

const SocketContext = createContext();
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useCurrentApp();
  const navigate = useNavigate();

  useEffect(() => {
    const initSocket = () => {
      const accessToken = localStorage.getItem("accessToken");

      if (!accessToken || !BACKEND_URL || !user?.userId) {
        console.log(
          "SocketContext - Thiếu accessToken, BACKEND_URL hoặc userId"
        );
        return;
      }

      // Nếu socket đã tồn tại và đang kết nối, không tạo mới
      if (socket?.connected) {
        console.log("SocketContext - Socket đã tồn tại và đang kết nối");
        return;
      }

      // Đóng socket cũ nếu có
      if (socket) {
        console.log("SocketContext - Đóng socket cũ");
        socket.disconnect();
      }

      // Tạo socket mới
      console.log("[SOCKET] Tạo socket mới với userId:", user.userId);
      const newSocket = io(BACKEND_URL, {
        query: { userId: user.userId },
        auth: { token: accessToken },
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      newSocket.on("connect", () => {
        console.log(
          "[SOCKET] Đã kết nối:",
          newSocket.id,
          "userId:",
          user.userId
        );
        setIsConnected(true);
      });

      newSocket.on("disconnect", (reason) => {
        console.log(
          "[SOCKET] Bị ngắt kết nối:",
          reason,
          "userId:",
          user.userId
        );
        setIsConnected(false);
      });

      newSocket.on("connect_error", (error) => {
        console.error(
          "[SOCKET] Lỗi kết nối:",
          error.message,
          "userId:",
          user.userId
        );
        setIsConnected(false);
      });

      newSocket.on("reconnect", (attempt) => {
        console.log(
          "[SOCKET] Đã kết nối lại sau",
          attempt,
          "lần thử",
          "userId:",
          user.userId
        );
        setIsConnected(true);
      });

      newSocket.on("reconnect_error", (error) => {
        console.error(
          "[SOCKET] Lỗi khi thử kết nối lại:",
          error.message,
          "userId:",
          user.userId
        );
      });

      setSocket(newSocket);
    };

    // Khởi tạo socket khi có user
    if (user?.userId) {
      initSocket();
    }

    // Cleanup function
    return () => {
      if (socket) {
        console.log("SocketContext - Cleanup: Đóng socket");
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [user?.userId]);

  useEffect(() => {
    // Kiểm tra nếu socket đã được kết nối
    if (socket && user?.userId) {
      // Lắng nghe sự kiện thay đổi trạng thái người dùng
      const handleUserStatusChange = (data) => {
        console.log("Socket: Nhận sự kiện user-status-change", data);

        // Dispatch sự kiện để cập nhật trạng thái người dùng trong các component
        socket.emit("user-status-updated", {
          userId: data.userId,
          isOnline: data.status === "online",
          lastActive: data.status === "offline" ? data.lastActive : null,
        });
      };

      // Lắng nghe sự kiện khi có thành viên bị xóa khỏi nhóm
      const handleMemberRemoved = (data) => {
        console.log("Socket: Nhận sự kiện member-removed", data);

        // Nếu người dùng hiện tại bị xóa khỏi nhóm
        if (data.removedMembers.includes(user.userId)) {
          // Thông báo cho người dùng

          // Chuyển hướng về trang chính nếu đang ở trong nhóm chat đó
          if (
            window.location.pathname.includes(`/chat/${data.conversationId}`)
          ) {
            navigate("/chat");
          }
        }
      };

      // Hàm xử lý khi người dùng đóng trình duyệt hoặc rời trang
      const handleBeforeUnload = () => {
        console.log("Window beforeunload - Đánh dấu user offline");
        if (socket.connected) {
          // Gửi trạng thái offline ngay lập tức
          socket.emit("user-status", {
            userId: user.userId,
            status: "offline",
            lastActive: new Date().toISOString(),
          });

          // Đóng socket
          socket.disconnect();
        }
      };

      // Đăng ký lắng nghe sự kiện
      socket.on("user-status-change", handleUserStatusChange);
      socket.on("member-removed", handleMemberRemoved);

      // Đăng ký lắng nghe sự kiện beforeunload
      window.addEventListener("beforeunload", handleBeforeUnload);

      // Gửi trạng thái online khi component mount
      socket.emit("user-status", {
        userId: user.userId,
        status: "online",
      });

      // Thiết lập tự động gửi heartbeat để duy trì trạng thái online
      const heartbeatInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit("heartbeat", { userId: user.userId });
        }
      }, 20000); // 20 giây gửi một lần (giảm từ 30s xuống 20s cho tốt hơn)

      // Cleanup function khi unmount
      return () => {
        // Gửi trạng thái offline trước khi hủy event listener
        if (socket.connected) {
          socket.emit("user-status", {
            userId: user.userId,
            status: "offline",
            lastActive: new Date().toISOString(),
          });
        }

        // Hủy đăng ký lắng nghe sự kiện
        socket.off("user-status-change", handleUserStatusChange);
        socket.off("member-removed", handleMemberRemoved);

        // Hủy đăng ký lắng nghe sự kiện beforeunload
        window.removeEventListener("beforeunload", handleBeforeUnload);

        // Xóa interval heartbeat
        clearInterval(heartbeatInterval);
      };
    }
  }, [socket, user?.userId]); // Re-run khi socket hoặc userId thay đổi

  const disconnect = () => {
    if (socket) {
      // Gửi trạng thái offline
      if (socket.connected && user?.userId) {
        socket.emit("user-status", {
          userId: user.userId,
          status: "offline",
          lastActive: new Date().toISOString(),
        });
      }

      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, disconnect }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
