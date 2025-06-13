import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env'; // 👈 lấy từ .env

let socket = null;

const initializeSocket = async (userId) => {
  if (socket) {
    socket.disconnect();
  }

  try {
    const token = await AsyncStorage.getItem('accessToken');
    const socketUrl = API_BASE_URL.replace(/^http/, 'ws'); // đổi https:// -> wss:// nếu cần

    socket = io(socketUrl, {
      auth: {
        token,
        userId,
      },
      timeout: 10000,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[SOCKET] Connected successfully');
    });

    socket.on('connect_error', (error) => {
      console.error('[SOCKET] Connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
      if (reason !== 'io server disconnect') {
        socket.connect();
      }
    });

    return socket;
  } catch (error) {
    console.error('[SOCKET] Failed to initialize:', error);
    throw error;
  }
};

const getSocket = () => socket;

const cleanupSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export { initializeSocket, getSocket, cleanupSocket };
