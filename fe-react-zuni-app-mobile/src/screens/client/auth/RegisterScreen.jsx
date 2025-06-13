import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SvgUri } from 'react-native-svg';
import BannerIcon from '../../../assets/images/banner_icon.svg';
import {useCurrentApp} from '../../../contexts/app.context';
import {
  checkEmailExistsApi,
  checkPhoneExistsApi,
  registerApi,
} from '../../../services/api';
import AsyncStorage from "@react-native-async-storage/async-storage";

const RegisterScreen = ({navigation}) => {
  const {messageApi, setUser} = useCurrentApp();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    email: '',
    phoneNumber: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    gender: '',
    dateOfBirth: new Date(),
  });

  const [errors, setErrors] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const [touchedFields, setTouchedFields] = useState({});
  const [emailExists, setEmailExists] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);

  const emailRef = useRef();

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    validate();
  }, [form, emailExists, phoneExists]);

  // ⬇ Thay thế toàn bộ hàm validate
const validate = useCallback(() => {
  let temp = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^0\d{9}$/;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  const age =
    new Date().getFullYear() - new Date(form.dateOfBirth).getFullYear();

  if (!form.email) temp.email = 'Vui lòng nhập email';
  else if (!emailRegex.test(form.email)) temp.email = 'Email không hợp lệ';
  else if (emailExists) temp.email = 'Email đã được sử dụng';

  if (!form.phoneNumber) temp.phoneNumber = 'Vui lòng nhập số điện thoại';
  else if (!phoneRegex.test(form.phoneNumber)) temp.phoneNumber = 'Số điện thoại không hợp lệ';
  else if (phoneExists) temp.phoneNumber = 'Số điện thoại đã được sử dụng';

  if (!form.fullName || form.fullName.trim().length === 0)
    temp.fullName = 'Họ và tên không được để trống';

  if (!form.gender) temp.gender = 'Vui lòng chọn giới tính';

  if (!form.dateOfBirth || age < 14)
    temp.dateOfBirth = 'Phải đủ 14 tuổi trở lên';

  if (!form.password) temp.password = 'Vui lòng nhập mật khẩu';
  else if (!passwordRegex.test(form.password))
    temp.password = 'Mật khẩu chưa đủ mạnh';

  if (form.password !== form.confirmPassword)
    temp.confirmPassword = 'Mật khẩu không khớp';

  setErrors(temp);
  setFormValid(Object.keys(temp).length === 0);
}, [form, emailExists, phoneExists]);

// ⬇ Replace useEffect debounce kiểm tra email/phone tồn tại
useEffect(() => {
  const timer = setTimeout(() => {
    if (form.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      checkEmailExistsApi(form.email)
        .then(res => {
          const exists = res?.data?.data?.exists || false;
          setEmailExists(exists);
        })
        .catch(() => setEmailExists(false));
    }

    if (form.phoneNumber && /^0\d{9}$/.test(form.phoneNumber)) {
      checkPhoneExistsApi(form.phoneNumber)
        .then(res => {
          const exists = res?.data?.data?.exists || false;
          setPhoneExists(exists);
        })
        .catch(() => setPhoneExists(false));
    }
  }, 500);

  return () => clearTimeout(timer);
}, [form.email, form.phoneNumber]);

// ⬇ Thay đổi hàm handleRegister để điều hướng đến SetupAvatarScreen
const handleRegister = useCallback(async () => {
  if (!formValid || emailExists || phoneExists) {
    messageApi.open({ content: 'Vui lòng kiểm tra lại thông tin.' });
    return;
  }

  setIsSubmitting(true);

  try {
    const payload = {
      ...form,
      dateOfBirth: form.dateOfBirth.toISOString(),
    };
    
    const res = await registerApi(payload);
    if (res.data.data) {
      // Lưu token và dữ liệu người dùng
      await AsyncStorage.setItem("accessToken", res.data.data.accessToken);
      await AsyncStorage.setItem("justRegistered", "true");

      // Cập nhật thông tin người dùng trong context
      setUser(res.data.data.user);
      
      messageApi.open({ content: 'Đăng ký thành công!' });
      
      // Điều hướng đến trang thiết lập ảnh đại diện
      navigation.navigate('SetupAvatarScreen');
    } else {
      messageApi.open({
        content: res?.data?.message || 'Đăng ký thất bại, vui lòng thử lại.',
      });
    }
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    messageApi.open({ content: 'Lỗi kết nối máy chủ.' });
  } finally {
    setIsSubmitting(false);
  }
}, [formValid, form, messageApi, navigation, setUser, emailExists, phoneExists]);

