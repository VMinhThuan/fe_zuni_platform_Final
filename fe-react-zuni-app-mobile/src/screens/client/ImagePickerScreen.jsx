import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';

// Import images
const closeIcon = require('../../assets/images/close_icon.png');
const checkIcon = require('../../assets/images/checkbox_joined.png');
const playIcon = require('../../assets/images/play.jpg');
const warningIcon = require('../../assets/images/warning.png');
const pictureIcon = require('../../assets/images/picture.png');

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width / 3 - 4;

const ImagePickerScreen = ({ route }) => {
  const { maxFileSize, mediaType = 'photo', onSelectMedia } = route.params || {};
  const navigation = useNavigation();
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(null); // null là chưa kiểm tra
  const [loadingMore, setLoadingMore] = useState(false);
  const [endCursor, setEndCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [permissionChecked, setPermissionChecked] = useState(false);

  // Xử lý quyền truy cập thiết bị
  const requestPermission = async () => {
    try {
      if (Platform.OS !== 'android') {
        console.log('Not Android platform, permission granted by default');
        setHasPermission(true);
        return true;
      }

      console.log('Android platform detected, requesting permissions...');
      console.log('Android Version:', Platform.Version);

      // Reset trạng thái quyền truy cập
      setHasPermission(null);

      let granted = false;

      // Android 13 (API 33) trở lên
      if (parseInt(Platform.Version, 10) >= 33) {
        console.log('Using Android 13+ permission model (READ_MEDIA_IMAGES)');

        // Yêu cầu quyền READ_MEDIA_IMAGES
        const imagePermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: 'Quyền truy cập thư viện ảnh',
            message: 'Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh.',
            buttonNeutral: 'Hỏi lại sau',
            buttonNegative: 'Hủy',
            buttonPositive: 'Đồng ý',
          }
        );

        console.log('READ_MEDIA_IMAGES permission result:', imagePermission);
        granted = imagePermission === PermissionsAndroid.RESULTS.GRANTED;

        // Nếu cần quyền video và đã được cấp quyền ảnh
        if (granted && (mediaType === 'video' || mediaType === 'mixed')) {
          console.log('Requesting READ_MEDIA_VIDEO permission');
          const videoPermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
            {
              title: 'Quyền truy cập video',
              message: 'Ứng dụng cần quyền truy cập video để chọn file.',
              buttonNeutral: 'Hỏi lại sau',
              buttonNegative: 'Hủy',
              buttonPositive: 'Đồng ý',
            }
          );
          console.log('READ_MEDIA_VIDEO permission result:', videoPermission);
          granted = videoPermission === PermissionsAndroid.RESULTS.GRANTED;
        }
      } else {
        // Android 12 trở xuống
        console.log('Using Android 12 and below permission model (READ_EXTERNAL_STORAGE)');
        const storagePermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Quyền truy cập thư viện ảnh',
            message: 'Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh.',
            buttonNeutral: 'Hỏi lại sau',
            buttonNegative: 'Hủy',
            buttonPositive: 'Đồng ý',
          }
        );
        console.log('READ_EXTERNAL_STORAGE permission result:', storagePermission);
        granted = storagePermission === PermissionsAndroid.RESULTS.GRANTED;
      }

      console.log('Final permission granted status:', granted);
      setHasPermission(granted);
      setPermissionChecked(true);

      // Nếu không được cấp quyền, thông báo cho người dùng
      if (!granted) {
        console.warn('Permission denied by user');
        setTimeout(() => {
          alert('Bạn cần cấp quyền truy cập thư viện ảnh để sử dụng tính năng này.');
        }, 500);
      }

      return granted;

    } catch (err) {
      console.error('Error requesting storage permission:', err);
      setHasPermission(false);
      setPermissionChecked(true);

      setTimeout(() => {
        alert('Có lỗi khi yêu cầu quyền truy cập. Vui lòng thử lại sau.');
      }, 500);

      return false;
    }
  };

  // Tải ảnh từ thư viện
  const fetchPhotos = async (after = null) => {
    try {
      if (!hasPermission) {
        console.log('Permission not granted, cannot fetch photos');
        return;
      }

      console.log('Fetching photos with mediaType:', mediaType, 'after cursor:', after || 'none');
      setLoading(true);

      // Thử cả hai cách tiếp cận để đảm bảo ít nhất một cách hoạt động
      const params = {
        first: 30, // Giảm xuống để tải nhanh hơn lần đầu
        include: ['filename', 'fileSize', 'imageSize', 'playableDuration'],
        assetType: mediaType === 'video' ? 'Videos' :
          mediaType === 'mixed' ? 'All' : 'Photos',
      };

      // Thêm after cursor nếu có
      if (after) {
        params.after = after;
      }

      console.log('CameraRoll params:', JSON.stringify(params));

      // Trường hợp tải lần đầu, thử với hai phương pháp
      if (!after) {
        try {
          console.log('Attempting with primary method...');
          const result = await CameraRoll.getPhotos(params);
          console.log('Primary method result:', result ? 'success' : 'failed',
            'Photos count:', result?.edges?.length || 0);

          if (result?.edges?.length > 0) {
            setPhotos(result.edges);
            setEndCursor(result.page_info?.end_cursor);
            setHasNextPage(result.page_info?.has_next_page || false);
            setLoading(false);
            setLoadingMore(false);
            return;
          }

          // Nếu không có kết quả, thử phương pháp thứ hai
          console.log('No photos found, trying alternative method...');
          throw new Error('No photos found with primary method');
        } catch (primaryError) {
          console.warn('Primary method failed:', primaryError.message);

          // Phương pháp thứ hai: đơn giản hóa các tham số
          try {
            console.log('Attempting with simplified params...');
            const simpleResult = await CameraRoll.getPhotos({
              first: 20,
              assetType: 'Photos',
            });

            console.log('Simplified method result:', simpleResult ? 'success' : 'failed',
              'Photos count:', simpleResult?.edges?.length || 0);

            if (simpleResult?.edges?.length > 0) {
              setPhotos(simpleResult.edges);
              setEndCursor(simpleResult.page_info?.end_cursor);
              setHasNextPage(simpleResult.page_info?.has_next_page || false);
              setLoading(false);
              setLoadingMore(false);
              return;
            }

            // Nếu vẫn không có kết quả, thử phương pháp thứ ba
            console.log('No photos found with simplified params, trying last resort method...');
            throw new Error('No photos found with simplified method');
          } catch (secondaryError) {
            console.warn('Secondary method failed:', secondaryError.message);

            // Phương pháp cuối cùng: giới hạn về các thuộc tính
            try {
              console.log('Attempting with last resort method...');
              const lastResortResult = await CameraRoll.getPhotos({
                first: 10,
              });

              console.log('Last resort method result:', lastResortResult ? 'success' : 'failed',
                'Photos count:', lastResortResult?.edges?.length || 0);

              if (lastResortResult?.edges?.length > 0) {
                setPhotos(lastResortResult.edges);
                setEndCursor(lastResortResult.page_info?.end_cursor);
                setHasNextPage(lastResortResult.page_info?.has_next_page || false);
              } else {
                console.error('All methods failed to fetch photos');
                setPhotos([]);
              }
            } catch (lastError) {
              console.error('Last resort method failed:', lastError);
              setPhotos([]);
            }
          }
        }
      } else {
        // Load more case (using after cursor)
        try {
          const result = await CameraRoll.getPhotos(params);

          if (result?.edges?.length > 0) {
            setPhotos(prev => [...prev, ...result.edges]);
            setEndCursor(result.page_info?.end_cursor);
            setHasNextPage(result.page_info?.has_next_page || false);
          }
        } catch (error) {
          console.error('Error loading more photos:', error);
        }
      }
    } catch (error) {
      console.error('Unexpected error in fetchPhotos:', error);
      setPhotos([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMorePhotos = () => {
    if (hasNextPage && !loadingMore) {
      setLoadingMore(true);
      fetchPhotos(endCursor);
    }
  };

  // useFocusEffect để kiểm tra quyền truy cập mỗi khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      console.log('ImagePickerScreen focused');

      // Đặt giá trị ban đầu cho loading
      setLoading(true);

      // Safety timeout to prevent infinite loading
      const safetyTimeoutId = setTimeout(() => {
        if (isActive) {
          console.log('Safety timeout reached - resetting loading state');
          setLoading(false);
        }
      }, 15000); // 15 seconds max loading time

      // Đối với Android mới (API 33+), cấu hình CameraRoll với option 'limited' và includeSharedAssets
      if (Platform.OS === 'android' && parseInt(Platform.Version, 10) >= 33) {
        console.log('Configuring CameraRoll for Android 13+');
        // Ghi đè một số cài đặt mặc định nếu cần thiết
        // Đây là một workaround đối với một số thiết bị Android 13+
      }

      const checkPermissionAndFetch = async () => {
        try {
          console.log('Starting permission check and photo fetch process');

          // Đặt timeout để tránh màn hình loading vô hạn
          const timeoutId = setTimeout(() => {
            if (isActive && loading) {
              console.log('Timeout reached, forcing loading state to false');
              setLoading(false);
              if (!permissionChecked) {
                setHasPermission(false);
              }
            }
          }, 10000);  // Tăng thời gian timeout lên 10 giây

          // Đặt lại loading state
          setLoading(true);

          // Yêu cầu quyền truy cập
          const hasPermissionResult = await requestPermission();
          console.log('Permission check result:', hasPermissionResult);

          if (!isActive) {
            console.log('Component not active anymore, stopping');
            clearTimeout(timeoutId);
            return;
          }

          // Nếu đã được cấp quyền truy cập, tải ảnh
          if (hasPermissionResult) {
            console.log('Permission granted, fetching photos');

            // Đảm bảo khởi tạo dữ liệu rõ ràng khi bắt đầu
            setPhotos([]);
            setEndCursor(null);
            setHasNextPage(true);

            fetchPhotos().catch(error => {
              console.error('Error fetching photos after permission granted:', error);

              // Thử lại sau 1 giây nếu lỗi với các tham số đơn giản hơn
              setTimeout(() => {
                if (isActive) {
                  console.log('Retrying fetchPhotos with simplified params...');
                  try {
                    CameraRoll.getPhotos({
                      first: 20,
                      assetType: 'Photos'
                    }).then(result => {
                      if (result?.edges?.length > 0) {
                        console.log('Retry succeeded with', result.edges.length, 'photos');
                        setPhotos(result.edges);
                        setEndCursor(result.page_info?.end_cursor);
                        setHasNextPage(result.page_info?.has_next_page || false);
                      } else {
                        console.log('Retry returned no photos');
                      }
                      setLoading(false);
                    }).catch(retryError => {
                      console.error('Error in simplified retry:', retryError);
                      setLoading(false);
                    });
                  } catch (finalError) {
                    console.error('Fatal error in retry:', finalError);
                    setLoading(false);
                  }
                }
              }, 1000);
            });
          } else {
            console.log('Permission denied, stopping loading');
            setLoading(false);
          }

          clearTimeout(timeoutId);
        } catch (error) {
          console.error('Error in checkPermissionAndFetch:', error);
          if (isActive) {
            setLoading(false);
            setHasPermission(false);
          }
        }
      };

      checkPermissionAndFetch();

      return () => {
        console.log('ImagePickerScreen unfocused');
        isActive = false;
        clearTimeout(safetyTimeoutId);
      };
    }, [])
  );

  const handleSelectPhoto = (photo) => {
    setSelectedPhoto(photo);
  };

  const handleConfirmSelection = () => {
    if (!selectedPhoto) return;

    const node = selectedPhoto.node;

    // Check file size if maxFileSize is provided
    if (maxFileSize && node.image.fileSize > maxFileSize) {
      alert(`File vượt quá kích thước tối đa (${formatFileSize(maxFileSize)})`);
      return;
    }

    const fileType = node.type || 'image/jpeg';
    const isVideo = fileType.includes('video');

    const selectedMedia = {
      uri: node.image.uri,
      type: fileType,
      fileName: node.image.filename || `${isVideo ? 'video' : 'image'}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
      fileSize: node.image.fileSize,
      height: node.image.height,
      width: node.image.width,
      isVideo,
    };

    console.log('Sending selected media back to ChatDetailScreen:', selectedMedia);

    // Nếu đang trong modal (route.params.onSelectMedia tồn tại), gọi callback
    if (route.params?.onSelectMedia) {
      console.log('Using onSelectMedia callback');
      route.params.onSelectMedia(selectedMedia);
      navigation.goBack();
    } else {
      // Nếu là màn hình độc lập, trả về thông qua navigation
      console.log('Navigating back to ChatDetail with selectedMedia');
      navigation.navigate('ChatDetail', { selectedMedia });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Hiển thị màn hình không có ảnh
  const EmptyPhotosView = () => (
    <View style={styles.emptyContainer}>
      <Image source={pictureIcon} style={styles.emptyIcon} />
      <Text style={styles.emptyText}>Không tìm thấy ảnh nào</Text>
      <Text style={styles.emptySubText}>
        Điện thoại của bạn không có ảnh hoặc ứng dụng không có quyền truy cập
      </Text>
      <TouchableOpacity
        style={styles.reloadButton}
        onPress={() => {
          setLoading(true);
          // Yêu cầu quyền truy cập lại và tải ảnh
          requestPermission().then(granted => {
            if (granted) {
              fetchPhotos();
            } else {
              setLoading(false);
            }
          });
        }}
      >
        <Text style={styles.reloadButtonText}>Tải lại</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.addSampleButton}
        onPress={() => {
          setLoading(true);
          requestPermission().then(granted => {
            if (granted) {
              fetchPhotos();
            } else {
              setLoading(false);
            }
          });
        }}
      >
        <Text style={styles.addSampleButtonText}>Hướng dẫn thêm ảnh</Text>
      </TouchableOpacity>
    </View>
  );

  // Hiển thị màn hình loading
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#0068ff" />
        <Text style={styles.loadingText}>Đang tải ảnh...</Text>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Hủy</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Hiển thị màn hình không có quyền truy cập
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <StatusBar barStyle="dark-content" />
        <Image source={warningIcon} style={styles.warningIcon} />
        <Text style={styles.permissionTitle}>Không có quyền truy cập</Text>
        <Text style={styles.permissionText}>
          Ứng dụng cần quyền truy cập thư viện ảnh để hiển thị ảnh của bạn.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={async () => {
            setLoading(true);
            const result = await requestPermission();
            if (result) {
              fetchPhotos();
            } else {
              setLoading(false);
            }
          }}
        >
          <Text style={styles.permissionButtonText}>Cấp quyền</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.permissionButton, styles.backButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Màn hình chọn ảnh
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonHeader}>
          <Image source={closeIcon} style={styles.headerIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mediaType === 'photo' ? 'Chọn ảnh' : mediaType === 'video' ? 'Chọn video' : 'Chọn file'}
        </Text>
        <TouchableOpacity
          onPress={handleConfirmSelection}
          style={[styles.confirmButton, !selectedPhoto && styles.disabledButton]}
          disabled={!selectedPhoto}
        >
          <Text style={styles.confirmButtonText}>Xác nhận</Text>
        </TouchableOpacity>
      </View>

      {photos.length === 0 ? (
        <EmptyPhotosView />
      ) : (
        <FlatList
          data={photos}
          renderItem={({ item }) => {
            const isVideo = item.node.type?.includes('video');
            const isSelected = selectedPhoto && selectedPhoto.node.image.uri === item.node.image.uri;

            return (
              <TouchableOpacity
                style={[styles.imageContainer, isSelected && styles.selectedImageContainer]}
                onPress={() => handleSelectPhoto(item)}
              >
                <Image
                  source={{ uri: item.node.image.uri }}
                  style={styles.image}
                  resizeMode="cover"
                />
                {isVideo && (
                  <View style={styles.videoIndicator}>
                    <Image source={playIcon} style={styles.playIcon} />
                  </View>
                )}
                {isSelected && (
                  <View style={styles.selectedOverlay}>
                    <Image source={checkIcon} style={styles.checkIcon} />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item, index) => `${item.node.image.uri}_${index}`}
          numColumns={3}
          onEndReached={loadMorePhotos}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContainer}
          initialNumToRender={15}
          windowSize={5}
          maxToRenderPerBatch={10}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.loadMoreText}>Đang tải thêm...</Text>
              </View>
            ) : null
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
    height: 56,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
    letterSpacing: 0.3,
  },
  headerIcon: {
    width: 24,
    height: 24,
    tintColor: '#64748b',
  },
  backButtonHeader: {
    padding: 8,
  },
  confirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  listContainer: {
    padding: 2,
  },
  imageContainer: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    margin: 2,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  selectedImageContainer: {
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(37, 99, 235, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    width: 28,
    height: 28,
    tintColor: '#fff',
  },
  videoIndicator: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    width: 14,
    height: 14,
    tintColor: '#fff',
  },
  loadMoreContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  reloadButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    marginBottom: 12,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  reloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addSampleButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  addSampleButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  warningIcon: {
    width: 48,
    height: 48,
    tintColor: '#f97316',
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#f1f5f9',
    shadowOpacity: 0,
  },
  backButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 24,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ImagePickerScreen; 