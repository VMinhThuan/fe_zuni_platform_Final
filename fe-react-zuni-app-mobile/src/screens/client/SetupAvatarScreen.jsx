import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useCurrentApp} from '../../contexts/app.context';
import {uploadFileApi} from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SetupAvatarScreen = () => {
  const navigation = useNavigation();
  const {messageApi, setUser, setIsAuthenticated} = useCurrentApp();
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Hàm xử lý khi chọn ảnh từ ImagePickerScreen
  const handleSelectImage = useCallback(imageData => {
    if (!imageData) return;
    setSelectedImage(imageData);
  }, []);

  // Hàm mở màn hình chọn ảnh
  const openImagePicker = useCallback(() => {
    navigation.navigate('ImagePickerScreen', {
      maxFileSize: 2 * 1024 * 1024, // 2MB
      mediaType: 'photo',
      onSelectMedia: handleSelectImage,
    });
  }, [navigation, handleSelectImage]);

  // Hàm tải ảnh đại diện lên server
  const handleUploadAvatar = useCallback(async () => {
    if (!selectedImage) {
      messageApi.open({
        content: 'Vui lòng chọn ảnh đại diện',
      });
      return;
    }

    setUploading(true);

    try {
      // Chuẩn bị FormData để upload
      const formData = new FormData();
      formData.append('avatar', {
        uri: selectedImage.uri,
        type: selectedImage.type || 'image/jpeg',
        name: selectedImage.fileName || 'avatar.jpg',
      });

      // Gọi API upload ảnh
      const response = await uploadFileApi(formData);

      if (response?.data?.status) {
        // Xóa cờ đánh dấu đã đăng ký
        await AsyncStorage.removeItem('justRegistered');
        
        // Cập nhật thông tin user với avatar mới
        setUser(prev => ({
          ...prev,
          avatar: response.data.data.avatar,
        }));

        // Đánh dấu đã xác thực để chuyển sang màn hình chính
        setIsAuthenticated(true);
        
        messageApi.open({
          content: 'Thiết lập ảnh đại diện thành công!',
        });

        // Chuyển đến màn hình chính
        navigation.navigate('HomeScreen');
      } else {
        messageApi.open({
          content: response?.data?.message || 'Có lỗi xảy ra khi tải ảnh lên',
        });
      }
    } catch (error) {
      console.error('Lỗi upload avatar:', error);
      messageApi.open({
        content: 'Lỗi kết nối, vui lòng thử lại sau.',
      });
    } finally {
      setUploading(false);
    }
  }, [selectedImage, messageApi, navigation, setUser, setIsAuthenticated]);

  // Hàm bỏ qua bước thiết lập avatar
  const handleSkip = useCallback(async () => {
    // Xóa cờ đánh dấu đã đăng ký
    await AsyncStorage.removeItem('justRegistered');
    
    // Đánh dấu đã xác thực để chuyển sang màn hình chính
    setIsAuthenticated(true);
    
    // Chuyển đến màn hình chính
    navigation.navigate('HomeScreen');
  }, [navigation, setIsAuthenticated]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Zuni</Text>
      <Text style={styles.subtitle}>
        Thiết lập ảnh đại diện {'\n'} để hoàn tất quá trình đăng ký
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Thiết lập ảnh đại diện</Text>

        <View style={styles.avatarContainer}>
          <TouchableOpacity 
            style={styles.avatarButton} 
            onPress={openImagePicker}
            disabled={uploading}
          >
            {selectedImage ? (
              <Image
                source={{uri: selectedImage.uri}}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.plusIcon}>+</Text>
                <Text style={styles.uploadText}>Tải ảnh lên</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (!selectedImage || uploading) && styles.buttonDisabled,
          ]}
          onPress={handleUploadAvatar}
          disabled={!selectedImage || uploading}
        >
          {uploading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.buttonText}>Hoàn tất</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={uploading}
        >
          <Text style={styles.skipText}>Bỏ qua</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e5effa',
    alignItems: 'center',
    padding: 16,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0078FF',
    marginTop: 40,
  },
  subtitle: {
    textAlign: 'center',
    color: '#555',
    marginVertical: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginTop: 16,
    alignItems: 'center',
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 24,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIcon: {
    fontSize: 30,
    color: '#999',
  },
  uploadText: {
    color: '#777',
    fontSize: 14,
    marginTop: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  button: {
    backgroundColor: '#0078FF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  skipButton: {
    marginTop: 16,
    padding: 12,
  },
  skipText: {
    color: '#0078FF',
    fontSize: 16,
  },
});

export default SetupAvatarScreen;
