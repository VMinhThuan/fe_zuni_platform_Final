import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { CameraOutlined } from 'react-native-vector-icons/AntDesign';
import dayjs from 'dayjs';
import defaultAvatar from '../assets/images/defaultAvatar.jpg';
import ImageViewModal from './ImageViewModal';
import UpdateAvatarModal from './UpdateAvatarModal';
import UpdateModal from './UpdateModal';

const InfoModal = ({ isInfoModalOpen, setIsInfoModalOpen, user }) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isUpdateAvatarModalOpen, setIsUpdateAvatarModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [dataUpdate, setDataUpdate] = useState(user);

  const handleOpenImage = () => {
    setIsImageModalOpen(true);
  };

  const handleCloseImageModal = () => {
    setIsImageModalOpen(false);
  };

  const handleOpenUpdateAvatar = () => {
    setIsUpdateAvatarModalOpen(true);
    setIsInfoModalOpen(false);
  };

  const handleCloseUpdateAvatar = () => {
    setIsUpdateAvatarModalOpen(false);
    setIsInfoModalOpen(true);
  };

  const handleOpenUpdateModal = () => {
    setDataUpdate(user);
    setIsUpdateModalOpen(true);
    setIsInfoModalOpen(false);
  };

  const handleCloseUpdateModal = () => {
    setDataUpdate(null);
    setIsUpdateModalOpen(false);
    setIsInfoModalOpen(true);
  };

  const handleAvatarUpdated = (newAvatarUrl) => {
    setDataUpdate((prev) => ({
      ...prev,
      avatar: newAvatarUrl,
    }));
  };

  return (
    <>
      <Modal
        isVisible={isInfoModalOpen}
        onBackdropPress={() => setIsInfoModalOpen(false)}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Thông tin tài khoản</Text>
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={handleOpenImage}>
              <Image
                source={dataUpdate?.avatar ? { uri: dataUpdate.avatar } : defaultAvatar}
                style={styles.avatar}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={handleOpenUpdateAvatar}
            >
              <CameraOutlined style={styles.cameraIcon} />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{dataUpdate?.fullName}</Text>
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Giới tính</Text>
              <Text style={styles.value}>{dataUpdate?.gender || 'Không xác định'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Ngày sinh</Text>
              <Text style={styles.value}>
                {dataUpdate?.dateOfBirth
                  ? dayjs(dataUpdate.dateOfBirth).format('DD-MM-YYYY')
                  : 'Không xác định'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Điện thoại</Text>
              <Text style={styles.value}>{dataUpdate?.phoneNumber}</Text>
            </View>
            <Text style={styles.note}>
              Chỉ bạn bè có lưu số của bạn trong danh bạ máy xem được số này
            </Text>
          </View>
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleOpenUpdateModal}
          >
            <Text style={styles.updateButtonText}>✏️ Cập nhật</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <ImageViewModal
        isVisible={isImageModalOpen}
        onClose={handleCloseImageModal}
        imageUrl={dataUpdate?.avatar || defaultAvatar}
      />

      <UpdateAvatarModal
        isVisible={isUpdateAvatarModalOpen}
        onClose={handleCloseUpdateAvatar}
        user={dataUpdate}
        onAvatarUpdated={handleAvatarUpdated}
      />

      <UpdateModal
        isVisible={isUpdateModalOpen}
        onClose={handleCloseUpdateModal}
        dataUpdate={dataUpdate}
        setDataUpdate={setDataUpdate}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
  },
  modalContent: {
    width: 500,
    maxWidth: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  cameraIcon: {
    fontSize: 18,
    color: '#000',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  infoSection: {
    width: '100%',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  label: {
    width: 108,
    fontSize: 14,
    color: '#647187',
    fontWeight: '500',
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: '#081b3a',
  },
  note: {
    fontSize: 12,
    color: '#647187',
    marginTop: 8,
  },
  updateButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#0068ff',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
});

export default InfoModal;