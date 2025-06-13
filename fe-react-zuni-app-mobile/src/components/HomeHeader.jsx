import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const HomeHeader = () => {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Tìm kiếm</Text>
      <View style={styles.searchBar}>
        <Icon name="search" size={20} color="#888" />
        <TextInput placeholder="Tìm kiếm" style={styles.input} />
      </View>
      <View style={styles.tabs}>
        <Text style={styles.activeTab}>Ưu tiên</Text>
        <Text style={styles.inactiveTab}>Khác</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { padding: 16, backgroundColor: 'white' },
  title: { fontSize: 12, color: '#555', marginBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  input: { flex: 1, marginLeft: 8 },
  tabs: { flexDirection: 'row', marginTop: 16 },
  activeTab: {
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
    marginRight: 24,
    paddingBottom: 4,
  },
  inactiveTab: {
    color: '#888',
  },
});

export default HomeHeader;
