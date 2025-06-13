import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import defaultAvatar from '../assets/images/defaultAvatar.jpg';
import { CloseOutlined } from 'react-native-vector-icons/AntDesign';

const { height: windowHeight } = Dimensions.get('window');

const ImageViewModal = ({ isVisible, onClose, imageUrl }) => {
  if (!isVisible) return null;

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      style={styles.modal}
    >
      <View style={styles.modalContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <CloseOutlined style={styles.closeIcon} />
          </TouchableOpacity>
        </View>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl || defaultAvatar }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 1)',
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: 8,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 16,
    color: '#000',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    maxHeight: windowHeight - 120, // Equivalent to calc(100vh - 120px)
    width: '100%',
  },
});

export default ImageViewModal;