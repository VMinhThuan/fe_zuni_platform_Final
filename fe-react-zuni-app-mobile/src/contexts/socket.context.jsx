import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useCurrentApp } from './app.context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const API_BASE_URL = "https://be-zuni-app.onrender.com";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useCurrentApp();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const initSocket = async () => {
    const accessToken = await AsyncStorage.getItem('accessToken');

    if (!accessToken || !API_BASE_URL || !user?.userId) {
      console.log("SocketContext - Thiếu accessToken, API_BASE_URL hoặc userId");
      return false;
    }

    if (socket?.connected) {
      console.log("SocketContext - Socket đã tồn tại và đang kết nối");
      return true;
    }

    if (socket) {
      console.log("SocketContext - Đóng socket cũ");
      socket.disconnect();
    }

    console.log("[SOCKET] Tạo socket mới với userId:", user.userId);
    const newSocket = io(API_BASE_URL, {
      query: { userId: user.userId },
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      pingTimeout: 60000,
      pingInterval: 25000,
      forceNew: true,
    });

    newSocket.on('connect', () => {
      console.log("[SOCKET] Đã kết nối:", newSocket.id, "userId:", user.userId);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log("[SOCKET] Bị ngắt kết nối:", reason, "userId:", user.userId);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error("[SOCKET] Lỗi kết nối:", error.message, "userId:", user.userId);
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attempt) => {
      console.log("[SOCKET] Đã kết nối lại sau", attempt, "lần thử", "userId:", user.userId);
      setIsConnected(true);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error("[SOCKET] Lỗi khi thử kết nối lại:", error.message, "userId:", user.userId);
    });

    setSocket(newSocket);
    return true;
  };

  useEffect(() => {
    const initializeSocket = async () => {
      if (user?.userId) {
        const success = await initSocket();
        if (!success) {
          const retryInterval = setInterval(async () => {
            const retrySuccess = await initSocket();
            if (retrySuccess) {
              clearInterval(retryInterval);
            }
          }, 1000);

          return () => clearInterval(retryInterval);
        }
      }
    };

    initializeSocket();

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
    if (!socket || !user?.userId) return;

    const handleUserStatusChange = (data) => {
      console.log("Socket: Nhận sự kiện user-status-change", data);

      socket.emit('user-status-updated', {
        userId: data.userId,
        isOnline: data.status === 'online',
        lastActive: data.status === 'offline' ? data.lastActive : null,
      });
    };

    const handleMemberRemoved = (data) => {
      console.log("Socket: Nhận sự kiện member-removed", data);

      if (data.removedMembers.includes(user.userId)) {
        // TODO: Thêm thông báo cho người dùng mobile
        // TODO: Xử lý navigation trong React Native
      }
    };

    const handleAppStateChange = (nextAppState) => {
      console.log("App state changed to:", nextAppState);

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log("Window beforeunload - Đánh dấu user offline");
        if (socket?.connected) {
          socket.emit('user-status', {
            userId: user.userId,
            status: 'offline',
            lastActive: new Date().toISOString(),
          });
          socket.disconnect();
        }
      } else if (nextAppState === 'active' && (!socket || !socket.connected)) {
        initSocket();
      }
    };

    socket.on('user-status-change', handleUserStatusChange);
    socket.on('member-removed', handleMemberRemoved);
    const appStateListener = AppState.addEventListener('change', handleAppStateChange);

    socket.emit('user-status', {
      userId: user.userId,
      status: 'online',
    });

    const heartbeatInterval = setInterval(() => {
      if (socket?.connected) {
        socket.emit('heartbeat', { userId: user.userId });
      }
    }, 20000);

    return () => {
      if (socket?.connected) {
        socket.emit('user-status', {
          userId: user.userId,
          status: 'offline',
          lastActive: new Date().toISOString(),
        });
      }

      socket.off('user-status-change', handleUserStatusChange);
      socket.off('member-removed', handleMemberRemoved);
      appStateListener.remove();
      clearInterval(heartbeatInterval);
    };
  }, [socket, user?.userId]);

  const disconnect = () => {
    if (socket) {
      if (socket.connected && user?.userId) {
        socket.emit('user-status', {
          userId: user.userId,
          status: 'offline',
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
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};