// FriendRequestsScreen.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  getFriendRequestsApi,
  acceptFriendRequestApi,
  rejectFriendRequestApi,
} from '../services/api';
import { useCurrentApp } from '../contexts/app.context';
import { useSocket } from '../contexts/socket.context';
import defaultAvatar from '../assets/images/defaultAvatar.jpg';

const FriendRequestsScreen = () => {
  const { messageApi } = useCurrentApp();
  const { socket } = useSocket();
  const [searchTerm, setSearchTerm] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState({});

  const getRequests = useCallback(async () => {
    try {
      const res = await getFriendRequestsApi();
      if (res.data?.status) {
        setRequests(res.data?.data || []);
        if (global.updateBottomTabFriendRequests) {
          global.updateBottomTabFriendRequests();
        }
      } else {
        // Check if messageApi exists before calling error
        if (messageApi && typeof messageApi.error === 'function') {
          messageApi.error(res.data?.message || 'Lỗi khi lấy danh sách lời mời kết bạn');
        } else {
          console.error('messageApi.error is unavailable, fallback:', res.data?.message || 'Lỗi khi lấy danh sách lời mời kết bạn');
        }
      }
    } catch (error) {
      // Check if messageApi exists before calling error
      if (messageApi && typeof messageApi.error === 'function') {
        messageApi.error('Không thể lấy danh sách lời mời kết bạn');
      } else {
        console.error('messageApi.error is unavailable, fallback: Không thể lấy danh sách lời mời kết bạn');
      }
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    getRequests();
  }, [getRequests]);

  useEffect(() => {
    if (!socket) {
      console.log('FriendRequests - Socket chưa được khởi tạo');
      return;
    }
  
    const handleFriendRequestReceived = (data) => {
      console.log('FriendRequests - Nhận được lời mời kết bạn mới:', data);
      getRequests();
    };
  
    const handleFriendRequestAccepted = (data) => {
      console.log('FriendRequests - Lời mời kết bạn được chấp nhận:', data);
      getRequests();
    };
  
    const handleFriendRequestRejected = (data) => {
      console.log('FriendRequests - Lời mời kết bạn bị từ chối:', data);
      getRequests();
    };
  
    socket.on('friend-request-received', handleFriendRequestReceived);
    socket.on('friend-request-accepted', handleFriendRequestAccepted);
    socket.on('friend-request-rejected', handleFriendRequestRejected);
  
    return () => {
      socket.off('friend-request-received', handleFriendRequestReceived);
      socket.off('friend-request-accepted', handleFriendRequestAccepted);
      socket.off('friend-request-rejected', handleFriendRequestRejected);
    };
  }, [socket, getRequests]);
  

  const handleAccept = async (id) => {
    setLoadingStates((prev) => ({ ...prev, [`accept_${id}`]: true }));
    try {
      const res = await acceptFriendRequestApi(id);
      if (res.data?.status) {
        await getRequests();
        socket?.emit('friend-request-accepted', { friendId: id });
  
        if (global.updateBottomTabFriendRequests) {
          global.updateBottomTabFriendRequests();
        }
  
        // Check if messageApi exists before calling success
        if (messageApi && typeof messageApi.success === 'function') {
          messageApi.success(res.data?.message || 'Đã chấp nhận lời mời kết bạn');
        } else {
          console.log('messageApi.success is unavailable, fallback:', res.data?.message || 'Đã chấp nhận lời mời kết bạn');
        }
      } else {
        // Check if messageApi exists before calling error
        if (messageApi && typeof messageApi.error === 'function') {
          messageApi.error(res.data?.message || 'Lỗi khi chấp nhận lời mời kết bạn');
        } else {
          console.error('messageApi.error is unavailable, fallback:', res.data?.message || 'Lỗi khi chấp nhận lời mời kết bạn');
        }
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      // Check if messageApi exists before calling error
      if (messageApi && typeof messageApi.error === 'function') {
        messageApi.error('Không thể chấp nhận lời mời kết bạn');
      } else {
        console.error('messageApi.error is unavailable, fallback: Không thể chấp nhận lời mời kết bạn');
      }
    } finally {
      setLoadingStates((prev) => ({ ...prev, [`accept_${id}`]: false }));
    }
  };
  

  const handleReject = async (id) => {
    setLoadingStates((prev) => ({ ...prev, [`reject_${id}`]: true }));
    try {
      const res = await rejectFriendRequestApi(id);
      if (res.data?.status) {
        await getRequests();
        socket?.emit('friend-request-rejected', { friendId: id });
  
        if (global.updateBottomTabFriendRequests) {
          global.updateBottomTabFriendRequests();
        }
  
        // Check if messageApi exists before calling success
        if (messageApi && typeof messageApi.success === 'function') {
          messageApi.success(res.data?.message || 'Đã từ chối lời mời kết bạn');
        } else {
          console.log('messageApi.success is unavailable, fallback:', res.data?.message || 'Đã từ chối lời mời kết bạn');
        }
      } else {
        // Check if messageApi exists before calling error
        if (messageApi && typeof messageApi.error === 'function') {
          messageApi.error(res.data?.message || 'Lỗi khi từ chối lời mời kết bạn');
        } else {
          console.error('messageApi.error is unavailable, fallback:', res.data?.message || 'Lỗi khi từ chối lời mời kết bạn');
        }
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      // Check if messageApi exists before calling error
      if (messageApi && typeof messageApi.error === 'function') {
        messageApi.error('Không thể từ chối lời mời kết bạn');
      } else {
        console.error('messageApi.error is unavailable, fallback: Không thể từ chối lời mời kết bạn');
      }
    } finally {
      setLoadingStates((prev) => ({ ...prev, [`reject_${id}`]: false }));
    }
  };
  

  const filteredRequests = requests.filter((r) =>
    r.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSafeAvatar = (user) =>
  user && typeof user.avatar === 'string' && user.avatar.trim() !== ''
    ? { uri: user.avatar }
    : defaultAvatar;


  return (
    <View style={styles.container}>
      <View style={styles.searchWrapper}>
        <TextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Tìm kiếm"
          placeholderTextColor="#999"
          style={styles.input}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : filteredRequests.length === 0 ? (
        <Text style={styles.emptyText}>Không có lời mời kết bạn nào</Text>
      ) : (
        <ScrollView style={styles.list}>
          {filteredRequests.map((r) => {
            const acceptLoading = loadingStates[`accept_${r.userId}`];
            const rejectLoading = loadingStates[`reject_${r.userId}`];
            const isDisabled = acceptLoading || rejectLoading;

            return (
              <View key={r.userId} style={styles.requestItem}>
                <View style={styles.info}>
               <Image source={getSafeAvatar(r)} style={styles.avatar} />



                  <Text style={styles.name}>{r.fullName}</Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.acceptBtn, isDisabled && styles.disabledBtn]}
                    onPress={() => handleAccept(r.userId)}
                    disabled={isDisabled}
                  >
                    {acceptLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.acceptText}>Đồng ý</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectBtn, isDisabled && styles.disabledBtnLight]}
                    onPress={() => handleReject(r.userId)}
                    disabled={isDisabled}
                  >
                    {rejectLoading ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <Text style={styles.rejectText}>Từ chối</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

export default FriendRequestsScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f2f2f2', padding: 16 },
    searchWrapper: {
      backgroundColor: '#fff',
      padding: 8,
      borderRadius: 10,
      marginBottom: 16,
    },
    input: {
      backgroundColor: '#eee',
      borderRadius: 8,
      padding: 10,
      color: '#333',
    },
    emptyText: {
      textAlign: 'center',
      color: '#666',
      marginTop: 40,
    },
    list: { flex: 1 },
    requestItem: {
      backgroundColor: '#fff',
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    info: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 30, height: 30, borderRadius: 20, marginRight: 10 },
    name: { fontWeight: '600', fontSize: 14, color: '#081b3a' },
  
    // Actions section with buttons
    actions: { 
      flexDirection: 'column', 
      justifyContent: 'space-between', 
      width: '50%',  // Make sure buttons are equally spaced
      gap: 12,  // More space between buttons
    },
  
    acceptBtn: {
      backgroundColor: '#0068ff',
      paddingHorizontal: 1,
      paddingVertical: 8,
      borderRadius: 8,
      flex: 1, // This makes sure the button stretches to fill its container
    },
    acceptText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  
    rejectBtn: {
      backgroundColor: '#f0f2f5',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      flex: 1, // This makes sure the button stretches to fill its container
    },
    rejectText: { color: '#081b3a', fontWeight: '600', textAlign: 'center' },
  
    disabledBtn: {
      opacity: 0.5,
    },
    disabledBtnLight: {
      opacity: 0.5,
    },
  });
  