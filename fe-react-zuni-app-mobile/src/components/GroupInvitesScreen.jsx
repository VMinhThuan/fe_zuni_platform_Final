import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const groupInvites = [
  {
    id: 1,
    groupName: 'Nhóm Dev React Native',
    avatar: 'https://randomuser.me/api/portraits/men/7.jpg',
    invitedBy: 'Nguyễn Văn X',
    members: 234,
  },
  {
    id: 2,
    groupName: 'Cộng đồng Backend Việt Nam',
    avatar: 'https://randomuser.me/api/portraits/men/8.jpg',
    invitedBy: 'Trần Thị Y',
    members: 567,
  },
  {
    id: 3,
    groupName: 'Hội Những Người Thích Design',
    avatar: 'https://randomuser.me/api/portraits/men/9.jpg',
    invitedBy: 'Lê Văn Z',
    members: 890,
  },
];

const GroupInvitesScreen = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInvites = groupInvites.filter((invite) =>
    invite.groupName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchWrapper}>
        <TextInput
          placeholder="Tìm kiếm"
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#4a4a4a"
          onKeyPress={({ nativeEvent }) => {
            if (searchTerm.length === 0 && nativeEvent.key === ' ') {
              nativeEvent.preventDefault();
            }
          }}
          style={styles.input}
        />
        {/* Icon kính lúp có thể thêm nếu dùng react-native-vector-icons hoặc hình ảnh */}
      </View>

      {/* Group Invites List */}
      <ScrollView style={styles.list}>
        {filteredInvites.map((invite) => (
          <View key={invite.id} style={styles.inviteItem}>
            <View style={styles.infoWrapper}>
              <Image
                source={{ uri: invite.avatar }}
                style={styles.avatar}
              />
              <View>
                <Text style={styles.groupName}>{invite.groupName}</Text>
                <Text style={styles.groupMeta}>
                  Được mời bởi {invite.invitedBy} • {invite.members} thành viên
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.joinBtn}>
                <Text style={styles.joinText}>Tham gia</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn}>
                <Text style={styles.deleteText}>Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default GroupInvitesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchWrapper: {
    padding: 16,
  },
  input: {
    backgroundColor: '#f0f2f5',
    color: '#4a4a4a',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 40,
    fontSize: 16,
  },
  list: {
    paddingHorizontal: 16,
  },
  inviteItem: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 6,
  },
  infoWrapper: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
  },
  groupName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#081b3a',
  },
  groupMeta: {
    fontSize: 13,
    color: '#65676b',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  joinBtn: {
    backgroundColor: '#0068ff',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  joinText: {
    color: '#fff',
    fontWeight: '500',
  },
  deleteBtn: {
    backgroundColor: '#f0f2f5',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  deleteText: {
    color: '#081b3a',
    fontWeight: '500',
  },
});

