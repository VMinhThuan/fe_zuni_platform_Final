// 📁 contexts/ModalContext.js
import React, { createContext, useContext, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AntDesign from 'react-native-vector-icons/AntDesign';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [modalData, setModalData] = useState({ user: null, onLogout: () => {} });

  const showProfileModal = (user, onLogout) => {
    setModalData({ user, onLogout });
    setProfileModalVisible(true);
  };

  const showSettingsModal = (onLogout) => {
    setModalData((prev) => ({ ...prev, onLogout }));
    setSettingsModalVisible(true);
  };

  const hideProfileModal = () => {
    setProfileModalVisible(false);
  };

  const hideSettingsModal = () => {
    setSettingsModalVisible(false);
  };

  return (
    <ModalContext.Provider
      value={{ showProfileModal, showSettingsModal, hideProfileModal, hideSettingsModal }}
    >
      {children}

      {/* Profile Modal */}
      <Modal
        visible={profileModalVisible}
        animationType="none" // Bỏ animation
        transparent
        onRequestClose={hideProfileModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalData.user?.fullName || 'Người dùng'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                hideProfileModal();
                showSettingsModal(modalData.onLogout);
              }}
              style={styles.modalItem}
            >
              <AntDesign name="setting" size={20} color="#333" />
              <Text style={styles.modalText}>Cài đặt</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={modalData.onLogout} style={styles.modalItem}>
              <MaterialIcons name="logout" size={20} color="#e74c3c" />
              <Text style={[styles.modalText, { color: '#e74c3c' }]}>Đăng xuất</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={hideProfileModal}>
              <Text style={styles.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={settingsModalVisible}
        animationType="none" // Bỏ animation
        transparent
        onRequestClose={hideSettingsModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cài đặt</Text>
            <TouchableOpacity onPress={modalData.onLogout} style={styles.modalItem}>
              <MaterialIcons name="logout" size={20} color="#e74c3c" />
              <Text style={[styles.modalText, { color: '#e74c3c' }]}>Đăng xuất</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={hideSettingsModal}>
              <Text style={styles.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // Tăng zIndex để đảm bảo không bị che khuất
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    width: 300,
    borderRadius: 16,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontWeight: '700',
    fontSize: 18,
    color: '#333',
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    width: '100%',
  },
  modalText: {
    fontSize: 16,
    color: '#333',
  },
  modalClose: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});