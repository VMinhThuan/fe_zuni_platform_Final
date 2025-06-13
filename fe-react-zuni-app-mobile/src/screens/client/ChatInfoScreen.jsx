import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Switch,
  ScrollView,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  Platform,
  ToastAndroid,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import defaultAvatar from '../../assets/images/defaultAvatar.jpg';
import searchIcon from '../../assets/images/search.png';
import fileImageIcon from '../../assets/icons/file-image.png';
import addGroupIcon from '../../assets/images/addGroupIcon.png';
import bellIcon from '../../assets/icons/bell.png';
import penIcon from '../../assets/icons/pen.png';
import starIcon from '../../assets/icons/star.png';
import clockIcon from '../../assets/icons/clock.png';
import arrowRightIcon from '../../assets/icons/arrowRightIcon.png';
import userIcon from '../../assets/icons/user.png';
import brushIcon from '../../assets/icons/brush.png';
import groupAddIcon from '../../assets/icons/group-add.png';
import groupUserIcon from '../../assets/icons/group-user.png';
import arrowLeftIcon from '../../assets/icons/arrowLeftIcon.png';
import reloadIcon from '../../assets/icons/reload.png';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMessagesApi, leaveGroupApi, updateConversationApi } from '../../services/api';
import { useCurrentApp } from '../../contexts/app.context';
import { useSocket } from '../../contexts/socket.context';

const { width } = Dimensions.get('window');

const ChatInfoScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { chatUser, conversationId } = route.params || {};
  const { socket } = useSocket();
  const { user: currentUser } = useCurrentApp();
  const [imageMessages, setImageMessages] = useState([]);
  const [fileMessages, setFileMessages] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [groupParticipants, setGroupParticipants] = useState(chatUser?.participants || []);

  // --- Nickname state ---
  const [nickname, setNickname] = useState(chatUser?.nickname || '');
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [inputValue, setInputValue] = useState(nickname || chatUser?.fullName || '');

  useEffect(() => {
    if (!socket || !conversationId) return;
    
    const handleMemberAdded = (data) => {
      if (data.conversationId === conversationId && Array.isArray(data.participants)) {
        console.log('Member added, updating participants:', data.participants);
        setGroupParticipants(data.participants);
        // Cập nhật title của màn hình
        navigation.setParams({
          chatUser: {
            ...chatUser,
            participants: data.participants,
            totalMembers: data.participants.length
          }
        });
      }
    };

    const handleMemberRemoved = (data) => {
      if (data.conversationId === conversationId && Array.isArray(data.participants)) {
        console.log('Member removed, updating participants:', data.participants);
        setGroupParticipants(data.participants);
        // Cập nhật title của màn hình
        navigation.setParams({
          chatUser: {
            ...chatUser,
            participants: data.participants,
            totalMembers: data.participants.length
          }
        });
      }
    };

    const handleMemberLeft = (data) => {
      if (data.conversationId === conversationId && data.conversation?.participants) {
        console.log('Member left, updating participants:', data.conversation.participants);
        setGroupParticipants(data.conversation.participants);
        // Cập nhật title của màn hình
        navigation.setParams({
          chatUser: {
            ...chatUser,
            participants: data.conversation.participants,
            totalMembers: data.conversation.participants.length,
            admin: data.conversation.admin
          }
        });
      }
    };

    socket.on('member-added', handleMemberAdded);
    socket.on('member-removed', handleMemberRemoved);
    socket.on('member-left', handleMemberLeft);

    return () => {
      socket.off('member-added', handleMemberAdded);
      socket.off('member-removed', handleMemberRemoved);
      socket.off('member-left', handleMemberLeft);
    };
  }, [socket, conversationId, chatUser]);

  // Check if current user is admin
  useEffect(() => {
    console.log('DEBUG chatUser:', chatUser);
    console.log('DEBUG chatUser.admin:', chatUser?.admin);
    console.log('DEBUG chatUser.creator:', chatUser?.creator);
    console.log('DEBUG currentUser.userId:', currentUser?.userId);
    const adminId = chatUser?.admin || chatUser?.creator;
    setIsAdmin(adminId === currentUser?.userId);
  }, [chatUser, currentUser?.userId]);

  // Lấy nickname từ AsyncStorage khi mở màn
  useEffect(() => {
    const fetchNickname = async () => {
      try {
        const key = `nickname_${chatUser?.userId}`;
        const stored = await AsyncStorage.getItem(key);
        if (stored) setNickname(stored);
      } catch { }
    };
    if (chatUser?.userId) fetchNickname();
  }, [chatUser?.userId]);

  const [refreshing, setRefreshing] = useState(false);

  const fetchMedia = async () => {
    if (!conversationId) return;
    try {
      const res = await getMessagesApi(conversationId, 200);
      if (res.data?.status && Array.isArray(res.data?.data?.messages)) {
        const allMessages = res.data.data.messages;
        // Lọc ảnh
        const images = allMessages.filter(msg => {
          if (msg.type === 'image') return true;
          if (msg.type === 'file' && msg.metadata) {
            try {
              const meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
              return meta.isImage || (meta.fileExt && ['jpg', 'jpeg', 'png', 'gif'].includes(meta.fileExt.toLowerCase()));
            } catch { return false; }
          }
          return false;
        });
        // Lọc file (không phải ảnh)
        const files = allMessages.filter(msg => {
          if (msg.type === 'file' && msg.metadata) {
            try {
              const meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
              return !meta.isImage && meta.fileExt && !['jpg', 'jpeg', 'png', 'gif'].includes(meta.fileExt.toLowerCase());
            } catch { return false; }
          }
          return false;
        });
        setImageMessages(images);
        setFileMessages(files);
      }
    } catch (e) {
      setImageMessages([]);
      setFileMessages([]);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [conversationId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMedia();
    setRefreshing(false);
  };

  // Toast helper
  const showToast = (msg) => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
    // iOS: có thể dùng 1 thư viện toast hoặc custom
  };

  // Khi lưu nickname
  const handleSaveNickname = async () => {
    const newNickname = inputValue.trim();
    setNickname(newNickname);
    setShowNicknameModal(false);
    showToast('Đã đổi tên gợi nhớ');
    if (chatUser?.userId) {
      await AsyncStorage.setItem(`nickname_${chatUser.userId}`, newNickname);
    }
    navigation.setParams({
      chatUser: { ...chatUser, nickname: newNickname },
    });
  };

  // Khi xoá nickname
  const handleClearNickname = async () => {
    setInputValue(chatUser?.fullName || '');
    setNickname('');
    if (chatUser?.userId) {
      await AsyncStorage.removeItem(`nickname_${chatUser.userId}`);
    }
    navigation.setParams({
      chatUser: { ...chatUser, nickname: '' },
    });
  };

  // Khi mở modal, set inputValue
  const openNicknameModal = () => {
    setInputValue(nickname || chatUser?.fullName || '');
    setShowNicknameModal(true);
  };

  // Tên hiển thị ưu tiên nickname, nếu không có thì tên gốc
  const displayName = nickname || chatUser?.fullName || 'Người dùng';

  // --- GROUP INFO UI ---
  const renderGroupInfo = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Avatar + Name */}
      <View style={styles.profileSection}>
        <Image source={chatUser?.avatar ? { uri: chatUser.avatar } : defaultAvatar} style={styles.avatar} />
        <Text style={styles.name}>{chatUser?.fullName || 'Nhóm chat'}</Text>
        {isAdmin && (
          <Text style={styles.adminBadge}>Nhóm trưởng</Text>
        )}
      </View>
      {/* 4 icon row */}
      <View style={styles.iconRow}>
        <TouchableOpacity style={styles.iconItem} onPress={() => navigation.navigate('ChatDetail', { id: conversationId, searchMode: true })}>
          <Image source={searchIcon} style={styles.iconCircle} />
          <Text style={styles.iconLabel}>{'Tìm\ntin nhắn'.replace('\\n', '\n')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.iconItem} 
          onPress={() => navigation.navigate('AddGroupMembersScreen', { 
            conversationId,
            participants: chatUser?.participants || groupParticipants || []
          })}
        >
          <Image source={groupAddIcon} style={styles.iconCircle} />
          <Text style={styles.iconLabel}>{'Thêm\nthành viên'.replace('\\n', '\n')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconItem}>
          <Image source={brushIcon} style={styles.iconCircle} />
          <Text style={styles.iconLabel}>{'Đổi\nhình nền'.replace('\\n', '\n')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconItem}>
          <Image source={bellIcon} style={[styles.iconCircle, { backgroundColor: '#3497fd' }]} />
          <Text style={[styles.iconLabel, { color: '#3497fd' }]}>{'Bật\nthông báo'.replace('\\n', '\n')}</Text>
        </TouchableOpacity>
      </View>
      {/* Thêm mô tả nhóm */}
      {isAdmin && (
        <TouchableOpacity style={styles.menuItem}>
          <Image source={penIcon} style={styles.menuIcon} />
          <Text style={styles.menuText}>Thêm mô tả nhóm</Text>
          <View style={{ flex: 1 }} />
          <Image source={arrowRightIcon} style={styles.arrowIcon} />
        </TouchableOpacity>
      )}
      {/* Ảnh, file, link */}
      <View style={styles.sectionHeader}>
        <Image source={fileImageIcon} style={styles.sectionIcon} />
        <Text style={styles.sectionTitle}>Ảnh, file, link</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
        {imageMessages.slice(-4).map((msg, idx) => (
          <TouchableOpacity key={msg.messageId || idx} onPress={() => navigation.navigate('MediaGalleryScreen', { conversationId, tab: 'image' })}>
            <Image source={{ uri: msg.content }} style={styles.mediaThumb} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.mediaMore} onPress={() => navigation.navigate('MediaGalleryScreen', { conversationId, tab: 'image' })}>
          <Image source={arrowRightIcon} style={{ width: 24, height: 24, tintColor: '#888' }} />
        </TouchableOpacity>
      </ScrollView>
      {/* Lịch nhóm */}
      <TouchableOpacity style={styles.menuItem}>
        <Image source={clockIcon} style={styles.menuIcon} />
        <Text style={styles.menuText}>Lịch nhóm</Text>
        <View style={{ flex: 1 }} />
        <Image source={arrowRightIcon} style={styles.arrowIcon} />
      </TouchableOpacity>
      {/* Tin nhắn đã ghim */}
      <TouchableOpacity style={styles.menuItem}>
        <Image source={starIcon} style={styles.menuIcon} />
        <Text style={styles.menuText}>Tin nhắn đã ghim</Text>
        <View style={{ flex: 1 }} />
        <Image source={arrowRightIcon} style={styles.arrowIcon} />
      </TouchableOpacity>
      {/* Bình chọn */}
      <TouchableOpacity style={styles.menuItem}>
        <Image source={clockIcon} style={styles.menuIcon} />
        <Text style={styles.menuText}>Bình chọn</Text>
        <View style={{ flex: 1 }} />
        <Image source={arrowRightIcon} style={styles.arrowIcon} />
      </TouchableOpacity>
      {/* Cài đặt nhóm */}
      {isAdmin && (
        <TouchableOpacity style={styles.menuItem}>
          <Image source={brushIcon} style={styles.menuIcon} />
          <Text style={styles.menuText}>Cài đặt nhóm</Text>
          <View style={{ flex: 1 }} />
          <Image source={arrowRightIcon} style={styles.arrowIcon} />
        </TouchableOpacity>
      )}
      {/* Xem thành viên */}
      <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('GroupMembersScreen', { conversationId, isAdmin })}>
        <Image source={groupUserIcon} style={styles.menuIcon} />
        <Text style={styles.menuText}>Xem thành viên</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.groupCount}>{groupParticipants.length ? `(${groupParticipants.length})` : ''}</Text>
        <Image source={arrowRightIcon} style={styles.arrowIcon} />
      </TouchableOpacity>
      {/* Phê duyệt thành viên mới */}
      {isAdmin && (
        <TouchableOpacity style={styles.menuItem}>
          <Image source={groupAddIcon} style={styles.menuIcon} />
          <Text style={styles.menuText}>Phê duyệt thành viên mới</Text>
          <View style={{ flex: 1 }} />
          <Image source={arrowRightIcon} style={styles.arrowIcon} />
        </TouchableOpacity>
      )}
      {/* Link nhóm */}
      <TouchableOpacity style={styles.menuItem}>
        <Image source={penIcon} style={styles.menuIcon} />
        <Text style={styles.menuText}>Link nhóm</Text>
        <View style={{ flex: 1 }} />
        <Text style={{ color: '#888', fontSize: 13 }}>https://zalo.me/g/bzqcuu244</Text>
      </TouchableOpacity>
      {/* Ghim trò chuyện */}
      <View style={styles.menuItem}>
        <Image source={starIcon} style={styles.menuIcon} />
        <Text style={styles.menuText}>Ghim trò chuyện</Text>
        <View style={{ flex: 1 }} />
        <Switch value={false} />
      </View>
      {/* Mục hiển thị */}
      <TouchableOpacity style={styles.menuItem}>
        <Image source={fileImageIcon} style={styles.menuIcon} />
        <Text style={styles.menuText}>Mục hiển thị</Text>
        <View style={{ flex: 1 }} />
        <Text style={{ color: '#888', fontSize: 13 }}>Ưu tiên</Text>
      </TouchableOpacity>
      {/* Thẻ phân loại */}
      <TouchableOpacity style={styles.menuItem}>
        <Image source={penIcon} style={styles.menuIcon} />
        <Text style={styles.menuText}>Thẻ phân loại</Text>
        <View style={{ flex: 1 }} />
        <Text style={{ color: '#888', fontSize: 13 }}>Chưa gắn thẻ</Text>
      </TouchableOpacity>
      {/* Ẩn trò chuyện */}
      <View style={styles.menuItem}>
        <Image source={brushIcon} style={styles.menuIcon} />
        <Text style={styles.menuText}>Ẩn trò chuyện</Text>
        <View style={{ flex: 1 }} />
        <Switch value={false} />
      </View>
      {/* Cài đặt cá nhân */}
      <TouchableOpacity style={styles.menuItem}>
        <Image source={userIcon} style={styles.menuIcon} />
        <Text style={styles.menuText}>Cài đặt cá nhân</Text>
        <View style={{ flex: 1 }} />
        <Image source={arrowRightIcon} style={styles.arrowIcon} />
      </TouchableOpacity>
      {/* Tin nhắn tự xoá */}
      <TouchableOpacity style={styles.menuItem}>
        <Image source={clockIcon} style={styles.menuIcon} />
        <Text style={styles.menuText}>Tin nhắn tự xoá</Text>
        <View style={{ flex: 1 }} />
        <Text style={{ color: '#888', fontSize: 13 }}>Không tự xoá</Text>
      </TouchableOpacity>
      {/* Báo xấu */}
      <TouchableOpacity style={styles.menuItem}>
        <Text style={{ color: '#e53935', fontWeight: '500', marginRight: 16 }}>⚠️</Text>
        <Text style={[styles.menuText, { color: '#e53935' }]}>Báo xấu</Text>
      </TouchableOpacity>
      {/* Chuyển quyền trưởng nhóm */}
      {isAdmin && (
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('TransferAdmin', { conversationId })}>
          <Image source={userIcon} style={styles.menuIcon} />
          <Text style={styles.menuText}>Chuyển quyền trưởng nhóm</Text>
          <View style={{ flex: 1 }} />
          <Image source={arrowRightIcon} style={styles.arrowIcon} />
        </TouchableOpacity>
      )}
      {/* Dung lượng trò chuyện */}
      <TouchableOpacity style={styles.menuItem}>
        <Image source={fileImageIcon} style={styles.menuIcon} />
        <Text style={styles.menuText}>Dung lượng trò chuyện</Text>
        <View style={{ flex: 1 }} />
        <Image source={arrowRightIcon} style={styles.arrowIcon} />
      </TouchableOpacity>
      {/* Xoá lịch sử trò chuyện */}
      <TouchableOpacity style={styles.menuItem}>
        <Text style={{ color: '#888', fontWeight: '500', marginRight: 16 }}>🗑️</Text>
        <Text style={styles.menuText}>Xoá lịch sử trò chuyện</Text>
      </TouchableOpacity>
      {/* Rời nhóm */}
      <TouchableOpacity style={[styles.menuItem, { marginTop: 8 }]} onPress={() => {
        console.log('DEBUG isAdmin:', isAdmin);
        console.log('DEBUG groupParticipants:', groupParticipants.map(m => m.userId));
        console.log('DEBUG currentUser:', currentUser.userId);
        
        if (isAdmin && groupParticipants.filter(m => m.userId !== currentUser.userId).length > 0) {
          setShowLeaveModal(true);
        } else {
          Alert.alert(
            'Rời nhóm',
            `Bạn có chắc chắn muốn rời khỏi nhóm${chatUser?.fullName ? ' ' + chatUser.fullName : ''}?`,
            [
              { text: 'Hủy', style: 'cancel' },
              {
                text: 'Rời nhóm',
                style: 'destructive',
                onPress: handleLeaveGroup
              }
            ]
          );
        }
      }}>
        <Text style={{ color: '#e53935', fontWeight: '500', marginRight: 16 }}>⎋</Text>
        <Text style={[styles.menuText, { color: '#e53935' }]}>Rời nhóm</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // --- SINGLE CHAT INFO UI (giữ nguyên) ---
  const renderSingleInfo = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Avatar + Name */}
      <View style={styles.profileSection}>
        <Image
          source={chatUser?.avatar ? { uri: chatUser.avatar } : defaultAvatar}
          style={styles.avatar}
        />
        <Text style={styles.name}>{displayName}</Text>
      </View>
      {/* 4 Icon Row */}
      <View style={styles.iconRow}>
        <TouchableOpacity
          style={styles.iconItem}
          onPress={() => navigation.navigate('ChatDetail', {
            id: chatUser?.userId || conversationId,
            searchMode: true
          })}
        >
          <Image source={searchIcon} style={styles.iconCircle} />
          <Text style={styles.iconLabel}>{'Tìm\ntin nhắn'.replace('\\n', '\n')}</Text>
        </TouchableOpacity>
        <View style={styles.iconItem}>
          <Image source={userIcon} style={styles.iconCircle} />
          <Text style={styles.iconLabel}>{'Trang\ncá nhân'.replace('\\n', '\n')}</Text>
        </View>
        <TouchableOpacity
          style={styles.iconItem}
          onPress={() => navigation.navigate('ChatDetail', {
            id: chatUser?.userId || conversationId,
            changeBackground: true
          })}
        >
          <Image source={brushIcon} style={styles.iconCircle} />
          <Text style={styles.iconLabel}>{'Đổi\nhình nền'.replace('\\n', '\n')}</Text>
        </TouchableOpacity>
        <View style={styles.iconItem}>
          <Image source={bellIcon} style={styles.iconCircle} />
          <Text style={styles.iconLabel}>{'Tắt\nthông báo'.replace('\\n', '\n')}</Text>
        </View>
      </View>
      {/* Đổi tên gọi nhớ */}
      <TouchableOpacity style={styles.menuItem} onPress={openNicknameModal}>
        <Image source={penIcon} style={styles.menuIcon} />
        <Text style={styles.menuText}>Đổi tên gọi nhớ</Text>
      </TouchableOpacity>
      {/* Đánh dấu bạn thân */}
      <View style={styles.menuItem}>
        <Image source={starIcon} style={styles.menuIcon} />
        <Text style={styles.menuText}>Đánh dấu bạn thân</Text>
        <View style={{ flex: 1 }} />
        <Switch value={false} />
      </View>
      {/* Nhật ký chung */}
      <TouchableOpacity style={styles.menuItem}>
        <Image source={clockIcon} style={styles.menuIcon} />
        <Text style={styles.menuText}>Nhật ký chung</Text>
        <View style={{ flex: 1 }} />
        <Image source={arrowRightIcon} style={styles.arrowIcon} />
      </TouchableOpacity>
      {/* Ảnh, file, link */}
      <View style={styles.sectionHeader}>
        <Image source={fileImageIcon} style={styles.sectionIcon} />
        <Text style={styles.sectionTitle}>Ảnh, file, link</Text>
        <TouchableOpacity onPress={onRefresh} style={{ marginLeft: 8, padding: 4 }} disabled={refreshing}>
          {refreshing ? (
            <View style={{ width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: '#3497fd' }}>⏳</Text>
            </View>
          ) : (
            <Image source={reloadIcon} style={{ width: 20, height: 20, tintColor: '#3497fd' }} />
          )}
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
        {imageMessages.slice(-4).map((msg, idx) => (
          <TouchableOpacity key={msg.messageId || idx} onPress={() => navigation.navigate('MediaGalleryScreen', { conversationId, tab: 'image' })}>
            <Image source={{ uri: msg.content }} style={styles.mediaThumb} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.mediaMore} onPress={() => navigation.navigate('MediaGalleryScreen', { conversationId, tab: 'image' })}>
          <Image source={arrowRightIcon} style={{ width: 24, height: 24, tintColor: '#888' }} />
        </TouchableOpacity>
      </ScrollView>
      {/* Tạo nhóm với ... */}
      <TouchableOpacity style={styles.menuItem}>
        <Image source={addGroupIcon} style={styles.menuIcon} />
        <Text style={styles.menuText}>Tạo nhóm với {chatUser?.fullName || ''}</Text>
        <View style={{ flex: 1 }} />
        <Image source={arrowRightIcon} style={styles.arrowIcon} />
      </TouchableOpacity>
      {/* Thêm vào nhóm */}
      <TouchableOpacity style={styles.menuItem}>
        <Image source={groupAddIcon} style={styles.menuIcon} />
        <Text style={styles.menuText}>Thêm {chatUser?.fullName || ''} vào nhóm</Text>
        <View style={{ flex: 1 }} />
        <Image source={arrowRightIcon} style={styles.arrowIcon} />
      </TouchableOpacity>
      {/* Xem nhóm chung */}
      <TouchableOpacity style={styles.menuItem}>
        <Image source={groupUserIcon} style={styles.menuIcon} />
        <Text style={styles.menuText}>Xem nhóm chung</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.groupCount}>(1)</Text>
        <Image source={arrowRightIcon} style={styles.arrowIcon} />
      </TouchableOpacity>
    </ScrollView>
  );

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [searchNewAdmin, setSearchNewAdmin] = useState('');

  const handleLeaveGroup = async () => {
    setLeaving(true);
    try {
      console.log('DEBUG: Bắt đầu rời nhóm');
      const response = await leaveGroupApi(conversationId);
      console.log('DEBUG: API response:', response);
      
      // Emit socket event
      if (socket?.connected) {
        socket.emit('member-left', {
          conversationId,
          userId: currentUser.userId,
          conversation: {
            admin: chatUser?.admin,
            participants: groupParticipants.filter(p => p.userId !== currentUser.userId)
          }
        });
      }

      // Thông báo thành công
      Platform.OS === 'android' 
        ? ToastAndroid.show('Rời nhóm thành công', ToastAndroid.SHORT)
        : Alert.alert('Thông báo', 'Rời nhóm thành công');

      // Điều hướng về HomeScreen và xóa toàn bộ navigation stack
      setTimeout(() => {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'HomeScreen' }],
          })
        );
      }, 100);

    } catch (error) {
      console.error('DEBUG: Lỗi rời nhóm:', error);
      
      if (error.response?.data?.message === 'Không tìm thấy người dùng hoặc nhóm chat' || 
          error.response?.status === 404) {
        
        if (socket?.connected) {
          socket.emit('member-left', {
            conversationId,
            userId: currentUser.userId
          });
        }

        // Điều hướng về HomeScreen và xóa toàn bộ navigation stack
        setTimeout(() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'HomeScreen' }],
            })
          );
        }, 100);
      } else {
        Alert.alert('Thông báo', 'Không thể rời nhóm, vui lòng thử lại sau');
      }
    } finally {
      setLeaving(false);
      setShowLeaveModal(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image source={arrowLeftIcon} style={{ width: 24, height: 24 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tuỳ chọn</Text>
        <View style={{ width: 32 }} />
      </View>
      {chatUser?.isGroup ? renderGroupInfo() : renderSingleInfo()}
      {/* Modal đổi tên gợi nhớ (chỉ cho chat 1-1) */}
      {!chatUser?.isGroup && (
        <Modal
          visible={showNicknameModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowNicknameModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingHorizontal: 16 }}>
                <Text style={{ flex: 1, textAlign: 'center', fontWeight: '600', fontSize: 17 }}>Đổi tên gợi nhớ</Text>
                <TouchableOpacity onPress={() => setShowNicknameModal(false)}>
                  <Text style={{ fontSize: 22, color: '#888', fontWeight: '400' }}>×</Text>
                </TouchableOpacity>
              </View>
              <View style={{ marginTop: 18, marginHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                <TextInput
                  value={inputValue}
                  onChangeText={text => {
                    if (text.length <= 40) setInputValue(text);
                  }}
                  placeholder={chatUser?.fullName || ''}
                  style={{ fontSize: 18, color: '#222', paddingVertical: 8 }}
                  maxLength={40}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={handleClearNickname}
                  style={{ position: 'absolute', right: 0, top: 10, padding: 4 }}
                >
                  <Text style={{ fontSize: 18, color: '#888' }}>×</Text>
                </TouchableOpacity>
                <Text style={{ position: 'absolute', right: 0, bottom: 2, color: '#888', fontSize: 15 }}>{inputValue.length}/40</Text>
              </View>
              <TouchableOpacity
                style={{ marginTop: 32, marginHorizontal: 18, backgroundColor: '#3497fd', borderRadius: 24, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' }}
                onPress={handleSaveNickname}
              >
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '500' }}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      {/* Modal chọn trưởng nhóm mới khi rời nhóm */}
      <Modal
        visible={showLeaveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLeaveModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.18)' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 24, paddingTop: 0 }}>
            {/* Drag bar */}
            <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 8 }}>
              <View style={{ width: 48, height: 5, borderRadius: 3, backgroundColor: '#e0e0e0' }} />
            </View>
            {/* Tiêu đề */}
            <Text style={{ textAlign: 'center', fontWeight: '700', fontSize: 17, marginBottom: 10 }}>Chọn trưởng nhóm mới trước khi rời</Text>
            {/* Ô tìm kiếm có icon kính lúp */}
            <View style={{ marginHorizontal: 18, marginBottom: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f6fa', borderRadius: 8, borderWidth: 1, borderColor: '#eee', paddingHorizontal: 10 }}>
              <Image source={searchIcon} style={{ width: 18, height: 18, tintColor: '#b0b3b8', marginRight: 6 }} />
              <TextInput
                value={searchNewAdmin}
                onChangeText={setSearchNewAdmin}
                placeholder="Tìm kiếm"
                style={{ fontSize: 16, flex: 1, paddingVertical: 7, backgroundColor: 'transparent' }}
              />
            </View>
            {/* Danh sách thành viên */}
            <ScrollView style={{ maxHeight: 220, marginHorizontal: 18 }}>
              {groupParticipants.filter(m => m.userId !== currentUser.userId && (m.fullName || '').toLowerCase().includes(searchNewAdmin.toLowerCase())).map(member => (
                <TouchableOpacity
                  key={member.userId}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', borderRadius: 10, backgroundColor: '#fff', marginBottom: 2 }}
                  onPress={() => setSelectedNewAdmin(member.userId)}
                  disabled={leaving}
                  activeOpacity={0.7}
                >
                  <Image source={member.avatar ? { uri: member.avatar } : defaultAvatar} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12, borderWidth: 1, borderColor: '#eee' }} />
                  <Text style={{ flex: 1, fontSize: 16 }}>{member.fullName}</Text>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#3497fd', alignItems: 'center', justifyContent: 'center', backgroundColor: selectedNewAdmin === member.userId ? '#3497fd' : '#fff' }}>
                    {selectedNewAdmin === member.userId && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' }} />}
                  </View>
                </TouchableOpacity>
              ))}
              {groupParticipants.filter(m => m.userId !== currentUser.userId && (m.fullName || '').toLowerCase().includes(searchNewAdmin.toLowerCase())).length === 0 && (
                <Text style={{ color: '#888', textAlign: 'center', marginTop: 10 }}>Không tìm thấy thành viên phù hợp</Text>
              )}
            </ScrollView>
            {/* Nút chọn và hủy */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginHorizontal: 18 }}>
              <TouchableOpacity onPress={() => setShowLeaveModal(false)} style={{ flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 24, backgroundColor: '#f5f6fa', marginRight: 10 }} disabled={leaving}>
                <Text style={{ color: '#222', fontSize: 16 }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (!selectedNewAdmin) return;
                  setLeaving(true);
                  try {
                    console.log('DEBUG: Bắt đầu chuyển quyền trưởng nhóm');
                    // Chuyển quyền trưởng nhóm trước
                    const res = await updateConversationApi(conversationId, { admin: selectedNewAdmin });
                    console.log('DEBUG: API chuyển quyền response:', res);
                    
                    if (res.data?.status) {
                      // Sau khi chuyển quyền, rời nhóm
                      await handleLeaveGroup();
                    } else {
                      Alert.alert('Lỗi', res.data?.message || 'Không thể chuyển quyền trưởng nhóm');
                    }
                  } catch (error) {
                    console.error('DEBUG: Lỗi chuyển quyền:', error);
                    Alert.alert('Lỗi', error?.response?.data?.message || error?.message || 'Có lỗi khi chuyển quyền/rời nhóm');
                  } finally {
                    setLeaving(false);
                  }
                }}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 24, backgroundColor: selectedNewAdmin ? '#3497fd' : '#e0e0e0' }}
                disabled={!selectedNewAdmin || leaving}
              >
                <Text style={{ color: selectedNewAdmin ? '#fff' : '#888', fontSize: 16, fontWeight: '600' }}>Chọn và tiếp tục</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: '#3497fd',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222',
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 18,
    marginHorizontal: 10,
  },
  iconItem: {
    alignItems: 'center',
    width: width / 5.2,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    marginBottom: 6,
    tintColor: '#3497fd',
    resizeMode: 'contain',
  },
  iconLabel: {
    fontSize: 12,
    color: '#222',
    textAlign: 'center',
    lineHeight: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuIcon: {
    width: 20,
    height: 20,
    marginRight: 16,
    tintColor: '#3497fd',
    resizeMode: 'contain',
  },
  menuText: {
    fontSize: 15,
    color: '#222',
  },
  arrowIcon: {
    width: 18,
    height: 18,
    tintColor: '#b0b3b8',
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 6,
    marginLeft: 18,
  },
  sectionIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: '#3497fd',
    resizeMode: 'contain',
  },
  sectionTitle: {
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
  },
  mediaRow: {
    flexDirection: 'row',
    paddingLeft: 18,
    marginBottom: 10,
  },
  mediaThumb: {
    width: 54,
    height: 54,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#eee',
  },
  mediaMore: {
    width: 54,
    height: 54,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupCount: {
    color: '#3497fd',
    fontWeight: '500',
    marginRight: 4,
  },
  adminBadge: {
    backgroundColor: '#3497fd',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
    marginTop: 4,
  },
});

export default ChatInfoScreen; 