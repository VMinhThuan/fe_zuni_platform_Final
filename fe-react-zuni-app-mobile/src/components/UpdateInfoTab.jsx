import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import dayjs from 'dayjs';
import { useCurrentApp } from '../contexts/app.context';
import { updateUserApi } from '../services/api';

const UpdateInfoTab = ({ form, onClose, dataUpdate, setDataUpdate }) => {
  const [fullName, setFullName] = useState(dataUpdate?.fullName || '');
  const [gender, setGender] = useState(dataUpdate?.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(dataUpdate?.dateOfBirth || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const { notificationApi, setUser } = useCurrentApp();

  // Validate form fields
  useEffect(() => {
    const validateForm = () => {
      // Full name validation
      const fullNameValid =
        fullName &&
        fullName.trim().length > 0 &&
        !/\d/.test(fullName);

      // Gender validation
      const genderValid = gender && ['Nam', 'Nữ', 'Khác'].includes(gender);

      // Date of birth validation
      let dateOfBirthValid = false;
      if (dateOfBirth) {
        const birthDate = dayjs(dateOfBirth, 'YYYY-MM-DD');
        const today = dayjs();
        if (birthDate.isValid() && birthDate.isBefore(today)) {
          const age = today.diff(birthDate, 'year');
          dateOfBirthValid = age >= 14;
        }
      }

      const allFieldsFilled = fullName && gender && dateOfBirth;
      setFormValid(fullNameValid && genderValid && dateOfBirthValid && allFieldsFilled);
    };

    validateForm();
  }, [fullName, gender, dateOfBirth]);

  const handleFullNameChange = (value) => {
    setFullName(value);
  };

  const handleGenderChange = (value) => {
    setGender(value);
  };

  const handleDateOfBirthChange = (value) => {
    setDateOfBirth(value);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const values = {
        id: dataUpdate?.userId,
        fullName,
        gender,
        dateOfBirth,
      };
      const res = await updateUserApi(values);

      if (res?.data?.status) {
        notificationApi.success({
          message: 'Cập nhật thông tin thành công!',
        });
        setDataUpdate(null);
        setUser(res.data.data);
        setFullName('');
        setGender('');
        setDateOfBirth('');
        onClose();
      } else {
        notificationApi.error({
          message: res?.message || 'Có lỗi xảy ra khi cập nhật thông tin',
        });
      }
    } catch (error) {
      console.error('Update error:', error);
      notificationApi.error({
        message: 'Có lỗi xảy ra khi cập nhật thông tin',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formRow}>
        <Text style={styles.label}>Tên hiển thị</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={handleFullNameChange}
          placeholder="Nhập tên hiển thị"
          placeholderTextColor="#647187"
          editable={!isSubmitting}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === ' ' && fullName.length === 0) {
              e.preventDefault();
            }
          }}
        />
      </View>
      <View style={styles.formRow}>
        <Text style={styles.label}>Giới tính</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={[styles.radioButton, gender === 'Nam' && styles.radioButtonSelected]}
            onPress={() => handleGenderChange('Nam')}
            disabled={isSubmitting}
          >
            <Text style={[styles.radioText, gender === 'Nam' && styles.radioTextSelected]}>Nam</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, gender === 'Nữ' && styles.radioButtonSelected]}
            onPress={() => handleGenderChange('Nữ')}
            disabled={isSubmitting}
          >
            <Text style={[styles.radioText, gender === 'Nữ' && styles.radioTextSelected]}>Nữ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, gender === 'Khác' && styles.radioButtonSelected]}
            onPress={() => handleGenderChange('Khác')}
            disabled={isSubmitting}
          >
            <Text style={[styles.radioText, gender === 'Khác' && styles.radioTextSelected]}>Khác</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.formRow}>
        <Text style={styles.label}>Ngày sinh</Text>
        <TextInput
          style={styles.input}
          value={dateOfBirth}
          onChangeText={handleDateOfBirthChange}
          placeholder="Nhập ngày sinh (YYYY-MM-DD)"
          placeholderTextColor="#647187"
          editable={!isSubmitting}
        />
      </View>
      <TouchableOpacity
        style={[styles.submitButton, (!formValid || isSubmitting) && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={!formValid || isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Cập nhật</Text>
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
  radioGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  radioButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 16,
  },
  radioButtonSelected: {
    borderColor: '#0068ff',
    backgroundColor: '#e6f0ff',
  },
  radioText: {
    fontSize: 14,
    color: '#647187',
  },
  radioTextSelected: {
    color: '#0068ff',
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

export default UpdateInfoTab;