import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Modal, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const MessageDropdown = ({ message, currentUserId, onDelete }) => {
  const [visible, setVisible] = useState(false);
  const [isPressed, setIsPressed] = useState(false); // For icon color change
  const [position, setPosition] = useState({ x: 0, y: 0 }); // For dynamic positioning
  const triggerRef = useRef(null);

  // Nếu tin nhắn đã bị xóa, không hiển thị menu
  if (message.isDeleted) {
    return null;
  }

  const items = [
    {
      key: 'delete',
      label: 'Xóa tin nhắn',
      danger: true,
      disabled: message.sender?.id !== currentUserId,
    },
  ];

  const handlePress = () => {
    // Measure the position of the trigger button
    triggerRef.current.measureInWindow((x, y, width, height) => {
      setPosition({ x, y: y + height }); // Position dropdown below the trigger
      setVisible(true);
    });
  };

  const handleItemPress = async (key) => {
    if (key === 'delete') {
      try {
        await onDelete(message); // Ensure onDelete is async-compatible
      } catch (error) {
        console.error('Error deleting message:', error);
        // Optionally show an error message to the user
      }
    }
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        style={styles.triggerContainer}
        onPress={handlePress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        activeOpacity={0.7}
        accessibilityLabel="Message options"
        accessibilityRole="button"
      >
        <Icon
          name="ellipsis-h"
          size={10}
          color={isPressed ? '#005ae0' : '#5a6981'} // Mimic hover color change
          style={styles.icon}
        />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setVisible(false)}
          activeOpacity={1}
        >
          <View
            style={[
              styles.dropdownMenu,
              {
                top: position.y,
                left: position.x - 110, // Adjust to align right edge of menu with trigger (menu width - trigger width)
              },
            ]}
          >
            {items.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.menuItem, item.disabled && styles.menuItemDisabled]}
                onPress={() => !item.disabled && handleItemPress(item.key)}
                disabled={item.disabled}
                activeOpacity={0.7}
                accessibilityLabel={item.label}
                accessibilityRole="menuitem"
              >
                <Text
                  style={[
                    styles.menuItemText,
                    item.danger && styles.menuItemDanger,
                    item.disabled && styles.menuItemTextDisabled,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  triggerContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffffcc',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  icon: {
    // Color is now handled dynamically in the component
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Semi-transparent overlay
  },
  dropdownMenu: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    minWidth: 120,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemText: {
    fontSize: 14,
    color: '#000',
  },
  menuItemDanger: {
    color: '#ff4d4f', // Ant Design's danger color
  },
  menuItemTextDisabled: {
    color: '#bfbfbf', // Ant Design's disabled text color
  },
});

export default MessageDropdown;