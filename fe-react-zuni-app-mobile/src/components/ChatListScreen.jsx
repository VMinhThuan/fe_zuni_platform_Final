import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSocket } from '../contexts/socket.context';
import { useCurrentApp } from '../contexts/app.context';
import {
  searchUserByPhoneApi,
  sendFriendRequestApi,
  getConversationsApi,
} from '../services/api';
import defaultAvatar from '../assets/images/defaultAvatar.jpg';
import InfoModal from './InfoModal';
import CreateGroupModal from './CreateGroupScreen';

// Import icons (replace with your actual assets)
import searchIcon from '../assets/images/search.png';
import closeIcon from '../assets/images/closeIcon.png';
import addUserIcon from '../assets/images/addUserIcon.png';
import addGroupIcon from '../assets/images/addGroupIcon.png';
import phoneIcon from '../assets/images/phoneIcon.png';
import dotsIcon from '../assets/images/dotsIcon.png';
import groupIcon from '../assets/images/groupIcon.png';

const ChatListScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, setUser, notificationApi } = useCurrentApp();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('all');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const searchResultRef = useRef(null);

  const handleSearch = useCallback(
    async (phoneNumber) => {
      if (!phoneNumber || phoneNumber.length !== 10) return;

      setLoading(true);
      setError('');
      setSearchResult(null);

      try {
        const res = await searchUserByPhoneApi(phoneNumber);
        if (res.data?.status && res.data?.data) {
          setSearchResult({
            ...res.data.data,
            isFriend: user?.contacts?.includes(res.data.data.userId),
          });
        } else {
          setError(
            'Số điện thoại chưa đăng ký tài khoản hoặc không cho phép tìm kiếm.'
          );
        }
      } catch (error) {
        console.error('Error searching user:', error);
        setError('Có lỗi xảy ra khi tìm kiếm.');
      } finally {
        setLoading(false);
      }
    },
    [user?.contacts]
  );

  useEffect(() => {
    if (!socket || !user?.userId) return;

    // Lắng nghe sự kiện thêm thành viên vào nhóm (real-time giống Web)
    const handleMemberAdded = (data) => {
      const allUserIds = (data.participants || []).map(u => u.userId || u);
      setChatList(prev => {
        const existsIdx = prev.findIndex(chat => chat.conversationId === data.conversationId);
        if (allUserIds.includes(user.userId)) {
          // Nếu user là người được thêm, thêm chat mới nếu chưa có
          if (existsIdx === -1) {
            // Lấy thông tin group từ nhiều trường khác nhau
            const groupName = data.groupName || data.name || (data.conversation && (data.conversation.groupName || data.conversation.name)) || 'Nhóm mới';
            const groupAvatar = data.groupAvatar || data.avatar || (data.conversation && (data.conversation.groupAvatar || data.conversation.avatar)) || '';
            const newChat = {
              conversationId: data.conversationId,
              name: groupName,
              avatar: groupAvatar,
              participants: data.participants,
              type: 'group',
              lastMsg: 'Bạn vừa được thêm vào nhóm',
              time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              lastMessageTime: new Date().toISOString(),
              unreadCount: 0,
            };
            return [newChat, ...prev];
          }
        }
        // Nếu group đã có, cập nhật participants
        return prev.map(chat =>
          chat.conversationId === data.conversationId
            ? { ...chat, participants: data.participants }
            : chat
        );
      });
      if (allUserIds.includes(user.userId)) {
        // Nếu user là người được thêm, fetch lại danh sách chat
        fetchAllChats();
      }
    };
    socket.on('member-added', handleMemberAdded);
    return () => {
      socket.off('member-added', handleMemberAdded);
    };
  }, [socket, user?.userId]);

  useEffect(() => {
    const fetchAllChats = async () => {
      try {
        const response = await getConversationsApi();
        if (response.data?.status && response.data?.data) {
          const sortedChats = response.data.data.sort((a, b) => {
            const timeA = new Date(a.lastMessageTime || a.createdAt || 0);
            const timeB = new Date(b.lastMessageTime || b.createdAt || 0);
            return timeB - timeA;
          });

          const formattedChats = sortedChats.map((chat) => ({
            ...chat,
            time: formatTime(chat.lastMessageTime || chat.createdAt),
          }));

          setChatList(formattedChats);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      }
    };

    fetchAllChats();
  }, []);

  useEffect(() => {
    if (phone.length === 10) {
      handleSearch(phone);
    } else if (phone.length > 0) {
      setError(
        'Số điện thoại chưa đăng ký tài khoản hoặc không cho phép tìm kiếm.'
      );
      setSearchResult(null);
    }
  }, [phone, handleSearch]);

  useEffect(() => {
    if (!socket) return;

    const updateChatList = (data) => {
      setChatList((prev) => {
        const updatedList = [...prev];
        const chatIndex = updatedList.findIndex(
          (chat) => chat.conversationId === data.conversationId
        );

        if (chatIndex !== -1) {
          const updatedChat = {
            ...updatedList[chatIndex],
            lastMsg:
              data.type === 'group'
                ? `${data.sender?.name || data.senderName}: ${data.content}`
                : data.content,
            time: formatTime(data.createdAt || Date.now()),
            lastMessageTime: data.createdAt || Date.now(),
            unreadCount:
              data.senderId !== user?.userId
                ? (updatedList[chatIndex].unreadCount || 0) + 1
                : updatedList[chatIndex].unreadCount,
            senderId: data.senderId,
          };

          updatedList.splice(chatIndex, 1);
          updatedList.unshift(updatedChat);
        } else {
          const newChat = {
            conversationId: data.conversationId,
            name: data.type === 'group' ? data.groupName : data.senderName,
            avatar: data.type === 'group' ? data.groupAvatar : data.senderAvatar,
            lastMsg:
              data.type === 'group'
                ? `${data.sender?.name || data.senderName}: ${data.content}`
                : data.content,
            time: formatTime(data.createdAt || Date.now()),
            lastMessageTime: data.createdAt || Date.now(),
            unreadCount: data.senderId !== user?.userId ? 1 : 0,
            type: data.type,
            senderId: data.senderId,
          };
          updatedList.unshift(newChat);
        }

        return updatedList;
      });
    };

    const handleNewMessage = (data) => {
      updateChatList(data);
    };

    const handleSentMessage = (data) => {
      updateChatList(data);
    };

    const handleGroupCreated = (data) => {
      const { conversation, participants } = data;

      const isParticipant = participants.includes(user?.userId);
      if (!isParticipant) {
        return;
      }

      const newChat = {
        ...conversation,
        type: 'group',
        time: formatTime(conversation.createdAt || Date.now()),
        lastMessageTime: conversation.createdAt || Date.now(),
        unreadCount: 0,
        lastMsg: 'Nhóm mới được tạo',
      };

      setChatList((prev) => {
        const exists = prev.some(
          (chat) => chat.conversationId === conversation.conversationId
        );

        if (exists) {
          return prev.map((chat) =>
            chat.conversationId === conversation.conversationId
              ? { ...chat, ...newChat }
              : chat
          );
        }

        return [newChat, ...prev];
      });
    };

    socket.on('receive-message', handleNewMessage);
    socket.on('send-message-success', handleSentMessage);
    socket.on('group-created', handleGroupCreated);

    return () => {
      socket.off('receive-message', handleNewMessage);
      socket.off('send-message-success', handleSentMessage);
      socket.off('group-created', handleGroupCreated);
    };
  }, [socket, user?.userId]);

  useEffect(() => {
    if (!socket) return;

    const handleUnfriend = (data) => {
      if (!user?.contacts) return;

      setUser((prev) => {
        const newContacts = prev.contacts.filter((id) => id !== data.friendId);
        return {
          ...prev,
          contacts: newContacts,
        };
      });

      if (searchResult?.userId === data.friendId) {
        setSearchResult((prev) => ({
          ...prev,
          isFriend: false,
        }));
      }
    };

    const handleAcceptFriend = (data) => {
      if (!user?.contacts) return;

      setUser((prev) => ({
        ...prev,
        contacts: [...prev.contacts, data.friendId],
      }));

      if (searchResult?.userId === data.friendId) {
        setSearchResult((prev) => ({
          ...prev,
          isFriend: true,
        }));
      }
    };

    const handleRejectFriend = (data) => {
      if (!searchResult) return;

      if (searchResult.userId === data.by) {
        setSearchResult((prev) => ({
          ...prev,
          isFriend: false,
        }));
      }
    };

    socket.on('friend-removed', handleUnfriend);
    socket.on('friend-request-accepted', handleAcceptFriend);
    socket.on('friend-request-rejected', handleRejectFriend);

    return () => {
      socket.off('friend-removed', handleUnfriend);
      socket.off('friend-request-accepted', handleAcceptFriend);
      socket.off('friend-request-rejected', handleRejectFriend);
    };
  }, [socket, user, searchResult, setUser]);

  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult?.userId) return;

    setSending(true);
    try {
      const res = await sendFriendRequestApi(searchResult.userId);
      if (res.data?.status) {
        notificationApi.success(res.data?.message || 'Đã gửi lời mời kết bạn');
        socket.emit('send-friend-request', {
          receiverId: searchResult.userId,
          senderId: user.userId,
          senderName: user.fullName,
          senderAvatar: user.avatar,
        });
        setPhone('');
        setSearchResult(null);
      } else {
        notificationApi.error(res.data?.message || 'Không thể gửi lời mời kết bạn');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      notificationApi.error('Có lỗi xảy ra khi gửi lời mời kết bạn');
    } finally {
      setSending(false);
    }
  };

  const handleClearSearch = () => {
    setPhone('');
    setSearchResult(null);
    setError('');
    searchResultRef.current?.focus();
  };

  const handleInputChange = (value) => {
    const cleanedValue = value.replace(/[^0-9]/g, '');
    if (cleanedValue.length <= 10) {
      setPhone(cleanedValue);
      if (cleanedValue.length === 0) {
        setSearchResult(null);
        setError('');
      }
    }
  };

  const handleSearchResultClick = () => {
    if (!searchResult) return;

    if (searchResult.userId === user?.userId) {
      setIsInfoModalOpen(true);
    } else {
      navigation.navigate('ChatDetail', {
        id: searchResult.userId,
        userInfo: {
          userId: searchResult.userId,
          fullName: searchResult.fullName,
          avatar: searchResult.avatar,
          isGroup: false,
        },
      });
    }
  };

  const handleNavigateToChat = (chat) => {
    navigation.navigate('ChatDetail', {
      id: chat.type === 'group' ? chat.conversationId : chat.id,
      userInfo: {
        userId: chat.id,
        fullName: chat.name,
        avatar: chat.avatar,
        isGroup: chat.type === 'group',
        conversationId: chat.conversationId,
      },
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';

    const date = new Date(timeString);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      return days[date.getDay()];
    }

    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      });
    }

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleOpenCreateGroupModal = () => {
    navigation.navigate('CreateGroupScreen');
  };

  const handleCloseCreateGroupModal = () => {
    setShowCreateGroupModal(false);
  };

  const handleCreateGroup = async (groupData) => {
    try {
      notificationApi.success('Tạo nhóm thành công');
      handleCloseCreateGroupModal();

      if (groupData && groupData.conversationId) {
        // Chuẩn bị dữ liệu để phát sự kiện group-created qua socket
        const socketData = {
          conversation: {
            conversationId: groupData.conversationId,
            name: groupData.name,
            avatar: groupData.avatar,
            createdAt: new Date().toISOString(),
          },
          participants: groupData.participants,
        };

        // Phát sự kiện group-created qua socket
        if (socket?.connected) {
          socket.emit('group-created', socketData);
        }

        // Điều hướng đến màn hình chat của nhóm mới
        navigation.navigate('ChatDetail', {
          id: groupData.conversationId,
          userInfo: {
            userId: groupData.conversationId,
            fullName: groupData.name,
            avatar: groupData.avatar,
            isGroup: true,
            conversationId: groupData.conversationId,
          },
        });
      }
    } catch (error) {
      console.error('Lỗi khi tạo nhóm:', error);
      notificationApi.error('Không thể tạo nhóm');
    }
  };

  const renderMessageItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleNavigateToChat(item)}
      style={[
        styles.chatItem,
        (item.type === 'group'
          ? item.conversationId === route.params?.id
          : item.id === route.params?.id) && styles.activeChatItem,
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={item.avatar ? { uri: item.avatar } : defaultAvatar}
          style={styles.avatar}
        />
        {item.type === 'group' && (
          <View style={styles.groupIndicator}>
            <Image source={groupIcon} style={styles.groupIcon} />
          </View>
        )}
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name || 'Người dùng'}
          </Text>
          <Text style={styles.time}>{formatTime(item.lastMessageTime)}</Text>
        </View>
        <View style={styles.chatFooter}>
          <View style={styles.lastMsgContainer}>
            {item.senderId && item.senderId !== user?.userId && item.lastMsg && (
              <View style={styles.senderDot} />
            )}
            <Text style={styles.lastMsg} numberOfLines={1}>
              {item.lastMsg || 'Chưa có tin nhắn'}
            </Text>
          </View>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 9 ? '9+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.searchRow}>
            <Image source={searchIcon} style={styles.icon} />
            <TextInput
              ref={searchResultRef}
              style={styles.input}
              value={phone}
              onChangeText={handleInputChange}
              placeholder="Tìm kiếm số điện thoại"
              placeholderTextColor="#647187"
              keyboardType="numeric"
            />
            {phone && (
              <TouchableOpacity onPress={handleClearSearch}>
                <Image source={closeIcon} style={styles.icon} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.headerButton}>
              <Image source={addUserIcon} style={styles.iconAdd} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleOpenCreateGroupModal}
            >
              <Image source={addGroupIcon} style={styles.iconAdd} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.tabs}>
        <View style={styles.tabContainer}>
          <TouchableOpacity onPress={() => handleTabChange('all')}>
            <Text
              style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            >
              Tất cả
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleTabChange('unread')}>
            <Text
              style={[styles.tab, activeTab === 'unread' && styles.activeTab]}
            >
              Chưa đọc
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dotsButton}>
            <Image source={dotsIcon} style={styles.icon} />
          </TouchableOpacity>
        </View>
        <View
          style={[
            styles.tabIndicator,
            {
              width: activeTab === 'all' ? 40 : 62,
              left: activeTab === 'all' ? 16 : 72,
            },
          ]}
        />
      </View>

      {(error || phone.length > 0) && !searchResult && !loading && (
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Image source={phoneIcon} style={styles.errorIcon} />
          </View>
          <Text style={styles.errorText}>
            {error ||
              'Số điện thoại chưa đăng ký tài khoản hoặc không cho phép tìm kiếm.'}
          </Text>
        </View>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0068ff" />
        </View>
      )}

      {searchResult && (
        <TouchableOpacity
          onPress={handleSearchResultClick}
          style={styles.searchResultItem}
          activeOpacity={0.7}
        >
          <Image
            source={searchResult.avatar ? { uri: searchResult.avatar } : defaultAvatar}
            style={styles.avatar}
          />
          <View style={styles.searchResultInfo}>
            <Text style={styles.name}>{searchResult.fullName}</Text>
            <Text style={styles.phone}>
              Số điện thoại: <Text style={styles.phoneNumber}>{searchResult.phone}</Text>
            </Text>
          </View>
          {searchResult.userId === user?.userId ? (
            <Text style={[styles.friendStatus, { color: '#0068ff', fontWeight: 'bold' }]}>Bạn</Text>
          ) : searchResult.isFriend ? (
            <Text style={styles.friendStatus}>Bạn bè</Text>
          ) : (
            <TouchableOpacity
              onPress={handleSendRequest}
              disabled={sending}
              style={[styles.addButton, sending && styles.disabledButton]}
            >
              {sending ? (
                <View style={styles.buttonLoading}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.buttonText}>Kết bạn</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Kết bạn</Text>
              )}
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}

      {!phone && (
        <FlatList
          data={activeTab === 'all' ? chatList : chatList.filter((chat) => chat.unreadCount > 0)}
          keyExtractor={(item) => (item.type === 'group' ? item.conversationId : item.id)}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.chatList}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Bạn chưa có cuộc trò chuyện nào.
            </Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.15)',
    backgroundColor: '#3497fd',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ebecf0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    marginHorizontal: 8,
    color: '#081b3a',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  icon: {
    width: 20,
    height: 20,
  },
  iconAdd: {
    width: 20,
    height: 20,
    tintColor: '#fff',
  },
  tabs: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.15)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  tab: {
    fontSize: 14,
    fontWeight: '500',
    color: '#647187',
    marginRight: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  activeTab: {
    color: '#0068ff',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: '#0068ff',
    borderRadius: 1,
  },
  dotsButton: {
    padding: 3,
    borderRadius: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f2f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIcon: {
    width: 32,
    height: 32,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#647187',
    maxWidth: 250,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.15)',
  },
  searchResultInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#081b3a',
  },
  phone: {
    fontSize: 12,
    color: '#647187',
    marginTop: 4,
  },
  phoneNumber: {
    color: '#005ae0',
    fontWeight: '500',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0068ff:',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  friendStatus: {
    fontSize: 14,
    color: '#647187',
    fontWeight: '500',
  },
  chatList: {
    paddingVertical: 12,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
  },
  activeChatItem: {
    backgroundColor: '#dbebff',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  groupIndicator: {
    position: 'absolute',
    bottom: -2,
    right: 6,
    backgroundColor: '#5CD6FF',
    borderRadius: 8,
    padding: 2,
  },
  groupIcon: {
    width: 22,
    height: 22,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  lastMsgContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  senderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0068ff',
    marginRight: 4,
  },
  lastMsg: {
    fontSize: 14,
    color: '#647187',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#647187',
  },
  unreadBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#647187',
    marginTop: 20,
    paddingHorizontal: 20,
  },
});

export default ChatListScreen;