// ⬇ Không cần validate trong useCallback nữa
useEffect(() => {
  validate();
}, [form, emailExists, phoneExists]);


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.logo}>Zuni</Text>
      <Text style={styles.subtitle}>
        Đăng ký tài khoản Zuni để kết nối với bạn bè và gia đình
      </Text>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Đăng ký</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#94a3b8"
          value={form.email}
          onChangeText={val => {
            setForm({...form, email: val});
            setTouchedFields({...touchedFields, email: true});
          }}
          onBlur={async () => {
            if (form.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
              try {
                const res = await checkEmailExistsApi(form.email);
                if (res?.data?.exists) {
                  setEmailExists(true);
                  setErrors(prev => ({
                    ...prev,
                    email: 'Email đã được sử dụng',
                  }));
                } else {
                  setEmailExists(false);
                }
              } catch {}
            }
          }}
        />
        {touchedFields.email && errors.email && (
          <Text style={styles.error}>{errors.email}</Text>
        )}
        <TextInput
          style={styles.input}
          placeholder="Số điện thoại"
          placeholderTextColor="#94a3b8"
          keyboardType="phone-pad"
          value={form.phoneNumber}
          onChangeText={val => {
            setForm({...form, phoneNumber: val});
            setTouchedFields({...touchedFields, phoneNumber: true});
          }}
          onBlur={async () => {
            if (/^0\d{9}$/.test(form.phoneNumber)) {
              try {
                const res = await checkPhoneExistsApi(form.phoneNumber);
                if (res?.data?.exists) {
                  setPhoneExists(true);
                  setErrors(prev => ({
                    ...prev,
                    phoneNumber: 'Số điện thoại đã được sử dụng',
                  }));
                } else {
                  setPhoneExists(false);
                }
              } catch {}
            }
          }}
        />

        {touchedFields.phoneNumber && errors.phoneNumber && (
          <Text style={styles.error}>{errors.phoneNumber}</Text>
        )}

        <TextInput
          style={styles.input}
          placeholder="Họ và tên"
          placeholderTextColor="#94a3b8"
          value={form.fullName}
          onChangeText={val => {
            setForm({...form, fullName: val});
            setTouchedFields({...touchedFields, fullName: true});
          }}
        />
        {touchedFields.fullName && errors.fullName && (
          <Text style={styles.error}>{errors.fullName}</Text>
        )}

        <View style={styles.genderGroup}>
          {['Nam', 'Nữ', 'Khác'].map(item => (
            <TouchableOpacity
              key={item}
              style={[
                styles.genderOption,
                form.gender === item && styles.genderActive,
              ]}
              onPress={() => {
                setForm({...form, gender: item});
                setTouchedFields({...touchedFields, gender: true});
              }}>
              <Text>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {touchedFields.gender && errors.gender && (
          <Text style={styles.error}>{errors.gender}</Text>
        )}

        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={styles.input}>
          <Text>
            {form.dateOfBirth
              ? form.dateOfBirth.toLocaleDateString()
              : 'Chọn ngày sinh'}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={form.dateOfBirth}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setForm({...form, dateOfBirth: selectedDate});
                setTouchedFields({...touchedFields, dateOfBirth: true});
              }
            }}
          />
        )}
        {touchedFields.dateOfBirth && errors.dateOfBirth && (
          <Text style={styles.error}>{errors.dateOfBirth}</Text>
        )}

        <TextInput
          style={styles.input}
          placeholder="Mật khẩu"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={form.password}
          onChangeText={val => {
            setForm({...form, password: val});
            setTouchedFields({...touchedFields, password: true});
          }}
        />
        {touchedFields.password && errors.password && (
          <Text style={styles.error}>{errors.password}</Text>
        )}

        <TextInput
          style={styles.input}
          placeholder="Xác nhận mật khẩu"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={form.confirmPassword}
          onChangeText={val => {
            setForm({...form, confirmPassword: val});
            setTouchedFields({...touchedFields, confirmPassword: true});
          }}
        />
        {touchedFields.confirmPassword && errors.confirmPassword && (
          <Text style={styles.error}>{errors.confirmPassword}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, !formValid && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={!formValid || isSubmitting}>
          <Text style={styles.buttonText}>
            {isSubmitting ? 'Đang xử lý...' : 'Tạo tài khoản'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.loginText}>
        Đã có tài khoản?{' '}
        <Text
          style={styles.loginLink}
          onPress={() => navigation.navigate('LoginScreen')}>
          Đăng nhập
        </Text>
      </Text>

      <View style={styles.bannerCard}>
        <Image source={BannerIcon} style={styles.bannerImage} />
        <View style={{flex: 1}}>
          <Text style={styles.bannerTitle}>
            Nâng cao hiệu quả công việc với Zuni PC
          </Text>
          <Text style={styles.bannerDesc}>
            Gửi file lớn đến 1 GB, chụp màn hình, gọi video và nhiều tiện ích
            hơn nữa
          </Text>
        </View>
        <TouchableOpacity style={styles.bannerButton}>
          <Text style={{color: 'white'}}>Tải ngay</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {backgroundColor: '#e5effa', padding: 16},
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0078FF',
    textAlign: 'center',
    marginVertical: 8,
  },
  subtitle: {textAlign: 'center', color: '#555', marginBottom: 16},
  formCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  formTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    color: '#000000'
  },
  error: {color: 'red', fontSize: 12, marginBottom: 8},
  button: {
    backgroundColor: '#0078FF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {color: 'white', fontWeight: 'bold'},
  loginText: {textAlign: 'center', color: '#282828'},
  loginLink: {color: '#0078FF', fontWeight: 'bold'},
  bannerCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  bannerImage: {width: 40, height: 40, marginRight: 8},
  bannerTitle: {fontSize: 14, fontWeight: 'bold'},
  bannerDesc: {fontSize: 12, color: '#777'},
  bannerButton: {
    backgroundColor: '#0078FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  genderGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  genderOption: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  genderActive: {borderColor: '#0078FF', backgroundColor: '#cce6ff'},
});

export default RegisterScreen;
