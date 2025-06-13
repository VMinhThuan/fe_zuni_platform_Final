import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { LeftOutlined } from 'react-native-vector-icons/AntDesign';
import UpdateInfoTab from './UpdateInfoTab';
import ChangePasswordTab from './ChangePasswordTab';

const UpdateModal = ({ isVisible, onClose, dataUpdate, setDataUpdate }) => {
  const [activeTab, setActiveTab] = useState('updateInfo');
  const [infoFormData, setInfoFormData] = useState(dataUpdate || {});
  const [passwordFormData, setPasswordFormData] = useState({});

  useEffect(() => {
    if (dataUpdate) {
      setInfoFormData(dataUpdate);
    }
  }, [dataUpdate]);

  useEffect(() => {
    if (!isVisible) {
      setPasswordFormData({});
      setActiveTab('updateInfo');
    }
  }, [isVisible]);

  const handleClose = () => {
    setPasswordFormData({});
    setActiveTab('updateInfo');
    onClose();
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === 'changePassword') {
      setPasswordFormData({});
    }
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={handleClose}
      style={styles.modal}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={handleClose}>
            <LeftOutlined style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Thông tin cá nhân</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'updateInfo' && styles.activeTab]}
            onPress={() => handleTabChange('updateInfo')}
          >
            <Text style={[styles.tabText, activeTab === 'updateInfo' && styles.activeTabText]}>Cập nhật thông tin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'changePassword' && styles.activeTab]}
            onPress={() => handleTabChange('changePassword')}
          >
            <Text style={[styles.tabText, activeTab === 'changePassword' && styles.activeTabText]}>Đổi mật khẩu</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.tabContent}>
          {activeTab === 'updateInfo' ? (
            <UpdateInfoTab
              form={infoFormData}
              onClose={handleClose}
              dataUpdate={dataUpdate}
              setDataUpdate={setDataUpdate}
            />
          ) : (
            <ChangePasswordTab
              form={passwordFormData}
              onClose={handleClose}
              isActive={activeTab === 'changePassword'}
            />
          )}
        </View>
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
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0068ff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#647187',
  },
  activeTabText: {
    color: '#0068ff',
  },
  tabContent: {
    flex: 1,
  },
});

export default UpdateModal;