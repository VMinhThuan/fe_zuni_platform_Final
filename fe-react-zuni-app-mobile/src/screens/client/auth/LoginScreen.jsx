// LoginScreen.jsx (App - Giao diện giống hệt web)
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { loginApi } from '../../../services/api';
import { useCurrentApp } from '../../../contexts/app.context';
import BannerIcon from '../../../assets/images/banner_icon.svg';
import AsyncStorage from "@react-native-async-storage/async-storage"; // ✅ Nhớ import dòng này
import { axiosClient } from '../../../services/api';

const LoginScreen = () => {
  const navigation = useNavigation();
  const { setIsAuthenticated, setUser, messageApi, notificationApi } = useCurrentApp();

  const [form, setForm] = useState({ account: '', password: '' });
  const [isSubmit, setIsSubmit] = useState(false);
  const accountInputRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);

  const isFormValid = form.account && form.password;

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  //api
  const handleLogin = async () => {
    if (!isFormValid) return;
  
    setIsSubmit(true);
    try {

      console.log("Đang login tới:", axiosClient.defaults.baseURL);

      const res = await loginApi(form);
  
      const accessToken = res?.data?.data?.accessToken;
      const user = res?.data?.data?.user;
  
      if (accessToken && user) {
        await AsyncStorage.setItem("accessToken", accessToken); // ✅ Lưu token
        setUser(user); // ✅ Cập nhật context
        setIsAuthenticated(true);
  
        messageApi.open({ type: "success", content: "Đăng nhập thành công!" });
        navigation.navigate("HomeScreen");
      } else {
        notificationApi.error({
          message: "Đăng nhập thất bại",
          description: res?.data?.message || "Dữ liệu trả về không hợp lệ",
        });
      }
    } catch (error) {
      notificationApi.error({
        message: "Lỗi đăng nhập",
        description: error?.response?.data?.message || "Không thể kết nối server",
      });
      console.log("❌ Lỗi đăng nhập:", error);
    }
    setIsSubmit(false);
  };

  useEffect(() => {
    accountInputRef.current?.focus();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Zuni</Text>
      <Text style={styles.subtitle}>Đăng nhập tài khoản Zuni để kết nối với ứng dụng Zuni Web</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Đăng nhập</Text>

        <View style={styles.inputContainer}>
          <TextInput
            ref={accountInputRef}
            style={styles.input}
            placeholder="Email hoặc số điện thoại"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            value={form.account}
            onChangeText={(text) => handleChange('account', text)}
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { paddingRight: 50 }]}
            placeholder="Mật khẩu"
            placeholderTextColor="#94a3b8"
            secureTextEntry={!showPassword}
            value={form.password}
            onChangeText={(text) => handleChange('password', text)}
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Image
              source={showPassword ? require('../../../assets/icons/eye_off.png') : require('../../../assets/icons/eye.png')}
              style={styles.passwordToggleIcon}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleLogin}
          disabled={!isFormValid || isSubmit}
          style={[styles.button, (!isFormValid || isSubmit) && styles.buttonDisabled]}
        >
          {isSubmit ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Đăng nhập</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPasswordScreen')}>
          <Text style={styles.forgotText}>Quên mật khẩu</Text>
        </TouchableOpacity>

        <Text style={styles.registerText}>
          Chưa có tài khoản?{' '}
          <Text style={styles.registerLink} onPress={() => navigation.navigate('RegisterScreen')}>
            Đăng ký
          </Text>
        </Text>

        <View style={styles.bannerCard}>
          <Image source={BannerIcon} style={styles.bannerImage} />
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>Nâng cao hiệu quả công việc với Zuni PC</Text>
            <Text style={styles.bannerDesc}>
              Gửi file lớn đến 1 GB, chụp màn hình, gọi video và nhiều tiện ích hơn nữa
            </Text>
          </View>
          <TouchableOpacity style={styles.downloadBtn}>
            <Text style={styles.downloadBtnText}>Tải ngay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#e5effa',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 12,
    color: '#555',
  },
  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000e0',
    textAlign: 'center',
    marginBottom: 12,
  },
  inputContainer: {
    position: 'relative',
    marginVertical: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -12 }],
    padding: 4,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  forgotText: {
    marginTop: 14,
    textAlign: 'center',
    color: '#282828',
  },
  registerText: {
    marginTop: 16,
    textAlign: 'center',
    color: '#282828',
  },
  registerLink: {
    color: '#2563eb',
    fontWeight: 'bold',
  },
  bannerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  bannerImage: {
    width: 40,
    height: 40,
  },
  bannerTextContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  bannerTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#000',
  },
  bannerDesc: {
    fontSize: 12,
    color: '#555',
  },
  downloadBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  downloadBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  passwordToggleIcon: {
    width: 20,
    height: 20,
  },
});

export default LoginScreen;
