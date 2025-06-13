import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';

const groups = [
  {
    id: 1,
    name: 'Nhóm Dev React',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    members: 156,
  },
  {
    id: 2,
    name: 'Cộng đồng Frontend Việt Nam',
    avatar: 'https://randomuser.me/api/portraits/men/2.jpg',
    members: 2345,
  },
  {
    id: 3,
    name: 'Hội những người thích code',
    avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
    members: 789,
  },
];

const GroupListScreen = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchWrapper}>
        <TextInput
          placeholder="Tìm nhóm"
          placeholderTextColor="#4a4a4a"
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={styles.input}
          onKeyPress={({ nativeEvent }) => {
            if (searchTerm.length === 0 && nativeEvent.key === ' ') {
              nativeEvent.preventDefault?.();
            }
          }}
        />
      </View>

      {/* Group List */}
      <ScrollView style={styles.list}>
        {filteredGroups.map((group) => (
          <View key={group.id} style={styles.groupItem}>
            <View style={styles.infoWrapper}>
              <Image
                source={{ uri: group.avatar }}
                style={styles.avatar}
              />
              <View>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.members}>
                  {group.members} thành viên
                </Text>
              </View>
            </View>
            <TouchableOpacity>
              <Text style={styles.moreBtn}>⋯</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default GroupListScreen;

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
  groupItem: {
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
  members: {
    fontSize: 13,
    color: '#65676b',
    marginTop: 2,
  },
  moreBtn: {
    fontSize: 20,
    color: '#4a4a4a',
    paddingHorizontal: 6,
  },
});
