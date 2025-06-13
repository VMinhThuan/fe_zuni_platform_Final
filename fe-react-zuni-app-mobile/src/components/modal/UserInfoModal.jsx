import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import Modal from "react-native-modal";
import dayjs from "dayjs";
import ImageViewModal from "./ImageViewModal"; // Ensure this is the RN version
import defaultAvatar from "../../assets/images/defaultAvatar.jpg"; // Use require if needed

const UserInfoModal = ({ isOpen, onClose, userData }) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const handleOpenImage = () => {
    setIsImageModalOpen(true);
  };

  const handleCloseImageModal = () => {
    setIsImageModalOpen(false);
  };

  return (
    <>
      <Modal
        isVisible={isOpen}
        onBackdropPress={onClose}
        style={styles.modal}
        backdropOpacity={0.3}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Thông tin người dùng</Text>
          </View>
          <View style={styles.content}>
            <TouchableOpacity onPress={handleOpenImage}>
              <Image
                source={{ uri: userData?.avatar || defaultAvatar }}
                style={styles.avatar}
                resizeMode="cover"
              />
            </TouchableOpacity>
            <Text style={styles.fullName}>{userData?.fullName}</Text>
            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Giới tính</Text>
                <Text style={styles.infoValue}>{userData?.gender}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ngày sinh</Text>
                <Text style={styles.infoValue}>
                  {dayjs(userData?.dateOfBirth).format("DD-MM-YYYY")}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Điện thoại</Text>
                <Text style={styles.infoValue}>{userData?.phoneNumber}</Text>
              </View>
            </View>
            <Text style={styles.note}>
              Chỉ bạn bè có lưu số của bạn trong danh bạ máy xem được số này
            </Text>
          </View>
        </View>
      </Modal>

      <ImageViewModal
        isOpen={isImageModalOpen}
        onClose={handleCloseImageModal}
        imageUrl={userData?.avatar || defaultAvatar}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: "center",
    alignItems: "center",
    margin: 0,
  },
  container: {
    width: 320, // Matches width={500} adjusted for mobile
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
  },
  header: {
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#00000026",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  content: {
    padding: 16,
    alignItems: "center",
  },
  avatar: {
    width: 104, // Matches w-26 (26 * 4px = 104px)
    height: 104, // Matches h-26
    borderRadius: 52,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },
  fullName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  infoContainer: {
    width: "100%",
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  infoLabel: {
    width: 108, // Matches w-27 (27 * 4px = 108px)
    color: "#6b7280",
    fontSize: 14,
  },
  infoValue: {
    flex: 1,
    color: "#000",
    fontSize: 14,
  },
  note: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
});

export default UserInfoModal;