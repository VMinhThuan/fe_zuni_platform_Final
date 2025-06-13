import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  SectionList,
  Image,
  StyleSheet,
  Switch,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getFriendsApi, addParticipantsApi, getConversationsApi } from '../../services/api';
import defaultAvatar from '../../assets/images/defaultAvatar.jpg';
import Icon from 'react-native-vector-icons/AntDesign';
import { useSocket } from '../../contexts/socket.context';
import { useCurrentApp } from '../../contexts/app.context';
import checkboxUnchecked from '../../assets/images/checkbox_unchecked.png';
import checkboxChecked from '../../assets/images/checkbox_checked.png';
import checkboxJoined from '../../assets/images/checkbox_joined.png';

const AddGroupMembersScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { socket } = useSocket();
  const { setConversations } = useCurrentApp();
  
  // Log để debug
  console.log('Route params participants:', route.params?.participants);
  
  const { conversationId, participants = [] } = route.params || {};
  const [participantsState, setParticipantsState] = useState([]);
  const [invitedParticipantsState, setInvitedParticipantsState] = useState([]);
  const sectionListRef = useRef();

  // Khởi tạo participantsState từ dữ liệu được truyền vào
  useEffect(() => {
    if (Array.isArray(participants)) {
      console.log('Setting participants state:', participants);
      setParticipantsState(participants.map(p => {
        if (typeof p === 'string') return p;
        return p.userId || p._id || p.id || p;
      }).filter(Boolean));
    }
  }, [participants]);

  // Kiểm tra đã tham gia nhóm
  const isInGroup = useCallback((userId) => {
    console.log('Checking user:', userId);
    console.log('Current participants:', participantsState);
    
    if (!Array.isArray(participantsState) || !userId) return false;

    const isParticipant = participantsState.some(p => {
      if (typeof p === 'string') return p === userId;
      if (typeof p === 'object') {
        const participantId = p.userId || p._id || p.id;
        const result = participantId === userId;
        console.log('Comparing:', participantId, userId, result);
        return result;
      }
      return false;
    });

    console.log('Is participant result:', isParticipant);
    return isParticipant;
  }, [participantsState]);

  const [friends, setFriends] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [allowViewRecent, setAllowViewRecent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeLetter, setActiveLetter] = useState(null);

  // Chuẩn hóa participants và invitedParticipants thành mảng userId string
  const normalizedParticipants = useMemo(() => {
    if (!Array.isArray(participantsState)) return [];
    return participantsState.map(p => {
      if (typeof p === 'string' || typeof p === 'number') return String(p);
      if (p && typeof p === 'object' && p.S) return String(p.S);
      return String(p.userId || p._id || p.id || '');
    }).filter(Boolean);
  }, [participantsState]);

  const normalizedInvitedParticipants = useMemo(() => {
    if (!Array.isArray(invitedParticipantsState)) return [];
    return invitedParticipantsState.map(p => {
      if (typeof p === 'string' || typeof p === 'number') return String(p);
      if (p && typeof p === 'object' && p.S) return String(p.S);
      return String(p.userId || p._id || p.id || '');
    }).filter(Boolean);
  }, [invitedParticipantsState]);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getFriendsApi();
      if (res.data?.status) {
        setFriends(res.data?.data || []);
      } else {
        setError('Không thể lấy danh sách bạn bè');
      }
    } catch (e) {
      setError('Lỗi mạng');
    } finally {
      setLoading(false);
    }
  };

  // Filtered and grouped friends
  const filtered = useMemo(() => {
    if (!search.trim()) return friends;
    return friends.filter(f =>
      (f.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.phoneNumber || '').includes(search)
    );
  }, [friends, search]);

  // Convert participants array to the correct format if needed
  useEffect(() => {
    if (Array.isArray(participants)) {
      const normalizedParticipants = participants.map(p => {
        if (typeof p === 'string') return p;
        if (typeof p === 'object') {
          return p.userId || p._id || p.id || p;
        }
        return p;
      }).filter(Boolean);
      setParticipantsState(normalizedParticipants);
    }
  }, [participants]);

  // Kiểm tra đã được mời
  const isInvited = useCallback((userId) => {
    return invitedParticipantsState.some((p) =>
      typeof p === "string" ? p === userId : p.userId === userId
    );
  }, [invitedParticipantsState]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(f => {
      const letter = (f.fullName?.[0] || '#').toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(f);
    });
    return Object.keys(groups)
      .sort()
      .map(title => ({ title, data: groups[title] }));
  }, [filtered]);

  const alphabet = useMemo(() => grouped.map(g => g.title), [grouped]);

  // Scroll to section by letter
  const handlePressLetter = (letter) => {
    const idx = grouped.findIndex(g => g.title === letter);
    if (idx !== -1 && sectionListRef.current) {
      sectionListRef.current.scrollToLocation({ sectionIndex: idx, itemIndex: 0, animated: true });
      setActiveLetter(letter);
      setTimeout(() => setActiveLetter(null), 700);
    }
  };

  const handleSelect = (userId) => {
    if (isInGroup(userId) || isInvited(userId)) return;
    setSelected((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Lắng nghe sự kiện được thêm vào nhóm
  useEffect(() => {
    if (!socket) return;

    const handleAddedToGroup = async (data) => {
      try {
        const conversationsRes = await getConversationsApi();
        if (conversationsRes.data?.status) {
          if (typeof setConversations === 'function') {
            setConversations(conversationsRes.data?.data || []);
          }
        }
      } catch (error) {
        console.error("Lỗi khi cập nhật danh sách nhóm:", error);
      }
    };

    socket.on("added-to-group", handleAddedToGroup);
    return () => {
      socket.off("added-to-group", handleAddedToGroup);
    };
  }, [socket, setConversations]);

  // Lắng nghe sự kiện thêm thành viên vào nhóm
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleMemberAdded = (data) => {
      if (data.conversationId === conversationId && Array.isArray(data.participants)) {
        console.log('Member added, updating participants:', data.participants);
        setParticipantsState(data.participants.map(p => {
          if (typeof p === 'string') return p;
          return p.userId || p._id || p.id || p;
        }).filter(Boolean));
      }
    };

    const handleMemberRemoved = (data) => {
      if (data.conversationId === conversationId && Array.isArray(data.participants)) {
        console.log('Member removed, updating participants:', data.participants);
        setParticipantsState(data.participants.map(p => {
          if (typeof p === 'string') return p;
          return p.userId || p._id || p.id || p;
        }).filter(Boolean));
      }
    };

    const handleMemberLeft = (data) => {
      if (data.conversationId === conversationId && Array.isArray(data.participants)) {
        console.log('Member left, updating participants:', data.participants);
        setParticipantsState(data.participants.map(p => {
          if (typeof p === 'string') return p;
          return p.userId || p._id || p.id || p;
        }).filter(Boolean));
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
  }, [socket, conversationId]);

  // Lắng nghe sự kiện mời thành viên (mới)
  useEffect(() => {
    if (!socket) return;

    const handleMemberInvited = (data) => {
      if (data.conversationId === conversationId && Array.isArray(data.invitedParticipants)) {
        setInvitedParticipantsState(data.invitedParticipants);
        fetchFriends();
      }
    };
    socket.on('member-invited', handleMemberInvited);
    return () => {
      socket.off('member-invited', handleMemberInvited);
    };
  }, [socket, conversationId]);

  const handleAddMembers = async () => {
    if (!selected.length) return;
    try {
      const res = await addParticipantsApi(conversationId, selected);
      if (res.data?.status) {
        setParticipantsState(res.data.data.participants || [...normalizedParticipants, ...selected]);
        setInvitedParticipantsState(res.data.data.invitedParticipants || [...normalizedInvitedParticipants]);
        navigation.goBack();
      } else {
        setError('Thêm thành viên thất bại');
      }
    } catch (e) {
      setError('Lỗi khi thêm thành viên');
    }
  };

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const isJoined = isInGroup(item.userId);
    console.log('Rendering item:', item.fullName, 'isJoined:', isJoined);
    const isInvitedMember = isInvited(item.userId);
    const isSelected = selected.includes(item.userId);
    const disabled = isJoined || isInvitedMember || loading;

    let checkboxImage = checkboxUnchecked;
    if (isJoined) {
      checkboxImage = checkboxJoined;
    } else if (isSelected) {
      checkboxImage = checkboxChecked;
    }

    return (
      <TouchableOpacity
        style={styles.friendRow}
        onPress={() => handleSelect(item.userId)}
        disabled={disabled}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Image 
          source={checkboxImage}
          style={styles.checkbox}
          resizeMode="contain"
        />
        <Image
          source={item.avatar ? { uri: item.avatar } : defaultAvatar}
          style={styles.avatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.friendName}>{item.fullName}</Text>
          {item.username && <Text style={styles.friendUsername}>@{item.username}</Text>}
          {isJoined && <Text style={styles.joinedText}>Đã tham gia</Text>}
          {isInvitedMember && !isJoined && <Text style={styles.invitedText}>Đã mời</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Icon name="close" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thêm vào nhóm</Text>
      </View>
      {/* Đã chọn */}
      <View style={styles.selectedRow}>
        <Text style={styles.selectedText}>Đã chọn: {selected.length}</Text>
      </View>
      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm tên hoặc số điện thoại"
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.searchCountBox}>
          <Text style={styles.searchCountText}>{filtered.length}</Text>
        </View>
      </View>
      {/* Mời bằng link */}
      <TouchableOpacity style={styles.inviteLinkRow}>
        <Icon name="link" size={22} color="#3497fd" style={{ marginRight: 10 }} />
        <Text style={styles.inviteLinkText}>Mời vào nhóm bằng link</Text>
        <Icon name="right" size={18} color="#bbb" style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
      {/* Danh sách bạn bè */}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <SectionList
          ref={sectionListRef}
          sections={grouped}
          keyExtractor={item => item.userId}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          stickySectionHeadersEnabled={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 70 }}
        />
        {/* Alphabet sidebar */}
        <View style={styles.alphabetSidebar} pointerEvents="box-none">
          {alphabet.map(letter => (
            <TouchableOpacity
              key={letter}
              onPress={() => handlePressLetter(letter)}
              style={[styles.alphabetLetter, activeLetter === letter && styles.alphabetLetterActive]}
              activeOpacity={0.6}
            >
              <Text style={[styles.alphabetText, activeLetter === letter && styles.alphabetTextActive]}>{letter}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {/* Switch ... */}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Thành viên mới xem được tin gửi gần đây</Text>
        <Switch
          value={allowViewRecent}
          onValueChange={setAllowViewRecent}
          thumbColor={Platform.OS === 'android' ? '#3497fd' : undefined}
          trackColor={{ true: '#a3d8ff', false: '#ccc' }}
        />
      </View>
      {/* Nút xác nhận */}
      <TouchableOpacity style={[styles.addBtn, !selected.length && { opacity: 0.5 }]} disabled={!selected.length} onPress={handleAddMembers}>
        <Text style={styles.addBtnText}>Thêm thành viên</Text>
      </TouchableOpacity>
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
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    color: '#222',
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fafbfc',
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
  searchCountBox: {
    marginLeft: 8,
    backgroundColor: '#eee',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  searchCountText: {
    color: '#888',
    fontSize: 13,
  },
  inviteLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  inviteLinkText: {
    fontSize: 15,
    color: '#3497fd',
    fontWeight: '500',
  },
  sectionHeader: {
    backgroundColor: '#fafbfc',
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  checkbox: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  friendName: {
    fontSize: 15,
    color: '#06132b',
    fontWeight: '500',
  },
  friendUsername: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  alphabetSidebar: {
    position: 'absolute',
    right: 0,
    top: 80,
    bottom: 80,
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  alphabetLetter: {
    paddingVertical: 2,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 1,
  },
  alphabetLetterActive: {
    backgroundColor: '#3497fd',
  },
  alphabetText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600',
  },
  alphabetTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  switchLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  addBtn: {
    backgroundColor: '#3497fd',
    margin: 16,
    borderRadius: 24,
    alignItems: 'center',
    paddingVertical: 13,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '500',
  },
  joinedText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  invitedText: {
    fontSize: 12,
    color: '#3497fd',
    marginTop: 2,
  },
});

export default AddGroupMembersScreen;