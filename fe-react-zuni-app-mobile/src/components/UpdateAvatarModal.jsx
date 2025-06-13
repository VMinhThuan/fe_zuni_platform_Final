import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { launchImageLibrary } from 'react-native-image-picker';
import { uploadFileApi } from '../services/api';
import { useCurrentApp } from '../contexts/app.context';
import defaultAvatar from '../assets/images/defaultAvatar.jpg';
import { LeftOutlined, PlusOutlined, LoadingOutlined } from 'react-native-vector-icons/AntDesign';

const UpdateAvatarModal = ({ isVisible, onClose, user, onAvatarUpdated }) => {
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { notificationApi, setUser } = useCurrentApp();

  useEffect(() => {
    if (!isVisible) {
      setAvatar(null);
      setAvatarPreview(null);
      setPreviewOpen(false);
    }
  }, [isVisible]);

  const handleAvatarChange = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
      });

      if (result.didCancel || !result.assets?.[0]) {
        return;
      }

      const file = result.assets[0];
      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/jpg';
      if (!isJpgOrPng) {
        notificationApi.error({
          message: 'Ảnh phải là định dạng JPG/JPEG/PNG!',
        });
        return;
      }

      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        notificationApi.error({
          message: 'Ảnh phải nhỏ hơn 2MB!',
        });
        return;
      }

      const previewUrl = file.uri;
      setAvatarPreview(previewUrl);
      setAvatar(file);
    } catch (error) {
      console.error('Error selecting avatar:', error);
      notificationApi.error({
        message: 'Không thể chọn ảnh. Vui lòng thử lại.',
      });
    }
  };

  const handlePreview = () => {
    if (avatarPreview) {
      setPreviewOpen(true);
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatar) {
      notificationApi.error({
        message: 'Vui lòng chọn ảnh đại diện',
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      const imageUri = Platform.OS === 'android' ? avatar.uri : avatar.uri.replace('file://', '');
      formData.append('avatar', {
        uri: imageUri,
        type: avatar.type || 'image/jpeg',
        name: avatar.fileName || `avatar_${Date.now()}.jpg`,
      });

      const uploadResponse = await uploadFileApi(formData);

      if (!uploadResponse.data?.status) {
        throw new Error(uploadResponse.data?.message || 'Không thể tải lên ảnh đại diện');
      }

      const newAvatarUrl = uploadResponse.data?.data.url;
      setUser((prev) => ({
        ...prev,
        avatar: newAvatarUrl,
      }));
      onAvatarUpdated(newAvatarUrl);
      notificationApi.success({
        message: 'Cập nhật ảnh đại diện thành công!',
      });
      setAvatar(null);
      setAvatarPreview(null);
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      if (error.response) {
        notificationApi.error({
          message: 'Lỗi từ server',
          description: error.response.message,
        });
      } else if (error.request) {
        notificationApi.error({
          message: 'Lỗi mạng',
          description: 'Không thể kết nối đến server. Vui lòng thử lại!',
        });
      } else {
        notificationApi.error({
          message: 'Lỗi không xác định',
          description: error.message,
        });
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      style={styles.modal}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <LeftOutlined style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Cập nhật ảnh đại diện</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.content}>
          <View style={styles.uploadContainer}>
            <TouchableOpacity
              onPress={handleAvatarChange}
              style={styles.uploadButton}
              disabled={uploading}
            >
              {avatarPreview ? (
                <Image
                  source={{ uri: avatarPreview }}
                  style={styles.uploadPreview}
                />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  {uploading ? (
                    <LoadingOutlined style={styles.uploadIcon} />
                  ) : (
                    <PlusOutlined style={styles.uploadIcon} />
                  )}
                  <Text style={styles.uploadText}>Tải ảnh lên</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.currentAvatarSection}>
            <Text style={styles.sectionTitle}>Ảnh đại diện của tôi</Text>
            <Image
              source={{ uri: user?.avatar || defaultAvatar }}
              style={styles.currentAvatar}
            />
          </View>
          <TouchableOpacity
            style={[styles.updateButton, (uploading || !avatar) && styles.disabledButton]}
            onPress={handleUploadAvatar}
            disabled={uploading || !avatar}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Cập nhật</Text>
            )}
          </TouchableOpacity>
        </View>
        {previewOpen && avatarPreview && (
          <Modal
            isVisible={previewOpen}
            onBackdropPress={() => setPreviewOpen(false)}
            style={styles.previewModal}
          >
            <View style={styles.previewModalContent}>
              <TouchableOpacity
                style={styles.previewCloseButton}
                onPress={() => setPreviewOpen(false)}
              >
                <CloseOutlined style={styles.previewCloseIcon} />
              </TouchableOpacity>
              <Image
                source={{ uri: avatarPreview }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </View>
          </Modal>
        )}
      </View>
    </Modal>
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
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backIcon: {
    fontSize: 16,
    color: '#000',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 20,
  },
  content: {
    flexDirection: 'column',
    gap: 16,
  },
  uploadContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  uploadButton: {
    width: 104,
    height: 104,
    borderRadius: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    backgroundColor: '#f1f2f4',
  },
  uploadPreview: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  uploadPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadIcon: {
    fontSize: 24,
    color: '#647187',
  },
  uploadText: {
    fontSize: 12,
    color: '#647187',
    marginTop: 8,
  },
  currentAvatarSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  currentAvatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  updateButton: {
    paddingVertical: 12,
    backgroundColor: '#0068ff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  previewModal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewModalContent: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 1)',
    width: '100%',
    height: '100%',
  },
  previewCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  previewCloseIcon: {
    fontSize: 16,
    color: '#000',
  },
  previewImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default UpdateAvatarModal;