import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  TextInput,
  SafeAreaView,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import CheckBox from '@react-native-community/checkbox';

import { useNavigation, useRoute } from '@react-navigation/native';
import { getConversationApi, getUserByIdApi, removeParticipantsApi } from '../../services/api';
import defaultAvatar from '../../assets/images/defaultAvatar.jpg';
import Icon from 'react-native-vector-icons/AntDesign';
import { useCurrentApp } from '../../contexts/app.context';
import { useSocket } from '../../contexts/socket.context';

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'admin', label: 'Trưởng nhóm' },
  { key: 'invited', label: 'Đã mời' },
  { key: 'blocked', label: 'Đã chặn' },
];

const GroupMembersScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { conversationId, chatUser: initialChatUser } = route.params || {};
  const { user: currentUser } = useCurrentApp();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userCache, setUserCache] = useState({});
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [chatUser, setChatUser] = useState(initialChatUser);
  const { socket } = useSocket();
  const fetchGroupRef = useRef();

  useEffect(() => {
    fetchGroup();
  }, [conversationId]);

  useEffect(() => {
    if (!socket || !conversationId) return;
    const handleMemberAdded = (data) => {
      console.log('[APP] Nhận event member-added:', data);
      if (data.conversationId === conversationId) {
        setGroup(prev => ({
          ...prev,
          participants: data.participants
        }));
        
        if (chatUser) {
          const updatedChatUser = {
            ...chatUser,
            participants: data.participants,
            totalMembers: data.participants.length
          };
          setChatUser(updatedChatUser);
          navigation.setParams({ chatUser: updatedChatUser });
        }
      }
    };

    const handleMemberRemoved = (data) => {
      console.log('[APP] Nhận event member-removed:', data);
      if (data.conversationId === conversationId) {
        setGroup(prev => ({
          ...prev,
          participants: data.participants
        }));
        
        if (chatUser) {
          const updatedChatUser = {
            ...chatUser,
            participants: data.participants,
            totalMembers: data.participants.length
          };
          setChatUser(updatedChatUser);
          navigation.setParams({ chatUser: updatedChatUser });
        }
      }
    };

    const handleMemberLeft = (data) => {
      console.log('[APP] Nhận event member-left:', data);
      if (data.conversationId === conversationId && data.conversation?.participants) {
        setGroup(prev => ({
          ...prev,
          participants: data.conversation.participants,
          admin: data.conversation.admin
        }));
        
        if (chatUser) {
          const updatedChatUser = {
            ...chatUser,
            participants: data.conversation.participants,
            totalMembers: data.conversation.participants.length,
            admin: data.conversation.admin
          };
          setChatUser(updatedChatUser);
          navigation.setParams({ chatUser: updatedChatUser });
        }
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

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      console.log('[APP] Socket connected:', socket.id);
    };
    socket.on('connect', onConnect);
    return () => {
      socket.off('connect', onConnect);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !conversationId || !currentUser?.userId) return;
    console.log('[APP] Join room:', conversationId, currentUser.userId);
    socket.emit('join-conversation', {
      conversationId,
      userId: currentUser.userId,
    });
  }, [socket, conversationId, currentUser?.userId]);

  // Thêm useEffect mới để lắng nghe thay đổi từ route.params
  useEffect(() => {
    if (route.params?.chatUser) {
      setChatUser(route.params.chatUser);
      setGroupParticipants(route.params.chatUser.participants || []);
    }
  }, [route.params?.chatUser]);

  // Helper: fetch user info and cache
  const fetchUserInfo = async (userId) => {
    if (!userId) return null;
    if (userCache[userId]) return userCache[userId];
    try {
      const res = await getUserByIdApi(userId);
      if (res.data?.status) {
        setUserCache(prev => ({ ...prev, [userId]: res.data.data }));
        return res.data.data;
      }
    } catch { }
    return null;
  };

  const fetchGroup = useCallback(async () => {
    if (!conversationId) {
      console.error('[ERROR] Missing conversationId');
      return;
    }
    
    setLoading(true);
    try {
      const res = await getConversationApi(conversationId);
      if (res.data?.status) {
        const conv = res.data.data;
        let participants = conv.participants || [];
        if (participants.length && participants[0] && typeof participants[0] === 'object' && participants[0].S) {
          participants = participants.map(p => p.S);
        }

        // Lấy thông tin người dùng cho mỗi participant
        if (participants.length && typeof participants[0] === 'string') {
          participants = await Promise.all(participants.map(async (uid) => {
            const info = await fetchUserInfo(uid);
            return info ? { ...info, userId: uid } : { userId: uid };
          }));
        }
        participants = await Promise.all(participants.map(async (p) => {
          if (p.fullName && p.avatar) return p;
          const info = await fetchUserInfo(p.userId || p.id || p);
          return info ? { ...p, ...info } : p;
        }));
        const adminId = conv.admin || conv.creator;
        const creatorId = conv.creator || conv.admin;
        const adminUser = participants.find(p => p.userId === adminId) || {};
        const membersWithAddedBy = participants.map((p, idx) => {
          if (p.userId === adminId) {
            return {
              ...p,
              role: 'admin',
              addedBy: null,
            };
          }
          if (p.addedBy) {
            return {
              ...p,
              addedBy: p.addedBy,
            };
          }
          if (participants.length === 2) {
            return {
              ...p,
              addedBy: creatorId,
            };
          }
          return {
            ...p,
            addedBy: adminUser.userId,
          };
        });
        setGroup({ ...conv, participants: membersWithAddedBy });
        
        // Cập nhật chatUser state và navigation params
        if (initialChatUser) {
          const updatedChatUser = {
            ...initialChatUser,
            participants: membersWithAddedBy,
            totalMembers: membersWithAddedBy.length,
            admin: adminId
          };
          setChatUser(updatedChatUser);
          navigation.setParams({ chatUser: updatedChatUser });
        }
      }
    } catch (error) {
      console.error('[ERROR] Failed to fetch group:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, initialChatUser]);

  fetchGroupRef.current = fetchGroup;

  // Phân loại thành viên
  const members = useMemo(() => group?.participants || [], [group]);
  const admins = useMemo(() => members.filter(m => m.role === 'admin' || m.userId === (group?.admin || group?.creator)), [members, group]);
  const vices = useMemo(() => members.filter(m => m.role === 'vice'), [members]);
  const invited = useMemo(() => group?.invited || [], [group]);
  const blocked = useMemo(() => group?.blocked || [], [group]);

  // Lọc theo search
  const filterList = (list) => {
    if (!search.trim()) return list;
    return list.filter(m => (m.fullName || '').toLowerCase().includes(search.toLowerCase()));
  };

  // Thêm icon key cho trưởng nhóm
  const keyIcon = require('../../assets/icons/key.png'); // Đảm bảo có icon này trong assets/icons

  const handleMemberPress = (member) => {
    setSelectedMember(member);
    setShowMemberModal(true);
  };

  // Xác định user hiện tại có phải trưởng nhóm không
  const isAdmin = useMemo(() => {
    if (!group || !currentUser) return false;
    const adminId = group.admin || group.creator;
    return currentUser.userId === adminId;
  }, [group, currentUser]);

  // Tab content renderers
  const renderAllTab = () => {
    // Sắp xếp trưởng nhóm lên đầu
    const sortedMembers = [
      ...filterList(members).filter(m => admins.some(a => a.userId === m.userId)),
      ...filterList(members).filter(m => !admins.some(a => a.userId === m.userId)),
    ];
    return (
      <ScrollView style={{ flex: 1 }}>
        {/* Duyệt thành viên */}
        <TouchableOpacity style={styles.specialRow}>
          <Icon name="adduser" size={24} color="#3497fd" style={{ marginRight: 12 }} />
          <Text style={styles.specialText}>Duyệt thành viên</Text>
        </TouchableOpacity>
        {/* Danh sách thành viên */}
        <Text style={styles.sectionTitle}>Thành viên ({members.length})</Text>
        {sortedMembers.map((m, idx) => (
          <TouchableOpacity key={m.userId || idx} style={styles.memberRow} onPress={() => handleMemberPress(m)}>
            <View style={{ position: 'relative' }}>
              <Image source={m.avatar ? { uri: m.avatar } : defaultAvatar} style={styles.avatar} />
              {admins.some(a => a.userId === m.userId) && (
                <Image source={keyIcon} style={styles.keyIcon} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{m.fullName}{m.userId === currentUser.userId ? ' (Bạn)' : ''}</Text>
              {admins.some(a => a.userId === m.userId) && <Text style={styles.memberRole}>Trưởng nhóm</Text>}
              {m.addedBy && !admins.some(a => a.userId === m.userId) && (
                <Text style={styles.memberSub}>Thêm bởi {getUserNameById(m.addedBy) || m.addedBy}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
        {renderMemberModal()}
        {renderBlockModal()}
        {renderRemoveModal()}
      </ScrollView>
    );
  };

  const renderAdminTab = () => (
    <ScrollView style={{ flex: 1 }}>
      <Text style={styles.sectionTitle}>Những người có thể thay đổi các cài đặt nhóm</Text>
      <TouchableOpacity style={styles.specialRow}>
        <Icon name="addusergroup" size={24} color="#3497fd" style={{ marginRight: 12 }} />
        <Text style={styles.specialText}>Thêm phó nhóm</Text>
      </TouchableOpacity>
      {admins.map((m, idx) => (
        <View key={m.userId || idx} style={styles.memberRow}>
          <View style={{ position: 'relative' }}>
            <Image source={m.avatar ? { uri: m.avatar } : defaultAvatar} style={styles.avatar} />
            <Image source={keyIcon} style={styles.keyIcon} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{m.fullName}{m.userId === currentUser.userId ? ' (Bạn)' : ''}</Text>
            <Text style={styles.memberRole}>Trưởng nhóm</Text>
          </View>
        </View>
      ))}
      {vices.map((m, idx) => (
        <View key={m.userId || idx} style={styles.memberRow}>
          <Image source={m.avatar ? { uri: m.avatar } : defaultAvatar} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{m.fullName}</Text>
            <Text style={styles.memberRole}>Phó nhóm</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderInvitedTab = () => (
    <ScrollView style={{ flex: 1 }}>
      <Text style={styles.sectionTitle}>Những người đã nhận được lời mời vào nhóm nhưng chưa xác nhận lời mời</Text>
      {invited.length === 0 ? (
        <View style={styles.emptyBox}>
          <Icon name="filetext1" size={60} color="#d0d6e0" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyText}>Chưa có ai được mời vào nhóm</Text>
        </View>
      ) : (
        filterList(invited).map((m, idx) => (
          <View key={m.userId || idx} style={styles.memberRow}>
            <Image source={m.avatar ? { uri: m.avatar } : defaultAvatar} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{m.fullName}</Text>
              <Text style={styles.memberSub}>Đã mời</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderBlockedTab = () => (
    <ScrollView style={{ flex: 1 }}>
      <Text style={styles.sectionTitle}>Những người bị chặn khỏi nhóm. Chỉ trưởng hoặc phó nhóm mới có thể bỏ chặn hoặc thêm lại những người này vào nhóm.</Text>
      <TouchableOpacity style={styles.specialRow}>
        <Icon name="adduser" size={24} color="#3497fd" style={{ marginRight: 12 }} />
        <Text style={styles.specialText}>Thêm vào danh sách chặn</Text>
      </TouchableOpacity>
      {blocked.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Không có ai bị chặn</Text>
        </View>
      ) : (
        filterList(blocked).map((m, idx) => (
          <View key={m.userId || idx} style={styles.memberRow}>
            <Image source={m.avatar ? { uri: m.avatar } : defaultAvatar} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{m.fullName}</Text>
              <Text style={styles.memberSub}>Đã chặn</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  // Tab bar
  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {TABS.map(t => (
        <TouchableOpacity
          key={t.key}
          style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
          onPress={() => setTab(t.key)}
        >
          <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Thêm hàm getUserNameById để lấy tên từ userId
  const getUserNameById = (userId) => {
    const user = members.find(m => m.userId === userId);
    return user ? user.fullName : null;
  };

  // Thêm modal thông tin thành viên
  const renderMemberModal = () => (
    <Modal
      visible={showMemberModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowMemberModal(false)}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Image source={selectedMember?.avatar ? { uri: selectedMember.avatar } : defaultAvatar} style={{ width: 60, height: 60, borderRadius: 30, marginBottom: 8 }} />
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 2 }}>{selectedMember?.fullName}</Text>
          </View>
          <TouchableOpacity style={{ paddingVertical: 12 }} onPress={() => {/* Xem trang cá nhân */ }}>
            <Text style={{ fontSize: 16, color: '#222' }}>Xem trang cá nhân</Text>
          </TouchableOpacity>
          {isAdmin && (
            <>
              <TouchableOpacity style={{ paddingVertical: 12 }} onPress={() => { setShowMemberModal(false); setShowBlockModal(true); }}>
                <Text style={{ fontSize: 16, color: '#222' }}>Chặn thành viên</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ paddingVertical: 12 }} onPress={() => { setShowMemberModal(false); setShowRemoveModal(true); }}>
                <Text style={{ fontSize: 16, color: '#e74c3c' }}>Xoá khỏi nhóm</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={{ alignItems: 'center', marginTop: 10 }} onPress={() => setShowMemberModal(false)}>
            <Text style={{ fontSize: 16, color: '#888' }}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Modal xác nhận chặn thành viên
  const renderBlockModal = () => (
    <Modal
      visible={showBlockModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowBlockModal(false)}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '80%' }}>
          <Text style={{ fontSize: 17, fontWeight: '600', marginBottom: 12 }}>Chặn {selectedMember?.fullName} khỏi nhóm?</Text>
          <Text style={{ color: '#444', marginBottom: 24 }}>{selectedMember?.fullName} không thể tham gia lại nhóm trừ khi được trưởng, phó nhóm bỏ chặn hoặc thêm lại vào nhóm</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={() => setShowBlockModal(false)} style={{ marginRight: 24 }}>
              <Text style={{ fontSize: 16, color: '#3497fd' }}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowBlockModal(false); /* Thực hiện chặn */ }}>
              <Text style={{ fontSize: 16, color: '#e74c3c', fontWeight: '600' }}>Chặn</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Thêm hàm xử lý xóa thành viên
  const handleRemoveMember = async () => {
    if (!selectedMember || !conversationId) return;
    try {
      const res = await removeParticipantsApi(conversationId, [selectedMember.userId]);
      if (res.data?.status || res.status) {
        setShowRemoveModal(false);
        setSelectedMember(null);
        fetchGroup();
      } else {
        Alert.alert('Lỗi', res.data?.message || res.message || 'Không thể xóa thành viên khỏi nhóm');
      }
    } catch (error) {
      Alert.alert('Lỗi', error?.response?.data?.message || error?.message || 'Đã xảy ra lỗi khi xóa thành viên');
    }
  };

  // Cập nhật lại modal xóa thành viên
  const renderRemoveModal = () => (
    <Modal
      visible={showRemoveModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowRemoveModal(false)}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '80%' }}>
          <Text style={{ fontSize: 17, fontWeight: '600', marginBottom: 12 }}>Xoá {selectedMember?.fullName} khỏi nhóm?</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={() => setShowRemoveModal(false)} style={{ marginRight: 24 }}>
              <Text style={{ fontSize: 16, color: '#3497fd' }}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRemoveMember}>
              <Text style={{ fontSize: 16, color: '#e74c3c', fontWeight: '600' }}>Xoá khỏi nhóm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f8fa' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Icon name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý thành viên</Text>
        <View style={{ width: 32 }} />
      </View>
      {/* Tab bar */}
      {renderTabBar()}
      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder={tab === 'blocked' ? 'Nhập tên bạn bè' : 'Tìm kiếm thành viên'}
          value={search}
          onChangeText={setSearch}
        />
        <Icon name="search1" size={20} color="#bbb" style={{ marginLeft: 8 }} />
      </View>
      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {tab === 'all' && renderAllTab()}
        {tab === 'admin' && renderAdminTab()}
        {tab === 'invited' && renderInvitedTab()}
        {tab === 'blocked' && renderBlockedTab()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: '#3497fd',
  },
  headerBtn: {
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#eaf3ff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#3497fd',
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 15,
    color: '#888',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3497fd',
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 7,
    color: '#222',
  },
  sectionTitle: {
    fontSize: 15,
    color: '#3497fd',
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 16,
  },
  specialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  specialText: {
    fontSize: 15,
    color: '#3497fd',
    fontWeight: '500',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  memberName: {
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
  },
  memberSub: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  memberRole: {
    fontSize: 13,
    color: '#3497fd',
    fontWeight: '600',
    marginTop: 2,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 15,
    marginTop: 8,
  },
  keyIcon: {
    position: 'absolute',
    bottom: -2,
    right: 5,
    width: 26,
    height: 26,
    zIndex: 2,
  },
});

export default GroupMembersScreen; 