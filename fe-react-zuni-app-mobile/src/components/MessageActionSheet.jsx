import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, Modal } from 'react-native';
// Import icon images ở đây

const EMOJIS = [
  { key: 'heart', icon: require('../assets/icons/heart.png') },
  { key: 'like', icon: require('../assets/icons/like.png') },
  { key: 'haha', icon: require('../assets/icons/haha.png') },
  { key: 'wow', icon: require('../assets/icons/wow.png') },
  { key: 'cry', icon: require('../assets/icons/cry.png') },
  { key: 'angry', icon: require('../assets/icons/angry.png') },
];

const ACTIONS = [
  // Tùy biến theo loại message, truyền vào prop actions
];

export default function MessageActionSheet({
  visible,
  onClose,
  onEmojiPress,
  onActionPress,
  actions,
  position,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.sheetContainer, { top: position.y, left: 0, right: 0 }]}>
          <View style={styles.emojiBar}>
            {EMOJIS.map(e => (
              <TouchableOpacity key={e.key} onPress={() => onEmojiPress(e.key)}>
                <Image source={e.icon} style={styles.emojiIcon} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.actionGrid}>
            {actions.map((action, idx) => (
              <TouchableOpacity
                key={action.key}
                style={styles.actionItem}
                onPress={() => onActionPress(action.key)}
              >
                <Image source={action.icon} style={styles.actionIcon} />
                <Text style={styles.actionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30,30,30,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetContainer: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 8,
    width: Dimensions.get('window').width * 0.92,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  emojiBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  emojiIcon: {
    width: 36,
    height: 36,
    marginHorizontal: 4,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  actionItem: {
    width: '22%',
    alignItems: 'center',
    marginVertical: 10,
  },
  actionIcon: {
    width: 32,
    height: 32,
    marginBottom: 4,
  },
  actionText: {
    fontSize: 13,
    color: '#222',
    textAlign: 'center',
  },
});