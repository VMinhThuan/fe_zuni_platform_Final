import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Image,
  PermissionsAndroid,
  SafeAreaView,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/AntDesign';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome5';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import * as DocumentPicker from '@react-native-documents/picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCurrentApp } from '../../contexts/app.context';
import { useSocket } from '../../contexts/socket.context';
import { FileSystem } from 'react-native-file-access';
import { uploadMessageFileApi, sendMessageApi } from '../../services/api';

const FILE_TYPES = {
  pdf: { icon: 'file-pdf', color: '#ef4444' },
  doc: { icon: 'file-word', color: '#3b82f6' },
  docx: { icon: 'file-word', color: '#3b82f6' },
  xls: { icon: 'file-excel', color: '#16a34a' },
  xlsx: { icon: 'file-excel', color: '#16a34a' },
  ppt: { icon: 'file-powerpoint', color: '#f97316' },
  pptx: { icon: 'file-powerpoint', color: '#f97316' },
  txt: { icon: 'file-alt', color: '#3b82f6' },
  zip: { icon: 'file-archive', color: '#eab308' },
  rar: { icon: 'file-archive', color: '#9333ea' },
  mp3: { icon: 'file-audio', color: '#9333ea' },
  mp4: { icon: 'file-video', color: '#9333ea' },
  image: { icon: 'file-image', color: '#16a34a' },
  default: { icon: 'file', color: '#6b7280' },
};

