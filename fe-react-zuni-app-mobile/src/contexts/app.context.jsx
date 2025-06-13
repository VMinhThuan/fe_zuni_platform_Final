import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, Animated } from 'react-native';

const CurrentAppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [chatList, setChatList] = useState([]);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Hiển thị toast (giống messageApi ở web)
  const messageApi = {
    open: ({ content }) => {
      setToastMessage(content);
      setToastVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setToastVisible(false);
          });
        }, 2000);
      });
    },
  };

  // Hiển thị thông báo (giống notificationApi ở web)
  const notificationApi = {
    success: ({ message, description }) =>
      messageApi.open({ content: `${message}${description ? `: ${description}` : ''}` }),
    error: ({ message, description }) =>
      messageApi.open({ content: `❌ ${message}${description ? `: ${description}` : ''}` }),
    info: ({ message, description }) =>
      messageApi.open({ content: `ℹ️ ${message}${description ? `: ${description}` : ''}` }),
  };

  // Hàm đăng xuất
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setChatList([]); // Xóa chatList khi đăng xuất
  };

  return (
    <>
      {!isAppLoading ? (
        <CurrentAppContext.Provider
          value={{
            isAppLoading,
            setIsAppLoading,
            isAuthenticated,
            setIsAuthenticated,
            user,
            setUser,
            messageApi,
            contextHolder: null,
            notificationApi,
            chatList,
            setChatList,
            contextNotifiHolder: null,
            logout, // Thêm logout vào context
          }}
        >
          {children}
          {toastVisible && (
            <Animated.View style={[styles.toast, { opacity: fadeAnim }]}>
              <Text style={styles.toastText}>{toastMessage}</Text>
            </Animated.View>
          )}
        </CurrentAppContext.Provider>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1890ff" />
        </View>
      )}
    </>
  );
};

export const useCurrentApp = () => {
  const context = useContext(CurrentAppContext);
  if (!context) {
    throw new Error('useCurrentApp must be used within <AppProvider>');
  }
  return context;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toast: {
    position: 'absolute',
    bottom: 80,
    left: 40,
    right: 40,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  toastText: {
    color: 'white',
    textAlign: 'center',
  },
});