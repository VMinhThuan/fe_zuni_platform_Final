import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useCurrentApp } from '../contexts/app.context';
import { updatePasswordApi } from '../services/api';

const ChangePasswordTab = ({ form, onClose, isActive }) => {
  const [oldPassword, setOldPassword] = useState(form?.oldPassword || '');
  const [newPassword, setNewPassword] = useState(form?.newPassword || '');
  const [confirmPassword, setConfirmPassword] = useState(form?.confirmPassword || '');
  const [isSubmit, setIsSubmit] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const { notificationApi } = useCurrentApp();
  const oldPasswordRef = useRef(null);

  // Validate form fields
  useEffect(() => {
    const validateForm = () => {
      // Old password validation
      const oldPasswordValid = oldPassword && oldPassword.trim().length > 0;

      // New password validation
      const newPasswordValid =
        newPassword &&
        newPassword.length >= 8 &&
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(newPassword);

      // Confirm password validation
      const confirmPasswordValid = confirmPassword && confirmPassword === newPassword;

      const allFieldsFilled = oldPassword && newPassword && confirmPassword;
      setFormValid(oldPasswordValid && newPasswordValid && confirmPasswordValid && allFieldsFilled);
    };

    validateForm();
  }, [oldPassword, newPassword, confirmPassword]);

  // Auto-focus the old password field when the tab becomes active
  useEffect(() => {
    if (isActive) {
      setTimeout(() => {
        oldPasswordRef?.current?.focus();
      }, 100);
    }
  }, [isActive]);

  const onFinish = async () => {
    setIsSubmit(true);
    try {
      const res = await updatePasswordApi({
        oldPassword,
        newPassword,
      });

      if (res?.data?.status) {
        notificationApi.success({
          message: 'Đổi mật khẩu thành công!',
        });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      } else {
        notificationApi.error({
          message: res?.message || 'Có lỗi xảy ra khi đổi mật khẩu',
        });
      }
    } catch (error) {
      console.error('Update password error:', error);
      notificationApi.error({
        message: 'Có lỗi xảy ra khi đổi mật khẩu',
      });
    } finally {
      setIsSubmit(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formRow}>
        <Text style={styles.label}>Mật khẩu hiện tại</Text>
        <TextInput
          ref={oldPasswordRef}
          style={styles.input}
          value={oldPassword}
          onChangeText={setOldPassword}
          placeholder="Nhập mật khẩu hiện tại"
          placeholderTextColor="#647187"
          secureTextEntry
          editable={!isSubmit}
        />
      </View>
      <View style={styles.formRow}>
        <Text style={styles.label}>Mật khẩu mới</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Nhập mật khẩu mới"
          placeholderTextColor="#647187"
          secureTextEntry
          editable={!isSubmit}
        />
      </View>
      <View style={styles.formRow}>
        <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Xác nhận mật khẩu mới"
          placeholderTextColor="#647187"
          secureTextEntry
          editable={!isSubmit}
        />
      </View>
      <TouchableOpacity
        style={[styles.submitButton, (!formValid || isSubmit) && styles.disabledButton]}
        onPress={onFinish}
        disabled={!formValid || isSubmit}
      >
        {isSubmit ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Đổi mật khẩu</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  formRow: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#081b3a',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  submitButton: {
    paddingVertical: 12,
    backgroundColor: '#0068ff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
});

export default ChangePasswordTab;