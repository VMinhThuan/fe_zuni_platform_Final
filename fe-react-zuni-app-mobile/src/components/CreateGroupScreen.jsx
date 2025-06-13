import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  StyleSheet,
  Platform,
  SafeAreaView,
} from 'react-native';
// Replace vector icons with image icons
const closeIcon = require('../assets/images/close_icon.png');
const cameraIcon = require('../assets/icons/file-image.png');
const checkIcon = require('../assets/images/checkbox_joined.png');
import { getFriendsApi, createConversationApi, uploadFileApi } from '../services/api';
import { useCurrentApp } from '../contexts/app.context';
import { useNavigation, useRoute } from '@react-navigation/native';
import defaultAvatar from '../assets/images/defaultAvatar.jpg';
import { useSocket } from '../contexts/socket.context';

const TABS = [
  { key: 'recent', label: 'GẦN ĐÂY' },
  { key: 'contacts', label: 'DANH BẠ' },
];

const CreateGroupScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { notificationApi } = useCurrentApp();
  const { socket } = useSocket();
  const [groupName, setGroupName] = useState('');
  const [search, setSearch] = useState('');
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('recent');
  const [groupAvatar, setGroupAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    fetchFriends();
  }, []);

  // Lắng nghe khi chọn ảnh từ ImagePickerScreen
  useEffect(() => {
    if (route.params?.selectedMedia) {
      setGroupAvatar(route.params.selectedMedia);
      setAvatarPreview(route.params.selectedMedia.uri);
      // Xoá param để tránh lặp lại
      navigation.setParams({ selectedMedia: undefined });
    }
  }, [route.params?.selectedMedia]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const res = await getFriendsApi();
      if (res.data?.status) {
        setFriends(res.data?.data || []);
      } else {
        setFriends([]);
        notificationApi.error({ message: res.data?.message || 'Không thể lấy danh sách bạn bè' });
      }
    } catch (error) {
      setFriends([]);
      notificationApi.error({ message: 'Không thể lấy danh sách bạn bè' });
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter(f => {
    if (!search.trim()) return true;
    return (f.fullName || '').toLowerCase().includes(search.toLowerCase()) || (f.phoneNumber || '').includes(search);
  });

  const handleSelect = (userId) => {
    setSelected(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      notificationApi.error({ message: 'Vui lòng nhập tên nhóm' });
      return;
    }
    if (selected.length < 2) {
      notificationApi.error({ message: 'Vui lòng chọn ít nhất 2 thành viên' });
      return;
    }
    let avatarUrl = null;
    if (groupAvatar) {
      const formData = new FormData();
      const imageUri = Platform.OS === 'android' ? groupAvatar.uri : groupAvatar.uri.replace('file://', '');
      formData.append('avatar', {
        uri: imageUri,
        type: groupAvatar.type || 'image/jpeg',
        name: groupAvatar.fileName || `avatar_${Date.now()}.jpg`,
      });
      const uploadResponse = await uploadFileApi(formData);
      if (!uploadResponse.data?.status) {
        notificationApi.error({ message: uploadResponse.data?.message || 'Không thể tải lên ảnh đại diện' });
        return;
      }
      avatarUrl = uploadResponse.data?.data?.url || uploadResponse.data?.data?.avatar || uploadResponse.data?.url;
    }
    // Lấy danh sách user đã chọn (có userId, fullName, avatar)
    const participantsWithInfo = friends.filter(f => selected.includes(f.userId)).map(f => ({ userId: f.userId, fullName: f.fullName, avatar: f.avatar }));
    const createGroupData = {
      participants: selected,
      type: 'group',
      name: groupName,
      avatar: avatarUrl,
      settings: { notifications: true },
    };
    const response = await createConversationApi(createGroupData);
    if (!response.data?.status) {
      notificationApi.error({ message: response.data?.message || 'Không thể tạo nhóm chat' });
      return;
    }
    notificationApi.success({ message: 'Tạo nhóm chat thành công' });
    // Emit socket event group-created giống web
    if (socket && response.data?.data?.conversationId) {
      const conversation = {
        conversationId: response.data.data.conversationId,
        name: response.data.data.name,
        avatar: response.data.data.avatar,
        createdAt: response.data.data.createdAt || new Date().toISOString(),
      };
      socket.emit('group-created', {
        conversation,
        participants: [...selected, response.data.data.creator || response.data.data.admin].filter(Boolean),
      });
    }
    // Điều hướng sang ChatDetail và truyền participantsWithInfo
    navigation.navigate('ChatDetail', {
      id: response.data.data.conversationId,
      justCreatedGroup: true,
      creatorId: response.data.data.creator || response.data.data.admin,
      participantsWithInfo,
    });
  };

  const handleAvatarChange = async () => {
    navigation.navigate('ImagePickerScreen', {
      mediaType: 'photo',
      maxFileSize: 5 * 1024 * 1024,
      onSelectMedia: (media) => {
        setGroupAvatar(media);
        setAvatarPreview(media.uri);
      },
    });
  };

  const renderFriendItem = ({ item }) => (
    <TouchableOpacity style={styles.friendRow} onPress={() => handleSelect(item.userId)}>
      <View style={[styles.checkbox, selected.includes(item.userId) && styles.checkboxChecked]}>
        {selected.includes(item.userId) && (
          <Image source={checkIcon} style={styles.checkIcon} />
        )}
      </View>
      <Image source={item.avatar ? { uri: item.avatar } : defaultAvatar} style={styles.avatar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.friendName}>{item.fullName}</Text>
        {item.username && <Text style={styles.friendUsername}>@{item.username}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Image source={closeIcon} style={styles.headerIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhóm mới</Text>
        <View style={{ width: 28 }} />
      </View>
      {/* Đã chọn */}
      <View style={styles.selectedRow}>
        <Text style={styles.selectedText}>Đã chọn: {selected.length}</Text>
      </View>
      {/* Nhập tên nhóm + avatar */}
      <View style={styles.groupNameRow}>
        <TouchableOpacity style={styles.avatarGroup} onPress={handleAvatarChange}>
          {avatarPreview ? (
            <Image source={{ uri: avatarPreview }} style={styles.avatarImage} />
          ) : (
            <Image source={cameraIcon} style={styles.cameraIcon} />
          )}
        </TouchableOpacity>
        <TextInput
          style={styles.groupNameInput}
          placeholder="Đặt tên nhóm"
          placeholderTextColor="#bbb"
          value={groupName}
          onChangeText={setGroupName}
        />
      </View>
      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm tên hoặc số điện thoại"
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Danh sách bạn bè */}
      <FlatList
        data={filteredFriends}
        keyExtractor={item => item.userId}
        renderItem={renderFriendItem}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 70 }}
      />
      {/* Nút tạo nhóm */}
      <TouchableOpacity style={[styles.addBtn, (!groupName.trim() || selected.length < 2) && { opacity: 0.5 }]} disabled={!groupName.trim() || selected.length < 2} onPress={handleCreateGroup}>
        <Text style={styles.addBtnText}>Tạo nhóm</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 44 : 18,
    paddingBottom: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  headerBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerIcon: {
    width: 28,
    height: 28,
    tintColor: '#222',
  },
  cameraIcon: {
    width: 28,
    height: 28,
    tintColor: '#bbb',
  },
  checkIcon: {
    width: 18,
    height: 18,
    tintColor: '#3497fd',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    color: '#222',
    textAlign: 'center',
  },
  selectedRow: {
    paddingLeft: 20,
    paddingTop: 2,
    paddingBottom: 2,
    backgroundColor: '#fff',
  },
  selectedText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '400',
  },
  groupNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#fff',
  },
  avatarGroup: {
    width: 56,
    height: 56,
    backgroundColor: '#f3f4f6',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  groupNameInput: {
    flex: 1,
    fontSize: 17,
    color: '#222',
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: 8,
    fontWeight: '500',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fafbfc',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    color: '#222',
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3497fd',
  },
  tabText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3497fd',
    fontWeight: 'bold',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#bbb',
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    borderColor: '#3497fd',
    backgroundColor: '#eaf3ff',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 14,
    backgroundColor: '#eee',
  },
  friendName: {
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
  },
  friendUsername: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: '#3497fd',
    margin: 18,
    borderRadius: 24,
    alignItems: 'center',
    paddingVertical: 15,
    shadowColor: '#3497fd',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default CreateGroupScreen;