const FilePickerScreen = ({ route }) => {
  const { maxFileSize = 30 * 1024 * 1024, onSelectMedia } = route.params || {};
  const navigation = useNavigation();
  const { notificationApi, currentUser = {} } = useCurrentApp();
  const { socket } = useSocket();
  const [isLoading, setIsLoading] = useState(false);
  const [recentFiles, setRecentFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    console.log('FilePickerScreen - currentUser:', currentUser);
  }, [currentUser]);

  const requestPermission = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      let permission;
      if (Platform.Version >= 33) {
        permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
      } else {
        permission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      }

      const granted = await PermissionsAndroid.request(permission, {
        title: 'Quyền truy cập tệp tin',
        message: 'Ứng dụng cần quyền truy cập tệp tin để chọn file.',
        buttonNeutral: 'Hỏi lại sau',
        buttonNegative: 'Hủy',
        buttonPositive: 'Đồng ý',
      });
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Error requesting storage permission:', err);
      return false;
    }
  };

  const fetchRecentMedia = async () => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        notificationApi.error({ message: 'Không có quyền truy cập thư viện' });
        return;
      }

      setIsLoading(true);
      const result = await CameraRoll.getPhotos({
        first: 20,
        assetType: 'All',
        include: ['filename', 'fileSize', 'imageSize'],
      });

      const mediaFiles = result.edges
        .map(edge => {
          const uri = edge.node.image.uri;
          const filename = edge.node.image.filename || 'unknown';
          const fileSize = edge.node.image.fileSize || 0;
          const type = edge.node.type || (filename.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');
          const isVideo = type.startsWith('video');

          if (fileSize > maxFileSize) {
            return null;
          }

          return {
            uri,
            filename,
            fileSize,
            type,
            isVideo,
            width: edge.node.image.width,
            height: edge.node.image.height,
          };
        })
        .filter(Boolean);

      setRecentFiles(mediaFiles);
    } catch (error) {
      console.error('Error fetching recent files:', error);
      notificationApi.error({ message: 'Không thể tải tệp tin gần đây' });
    } finally {
      setIsLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      setIsLoading(true);

      // Sử dụng @react-native-documents/picker
      const result = await DocumentPicker.pick({
        allowMultiSelection: false,
      });
      
      if (!result || result.length === 0) {
        return;
      }
      
      const file = result[0];
      const fileUri = file.uri;
      const fileName = file.name || 'unknownfile';
      const fileSize = file.size;
      const fileExt = fileName.split('.').pop().toLowerCase();
      const mimeType = file.type || getMimeType(fileExt);

      console.log('Picked document details:', {
        uri: fileUri,
        name: fileName,
        size: fileSize,
        type: mimeType
      });

      if (fileSize > maxFileSize) {
        notificationApi.error({
          message: `Tệp tin quá lớn (tối đa ${formatFileSize(maxFileSize)})`,
        });
        return;
      }

      const isImage = mimeType.startsWith('image') || ['jpg', 'jpeg', 'png', 'gif'].includes(fileExt);
      const isVideo = mimeType.startsWith('video') || ['mp4', 'mov', 'avi'].includes(fileExt);
      const isAudio = mimeType.startsWith('audio') || ['mp3', 'wav', 'ogg'].includes(fileExt);

      const selectedFile = {
        uri: fileUri,
        fileName,
        fileSize,
        type: mimeType,
        isImage,
        isVideo,
        isAudio,
        fileExt,
      };

      console.log('Setting selected file with URI:', selectedFile.uri);
      setSelectedFile(selectedFile);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // Người dùng đã hủy lựa chọn
        console.log('Người dùng đã hủy chọn tệp');
      } else {
        console.error('Lỗi khi chọn file:', err);
        notificationApi.error({ message: 'Không thể chọn tệp tin: ' + err.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm ánh xạ phần mở rộng tệp sang MIME type
  const getMimeType = (ext) => {
    const mimeTypes = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      mp3: 'audio/mpeg',
      mp4: 'video/mp4',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  };

  const handleConfirmSelection = useCallback(async () => {
    if (!selectedFile) {
      notificationApi.error({ message: 'Vui lòng chọn một tệp tin' });
      return;
    }
    const { conversationId, senderId, receiverId } = route.params || {};
    if (!conversationId || !senderId) {
      notificationApi.error({ message: 'Thiếu thông tin cuộc trò chuyện hoặc người gửi!' });
      setIsLoading(false);
      setUploadProgress(0);
      return;
    }
    try {
      setIsLoading(true);
      setUploadProgress(0);
      const fileToUpload = { ...selectedFile };
      let filePath = fileToUpload.uri;
      if (
        Platform.OS === 'android' &&
        !filePath.startsWith('file://') &&
        !filePath.startsWith('content://')
      ) {
        filePath = `file://${filePath}`;
      }

      const fileObj = {
        uri: filePath,
        name: fileToUpload.fileName,
        type: fileToUpload.type || 'application/octet-stream',
      };
      console.log('Uploading file:', fileObj);

      const formData = new FormData();
      formData.append('file', fileObj, fileToUpload.fileName);

      const response = await uploadMessageFileApi(formData);
      console.log('Upload response:', response.data);
      if (response?.data && response.data?.status === true) {
        const result = response.data?.data;
        // Gọi API gửi message
        const messagePayload = {
          conversationId: String(conversationId),
          senderId: String(currentUser?.userId || senderId),
          receiverId: receiverId ? String(receiverId) : null,
          type: 'file',
          content: result.url,
          metadata: JSON.stringify({
            fileName: fileToUpload.fileName,
            fileSize: result.fileSize,
            mimeType: result.type,
            fileExt: fileToUpload.fileExt,
            originalUpload: true,
            messageText: '',
            width: 0,
            height: 0,
            timestamp: Date.now(),
            isImage: false,
            isVideo: false,
            isAudio: false,
          }),
        };
        const messageRes = await sendMessageApi(messagePayload);
        if (messageRes?.data?.status === true) {
          // Thêm phát sự kiện socket để đảm bảo cập nhật realtime
          if (socket?.connected) {
            const userId = currentUser?.userId || senderId;
            const senderObj = {
              id: userId,
              name: currentUser?.fullName || 'Người dùng',
              avatar: currentUser?.avatar ? currentUser.avatar : '',
            };
            socket.emit('send-message', {
              ...messageRes.data.data,
              conversationId: String(conversationId),
              senderId: String(userId),
              receiverId: receiverId ? String(receiverId) : null,
              type: 'file',
              content: result.url,
              sender: senderObj,
              metadata: messagePayload.metadata,
            });
            socket.emit('send-message-success', {
              ...messageRes.data.data,
              conversationId: String(conversationId),
              senderId: String(userId),
              receiverId: receiverId ? String(receiverId) : null,
              type: 'file',
              content: result.url,
              sender: senderObj,
              metadata: messagePayload.metadata,
            });
          }
          
          // Truyền message về callback nếu có
          if (route.params?.onSendMessage && typeof route.params.onSendMessage === 'function') {
            route.params.onSendMessage(messageRes.data.data);
            navigation.goBack();
          } else {
            navigation.goBack();
          }
        } else {
          notificationApi.error({ message: 'Gửi tin nhắn thất bại' });
        }
      } else {
        console.log('Upload error detail:', response?.data);
        notificationApi.error({
          message: 'Gửi file thất bại: ' + (response?.data?.message || 'Unknown error'),
        });
      }
    } catch (error) {
      setIsLoading(false);
      setUploadProgress(0);
      console.log('Upload exception:', error, error?.response);
      notificationApi.error({
        message:
          'Lỗi khi upload file: ' +
          (error?.response?.data?.message ||
            error?.message ||
            'Unknown error'),
      });
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  }, [selectedFile, navigation, notificationApi, route.params, socket, currentUser]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    if (file.isImage) return FILE_TYPES.image;
    if (file.isVideo) return FILE_TYPES.mp4;
    if (file.isAudio) return FILE_TYPES.mp3;

    const fileExt = file.fileExt?.toLowerCase() || file.fileName?.split('.').pop().toLowerCase();
    return FILE_TYPES[fileExt] || FILE_TYPES.default;
  };

  const renderSelectedFile = () => {
    if (!selectedFile) return null;

    const fileIcon = getFileIcon(selectedFile);

    if (selectedFile.isImage) {
      return (
        <View style={styles.selectedFileContainer}>
          <Image
            source={{ uri: selectedFile.uri }}
            style={styles.selectedImage}
            resizeMode="contain"
            onError={() => {
              setImageError(true);
            }}
          />
          {imageError && <Text style={styles.errorText}>Ảnh không tồn tại hoặc đã bị xóa!</Text>}
          <View style={styles.fileInfo}>
            <Text style={styles.fileName}>{selectedFile.fileName}</Text>
            <Text style={styles.fileSize}>{formatFileSize(selectedFile.fileSize)}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.selectedFileContainer}>
        <View style={styles.fileIconContainer}>
          <FontAwesomeIcon name={fileIcon.icon} size={48} color={fileIcon.color} />
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName}>{selectedFile.fileName}</Text>
          <Text style={styles.fileSize}>{formatFileSize(selectedFile.fileSize)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrowleft" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chọn tệp tin</Text>
        <TouchableOpacity
          onPress={handleConfirmSelection}
          disabled={!selectedFile || isLoading}
          style={[styles.sendButton, (!selectedFile || isLoading) && styles.disabledButton]}
        >
          {isLoading ? (
            <View style={styles.uploadProgressContainer}>
              <ActivityIndicator size="small" color="#fff" />
             
            </View>
          ) : (
            <Text style={[styles.sendButtonText, (!selectedFile || isLoading) && styles.disabledButtonText]}>
              Gửi
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Icon name="search1" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm tệp tin"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <TouchableOpacity style={styles.browseButton} onPress={pickDocument}>
        <MaterialIcon name="file-upload" size={24} color="#fff" />
        <Text style={styles.browseButtonText}>Chọn tệp từ thiết bị</Text>
      </TouchableOpacity>

      {renderSelectedFile()}

      <View style={styles.sectionTitle}>
        <Text style={styles.sectionTitleText}>Tệp tin gần đây</Text>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0068ff" />
        </View>
      ) : (
        <FlatList
          data={recentFiles}
          keyExtractor={(item, index) => `${item.uri}_${index}`}
          numColumns={3}
          renderItem={({ item }) => {
            if (item.isVideo) {
              return (
                <TouchableOpacity
                  style={styles.mediaItem}
                  onPress={() =>
                    setSelectedFile({
                      uri: item.uri,
                      fileName: item.filename || 'video.mp4',
                      fileSize: item.fileSize,
                      type: item.type,
                      isVideo: true,
                      width: item.width,
                      height: item.height,
                      fileExt: 'mp4',
                    })
                  }
                >
                  <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                  <View style={styles.videoIndicator}>
                    <MaterialIcon name="play" size={20} color="#fff" />
                  </View>
                  {selectedFile?.uri === item.uri && (
                    <View style={styles.selectedOverlay}>
                      <Icon name="check" size={24} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                style={styles.mediaItem}
                onPress={() =>
                  setSelectedFile({
                    uri: item.uri,
                    fileName: item.filename || 'image.jpg',
                    fileSize: item.fileSize,
                    type: item.type,
                    isImage: true,
                    width: item.width,
                    height: item.height,
                    fileExt: item.filename?.split('.').pop().toLowerCase() || 'jpg',
                  })
                }
              >
                <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                {selectedFile?.uri === item.uri && (
                  <View style={styles.selectedOverlay}>
                    <Icon name="check" size={24} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcon name="file-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>Không tìm thấy tệp tin nào</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0068ff',
    borderRadius: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#e5e7eb',
  },
  disabledButtonText: {
    color: '#9ca3af',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
     borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0068ff',
    margin: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  selectedFileContainer: {
    margin: 16,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  fileIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  fileSize: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaItem: {
    flex: 1,
    margin: 2,
    position: 'relative',
    aspectRatio: 1,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 104, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 8,
  },
  uploadProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadProgressText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
});

export default FilePickerScreen;