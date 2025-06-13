import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Text,
  Modal,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { useNavigation, useNavigationState } from '@react-navigation/native';

import defaultAvatar from '../assets/images/defaultAvatar.jpg';
import { useCurrentApp } from '../contexts/app.context';
import { useSocket } from '../contexts/socket.context';
import { getFriendRequestsApi, logoutApi } from '../services/api';

// Component riêng cho Profile Modal
const ProfileModal = ({ visible, onClose, user, onLogout, onOpenSettings }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide" // Thay đổi animationType thành slide
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{user?.fullName || 'Người dùng'}</Text>
          <TouchableOpacity onPress={onOpenSettings} style={styles.modalItem}>
            <AntDesign name="setting" size={20} color="#333" />
            <Text style={styles.modalText}>Cài đặt</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onLogout} style={styles.modalItem}>
            <MaterialIcons name="logout" size={20} color="#e74c3c" />
            <Text style={[styles.modalText, { color: '#e74c3c' }]}>Đăng xuất</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Component riêng cho Settings Modal
const SettingsModal = ({ visible, onClose, onLogout }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide" // Thay đổi animationType thành slide
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Cài đặt</Text>
          <TouchableOpacity onPress={onLogout} style={styles.modalItem}>
            <MaterialIcons name="logout" size={20} color="#e74c3c" />
            <Text style={[styles.modalText, { color: '#e74c3c' }]}>Đăng xuất</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const BottomTabNavigator = ({ chatList = [] }) => {
  const navigation = useNavigation();
  const currentRouteName = useNavigationState(
    (state) => state.routes[state.index]?.name,
  );
  const { user, setUser, setIsAuthenticated, messageApi } = useCurrentApp();
  const { socket } = useSocket();
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const unreadCount = chatList.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  useEffect(() => {
  }, [showProfileModal]); 

  useEffect(() => {
  }, [showSettingsModal]);

  const getFriendRequests = useCallback(async () => {
    try {
      const res = await getFriendRequestsApi();
      if (res?.data?.status && Array.isArray(res.data.data)) {
        setFriendRequestCount(res.data.data.length);
      } else {
        console.error('BottomTab - Response không hợp lệ:', res);
        setFriendRequestCount(0);
      }
    } catch (err) {
      console.error('BottomTab - Lỗi khi lấy lời mời kết bạn:', err);
      setFriendRequestCount(0);
    }
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleFriendRequestReceived = () => {
      getFriendRequests();
    };

    const handleFriendRequestAccepted = () => {
      getFriendRequests();
    };

    const handleFriendRequestRejected = () => {
      getFriendRequests();
    };

    socket.on('friend-request-received', handleFriendRequestReceived);
    socket.on('friend-request-accepted', handleFriendRequestAccepted);
    socket.on('friend-request-rejected', handleFriendRequestRejected);

    socket.on('connect', () => {
      getFriendRequests();
    });

    socket.on('disconnect', () => {
    });

    return () => {
      socket.off('friend-request-received', handleFriendRequestReceived);
      socket.off('friend-request-accepted', handleFriendRequestAccepted);
      socket.off('friend-request-rejected', handleFriendRequestRejected);
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [socket, getFriendRequests]);

  useEffect(() => {
    if (socket?.connected) {
      getFriendRequests();
    }
  }, [socket?.connected, getFriendRequests]);

  const handleLogout = async () => {
    try {
      const res = await logoutApi();
      setShowProfileModal(false);
      setShowSettingsModal(false);

      setUser(null);
      setIsAuthenticated(false);
      messageApi.open({ type: 'success', content: 'Đăng xuất thành công!' });
      navigation.navigate('MainScreen');
    } catch (err) {
      messageApi.open({ type: 'error', content: 'Đăng xuất thất bại!' });
    }
  };

  const handleAvatarPress = () => {
    if (user) {
      setShowProfileModal(true);
    } else {
      messageApi.open({ type: 'warning', content: 'Vui lòng đăng nhập!' });
      navigation.navigate('Login');
    }
  };

  const handleCloseProfileModal = () => {
    setShowProfileModal(false);
  };

  const handleCloseSettingsModal = () => {
    setShowSettingsModal(false);
  };

  const handleOpenSettings = () => {
    setShowProfileModal(false);
    setShowSettingsModal(true);
  };

  const icons = {
    chat: require('../assets/images/chat.png'),
    friends: require('../assets/images/friend_icon.png'),
    upload: require('../assets/images/upload_icon.png'),
    cloud: require('../assets/images/cloud.png'),
    settings: require('../assets/images/setting.png'),
    login: require('../assets/images/login_icon.png'),
  };

  const tabs = [
    {
      key: 'Chat',
      icon: (
        <View>
          <Image
            source={icons.chat}
            style={[
              styles.iconImage,
              currentRouteName === 'HomeScreen' && styles.iconImageActive,
            ]}
          />
          {unreadCount > 0 && (
            <View style={styles.badgeChat}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      ),
      onPress: () => navigation.navigate('HomeScreen'),
    },
    {
      key: 'Friends',
      icon: (
        <View>
          <Image
            source={icons.friends}
            style={[
              styles.iconImage,
              currentRouteName === 'FriendPageScreen' && styles.iconImageActive,
            ]}
          />
          {friendRequestCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{friendRequestCount}</Text>
            </View>
          )}
        </View>
      ),
      onPress: () => navigation.navigate('FriendPageScreen'),
    },
    {
      key: 'Upload',
      icon: (
        <Image
          source={icons.upload}
          style={[
            styles.iconImage,
            currentRouteName === 'UploadScreen' && styles.iconImageActive,
          ]}
        />
      ),
      onPress: () => {
        messageApi.open({ type: 'info', content: 'Chức năng đang phát triển' });
      },
    },
    {
      key: 'Cloud',
      icon: (
        <Image
          source={icons.cloud}
          style={[
            styles.iconImage,
            currentRouteName === 'CloudScreen' && styles.iconImageActive,
          ]}
        />
      ),
      onPress: () => {
        messageApi.open({ type: 'info', content: 'Chức năng đang phát triển' });
      },
    },
    {
      key: 'Settings',
      icon: (
        <Image
          source={icons.settings}
          style={[
            styles.iconImage,
            currentRouteName === 'SettingsScreen' && styles.iconImageActive,
          ]}
        />
      ),
      onPress: () => setShowSettingsModal(true),
    },
  ];

  return (
    <View>
      <View style={styles.container}>
        <TouchableOpacity
          onPress={handleAvatarPress}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          style={styles.avatarButton}
        >
          {user ? (
            <Image
              source={user?.avatar ? { uri: user.avatar } : defaultAvatar}
              style={styles.avatar}
            />
          ) : (
            <Image source={icons.login} style={styles.iconImage} />
          )}
        </TouchableOpacity>

        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={index}
            onPress={tab.onPress}
            style={styles.tabButton}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            {tab.icon}
          </TouchableOpacity>
        ))}
      </View>

      <ProfileModal
        visible={showProfileModal}
        onClose={handleCloseProfileModal}
        user={user}
        onLogout={handleLogout}
        onOpenSettings={handleOpenSettings}
      />

      <SettingsModal
        visible={showSettingsModal}
        onClose={handleCloseSettingsModal}
        onLogout={handleLogout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  avatarButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  iconImage: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
    tintColor: '#666',
  },
  iconImageActive: {
    tintColor: '#007bff',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#007bff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    width: 300,
    borderRadius: 16,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontWeight: '700',
    fontSize: 18,
    color: '#333',
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    width: '100%',
  },
  modalText: {
    fontSize: 16,
    color: '#333',
  },
  modalClose: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeChat: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default BottomTabNavigator;