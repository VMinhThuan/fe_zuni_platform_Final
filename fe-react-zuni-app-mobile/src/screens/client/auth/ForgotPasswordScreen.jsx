import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import debounce from 'lodash/debounce';
import { checkEmailExistsApi, forgotPasswordApi } from '../../../services/api';
import Icon from 'react-native-vector-icons/AntDesign';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [emailExists, setEmailExists] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailInputRef = useRef(null);

  const validateEmail = (email) => {
    return email.includes('@') && email.includes('.');
  };

  const checkEmailExists = useCallback(
    (email) => {
      if (!email || !validateEmail(email)) return;

      setIsCheckingEmail(true);
      checkEmailExistsApi(email)
        .then((res) => {
          setEmailExists(res.data.data.exists || false);
        })
        .catch((error) => {
          console.error('Error checking email:', error);
        })
        .finally(() => {
          setIsCheckingEmail(false);
        });
    },
    [setIsCheckingEmail, setEmailExists]
  );

  const debouncedCheckEmail = useCallback(
    debounce((email) => checkEmailExists(email), 500),
    [checkEmailExists]
  );

  useEffect(() => {
    if (email) debouncedCheckEmail(email);
    return () => {
      debouncedCheckEmail.cancel();
    };
  }, [email, debouncedCheckEmail]);

  useEffect(() => {
    const isValid = email && validateEmail(email) && !isCheckingEmail && emailExists;
    setFormValid(isValid);
  }, [email, emailExists, isCheckingEmail]);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!formValid) return;
    
    setIsSubmitting(true);
    try {
      const res = await forgotPasswordApi(email);
      if (res.data?.status && res.data?.error === 0) {
        Alert.alert(
          'Thành công',
          res.data?.message || 'Yêu cầu đặt lại mật khẩu đã được gửi',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('LoginScreen')
            }
          ]
        );
      } else {
        Alert.alert(
          'Lỗi',
          res.data?.message || 'Yêu cầu đặt lại mật khẩu thất bại'
        );
      }
    } catch (error) {
      Alert.alert(
        'Lỗi',
        error?.response?.data?.message || 'Đã có lỗi xảy ra'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEmailError = () => {
    if (!email) return '';
    if (!validateEmail(email)) return 'Email không hợp lệ';
    if (!emailExists) return 'Email không tồn tại trong hệ thống';
    return '';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrowleft" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Zuni</Text>
        <Text style={styles.subtitle}>
          Lấy lại mật khẩu bằng email đã đăng ký
        </Text>

        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Quên mật khẩu</Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              ref={emailInputRef}
              style={[
                styles.input,
                getEmailError() ? styles.inputError : null
              ]}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {isCheckingEmail && (
              <ActivityIndicator 
                style={styles.loadingIndicator} 
                size="small" 
                color="#999" 
              />
            )}
          </View>
          
          {getEmailError() ? (
            <Text style={styles.errorText}>{getEmailError()}</Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!formValid || isSubmitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!formValid || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                Gửi yêu cầu đặt lại mật khẩu
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginText}>
              Bạn nhớ mật khẩu?{' '}
              <Text
                style={styles.loginLink}
                onPress={() => navigation.navigate('LoginScreen')}
              >
                Đăng nhập
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e5effa',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#3497fd',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 16,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000e0',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ff4d4f',
  },
  loadingIndicator: {
    position: 'absolute',
    right: 16,
  },
  errorText: {
    color: '#ff4d4f',
    fontSize: 14,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#3497fd',
    borderRadius: 8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#3497fd80',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLinkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#282828',
  },
  loginLink: {
    color: '#3497fd',
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen; 