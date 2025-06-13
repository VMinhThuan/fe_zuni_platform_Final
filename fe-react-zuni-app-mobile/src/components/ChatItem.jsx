import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const ChatItem = ({ chat }) => {
  return (
    <View style={styles.item}>
      <Image source={{ uri: chat.avatar }} style={styles.avatar} />
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.name}>{chat.name}</Text>
          <Text style={styles.time}>{chat.time}</Text>
        </View>
        <Text style={styles.lastMsg}>{chat.lastMsg}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  info: { flex: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  name: { fontWeight: 'bold', fontSize: 16 },
  time: { fontSize: 12, color: '#999' },
  lastMsg: { color: '#555', marginTop: 2 },
});

export default ChatItem;
