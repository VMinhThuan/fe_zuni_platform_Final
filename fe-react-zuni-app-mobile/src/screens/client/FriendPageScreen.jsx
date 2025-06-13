import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { Badge } from 'react-native-elements';
import { getFriendRequestsApi } from '../../services/api';
import { useSocket } from '../../contexts/socket.context';
import { useCurrentApp } from '../../contexts/app.context';
import FriendListScreen from '../../components/FriendListScreen';
import GroupListScreen from '../../components/GroupListScreen';
import FriendRequestsScreen from '../../components/FriendRequestsScreen';
import GroupInvitesScreen from '../../components/GroupInvitesScreen';

const Stack = createStackNavigator();

const MENU_TYPES = {
  FRIENDS: 'friends',
  GROUPS: 'groups',
  FRIEND_REQUESTS: 'friend_requests',
  GROUP_INVITES: 'group_invites',
};

const menuItems = [
  {
    type: MENU_TYPES.FRIENDS,
    label: 'Bạn bè',
    icon: 'people-outline',
    screen: 'FriendList',
  },
  {
    type: MENU_TYPES.GROUPS,
    label: 'Nhóm',
    icon: 'chatbubbles-outline',
    screen: 'GroupList',
  },
  {
    type: MENU_TYPES.FRIEND_REQUESTS,
    label: 'Lời mời',
    icon: 'person-add-outline',
    screen: 'FriendRequests',
  },
  {
    type: MENU_TYPES.GROUP_INVITES,
    label: 'Mời vào nhóm',
    icon: 'mail-unread-outline',
    screen: 'GroupInvites',
  },
];

// Main Menu Screen Component
const MainMenuScreen = ({ navigation }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const { socket } = useSocket();
  const { messageApi } = useCurrentApp();

  const getFriendRequests = useCallback(async () => {
    try {
      const res = await getFriendRequestsApi();
      const requests = res.data?.data;
      if (res.data?.status && Array.isArray(requests)) {
        setFriendRequestCount(requests.length);
      } else {
        setFriendRequestCount(0);
      }
    } catch (err) {
      console.error("Lỗi khi lấy lời mời kết bạn:", err);
      setFriendRequestCount(0);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('friend-request-received', getFriendRequests);
    socket.on('friend-request-accepted', getFriendRequests);
    socket.on('friend-request-rejected', getFriendRequests);

    return () => {
      socket.off('friend-request-received', getFriendRequests);
      socket.off('friend-request-accepted', getFriendRequests);
      socket.off('friend-request-rejected', getFriendRequests);
    };
 Alyssa  }, [socket]);

  useEffect(() => {
    getFriendRequests();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Bạn bè</Text>
      <TextInput
        placeholder="Tìm kiếm"
        placeholderTextColor="#888"
        value={searchTerm}
        onChangeText={setSearchTerm}
        style={styles.searchInput}
      />
      {menuItems.map((item) => (
        <TouchableOpacity
          key={item.type}
          style={styles.menuItem}
          onPress={() => navigation.navigate(item.screen, { searchTerm })}
        >
          <View style={styles.iconLabel}>
            <Icon name={item.icon} size={24} color="#007AFF" />
            <Text style={styles.menuLabel}>{item.label}</Text>
          </View>
          {item.type === MENU_TYPES.FRIEND_REQUESTS && friendRequestCount > 0 && (
            <Badge value={friendRequestCount} status="error" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Main Stack Navigator
const FriendPageScreen = () => {
  return (
    <Stack.Navigator
      initialRouteName="MainMenu"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
          elevation: 2,
          shadowOpacity: 0.1,
        },
        headerTintColor: '#000',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="MainMenu"
        component={MainMenuScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FriendList"
        component={FriendListScreen}
        options={{ title: 'Bạn bè' }}
      />
      <Stack.Screen
        name="GroupList"
        component={GroupListScreen}
        options={{ title: 'Nhóm' }}
      />
      <Stack.Screen
        name="FriendRequests"
        component={FriendRequestsScreen}
        options={{ title: 'Lời mời' }}
      />
      <Stack.Screen
        name="GroupInvites"
        component={GroupInvitesScreen}
        options={{ title: 'Mời vào nhóm' }}
      />
    </Stack.Navigator>
  );
};

export default FriendPageScreen;

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#f0f2f5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuLabel: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '600',
  },
});