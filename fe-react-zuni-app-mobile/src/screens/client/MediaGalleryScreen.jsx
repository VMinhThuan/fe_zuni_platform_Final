import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Dimensions, FlatList, Modal, Linking, Platform } from 'react-native';
import { getMessagesApi } from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import defaultAvatar from '../../assets/images/defaultAvatar.jpg';
import arrowLeftIcon from '../../assets/icons/arrowLeftIcon.png';
import reloadIcon from '../../assets/icons/reload.png';
import fileIcon from '../../assets/icons/file.png';
import folderIcon from '../../assets/icons/folder.png';
import filePdfIcon from '../../assets/icons/file-pdf.png';
import fileWordIcon from '../../assets/icons/file-word.png';
import fileExcelIcon from '../../assets/icons/file-excel.png';
import fileArchiveIcon from '../../assets/icons/file-archive.png';

const { width } = Dimensions.get('window');

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const groupByDate = (messages) => {
  const groups = {};
  messages.forEach(msg => {
    const date = new Date(msg.createdAt).toLocaleDateString('vi-VN');
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
  });
  return groups;
};

const getSenderInfo = (msg) => {
  if (msg?.sender && msg?.sender?.name) {
    return {
      id: msg?.sender?.id,
      name: msg?.sender?.name,
      avatar: msg?.sender?.avatar || defaultAvatar,
    };
  }
  return { id: msg?.senderId || '', name: 'Không rõ', avatar: defaultAvatar };
};

const MediaGalleryScreen = ({ route }) => {
  const navigation = useNavigation();
  const { conversationId, tab = 'image' } = route.params;
  const [imageMessages, setImageMessages] = useState([]);
  const [fileMessages, setFileMessages] = useState([]);
  const [activeTab, setActiveTab] = useState(tab);
  const [allSenders, setAllSenders] = useState([]);
  const [selectedSender, setSelectedSender] = useState('all');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMedia = async () => {
    setRefreshing(true);
    const res = await getMessagesApi(conversationId, 200);
    if (res.data?.status && Array.isArray(res.data?.data?.messages)) {
      const allMessages = res.data.data.messages;
      const images = allMessages.filter(msg => {
        if (msg.type === 'image') return true;
        if (msg.type === 'file' && msg.metadata) {
          try {
            const meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
            return meta.isImage || (meta.fileExt && ['jpg','jpeg','png','gif'].includes(meta.fileExt.toLowerCase()));
          } catch { return false; }
        }
        return false;
      });
      const files = allMessages.filter(msg => {
        if (msg.type === 'file' && msg.metadata) {
          try {
            const meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
            return !meta.isImage && meta.fileExt && !['jpg','jpeg','png','gif'].includes(meta.fileExt.toLowerCase());
          } catch { return false; }
        }
        return false;
      });
      setImageMessages(images);
      setFileMessages(files);
      // Lấy danh sách người gửi
      const senders = {};
      allMessages.forEach(msg => {
        const sender = getSenderInfo(msg);
        if (sender?.id && !senders[sender?.id]) {
          senders[sender?.id] = sender;
        }
      });
      setAllSenders(Object.values(senders));
    }
    setRefreshing(false);
  };

  useEffect(() => {
    fetchMedia();
  }, [conversationId]);

  // Lọc theo người gửi
  const filteredImages = useMemo(() => {
    if (selectedSender === 'all') return imageMessages;
    return imageMessages.filter(msg => getSenderInfo(msg).id === selectedSender);
  }, [imageMessages, selectedSender]);
  const filteredFiles = useMemo(() => {
    if (selectedSender === 'all') return fileMessages;
    return fileMessages.filter(msg => getSenderInfo(msg).id === selectedSender);
  }, [fileMessages, selectedSender]);

  const renderImages = () => {
    const groups = groupByDate(filteredImages);
    const imageSize = (width - 8 * 4) / 3; // 3 ảnh, 4 margin (2 bên + 2 giữa)
    return Object.entries(groups).reverse().map(([date, msgs]) => {
      // Chia thành các hàng 3 ảnh
      const rows = [];
      for (let i = 0; i < msgs.length; i += 3) {
        rows.push(msgs.slice(i, i + 3));
      }
      return (
        <View key={date} style={{ marginBottom: 16 }}>
          <Text style={{ fontWeight: 'bold', marginVertical: 8 }}>{date}</Text>
          {rows.map((row, idx) => (
            <View key={idx} style={{ flexDirection: 'row', marginBottom: 8 }}>
              {row.map((msg, j) => (
                <TouchableOpacity
                  key={msg.messageId}
                  onPress={() => setSelectedImage(msg.content)}
                  style={{
                    width: imageSize,
                    height: imageSize,
                    marginLeft: j === 0 ? 0 : 8,
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    source={{ uri: msg.content }}
                    style={{ width: imageSize, height: imageSize, borderRadius: 10 }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
              {/* Nếu thiếu ảnh thì thêm View rỗng để đủ 3 ảnh */}
              {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, k) => (
                <View key={k} style={{ width: imageSize, height: imageSize, marginLeft: 8 }} />
              ))}
            </View>
          ))}
        </View>
      );
    });
  };

  const renderFiles = () => {
    const groups = groupByDate(filteredFiles);
    return Object.entries(groups).reverse().map(([date, msgs]) => (
      <View key={date} style={{ marginBottom: 16 }}>
        <Text style={{ fontWeight: 'bold', marginVertical: 8 }}>{date}</Text>
        {msgs.slice().reverse().map(msg => {
          let meta = {};
          try { meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata; } catch {}
          const isFolder = meta.fileExt === 'folder';
          let icon = fileIcon;
          let tintColor = undefined;
          let resizeMode = 'contain';
          if (isFolder) {
            icon = folderIcon;
            tintColor = '#fbc02d';
          } else if (meta.fileExt) {
            const ext = meta.fileExt.toLowerCase();
            if (ext === 'pdf') { icon = filePdfIcon; }
            else if (['doc', 'docx'].includes(ext)) { icon = fileWordIcon; }
            else if (['xls', 'xlsx'].includes(ext)) { icon = fileExcelIcon; }
            else if (['zip', 'rar'].includes(ext)) { icon = fileArchiveIcon; }
            else { tintColor = '#3497fd'; }
          } else {
            tintColor = '#3497fd';
          }
          const fileName = meta.fileName || 'File';
          const fileSize = meta.fileSize ? formatFileSize(meta.fileSize) : '';
          const sender = getSenderInfo(msg);
          return (
            <TouchableOpacity key={msg.messageId} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' }} onPress={() => setSelectedFile(msg)}>
              <Image source={icon} style={{ width: 32, height: 32, marginRight: 10, resizeMode, ...(tintColor ? { tintColor } : {}) }} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontWeight: '500', fontSize: 15 }}>{fileName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  {fileSize ? <Text style={{ fontSize: 13, color: '#888', marginRight: 8 }}>{fileSize}</Text> : null}
                  <Text style={{ fontSize: 13, color: '#888', marginRight: 8 }}>{sender?.name}</Text>
                  <Text style={{ fontSize: 13, color: '#888' }}>{meta.status === 'downloaded' ? 'Đã có trên máy' : ''}</Text>
                </View>
              </View>
              {/* Nút tải về hoặc trạng thái */}
              {meta.status === 'downloaded' ? (
                <Text style={{ color: '#43a047', fontSize: 13, marginLeft: 8 }}>✔️</Text>
              ) : (
                <TouchableOpacity
                  onPress={async (e) => {
                    e.stopPropagation();
                    if (msg.content) {
                      try {
                        await Linking.openURL(msg.content);
                      } catch {}
                    }
                  }}
                  style={{ marginLeft: 8 }}
                >
                  <Text style={{ color: '#3497fd', fontSize: 18 }}>⬇️</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    ));
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 40, paddingBottom: 12, paddingHorizontal: 12, backgroundColor: '#3497fd' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 8 }}>
          <Image source={arrowLeftIcon} style={{ width: 24, height: 24, tintColor: '#fff' }} />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: 18, fontWeight: '600' }}>Ảnh, file, link</Text>
        <TouchableOpacity onPress={fetchMedia} style={{ padding: 4 }} disabled={refreshing}>
          {refreshing ? (
            <Text style={{ fontSize: 16, color: '#fff' }}>⏳</Text>
          ) : (
            <Image source={reloadIcon} style={{ width: 20, height: 20, tintColor: '#fff' }} />
          )}
        </TouchableOpacity>
      </View>
      {/* Filter row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: '#fff', paddingVertical: 4, paddingLeft: 10, borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: -50, marginTop: 0 }}>
        {/* Filter theo người gửi */}
        <TouchableOpacity onPress={() => setSelectedSender('all')} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: selectedSender === 'all' ? '#e6f0fd' : '#f3f4f6', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6, height: 32 }}>
          <Image source={defaultAvatar} style={{ width: 22, height: 22, borderRadius: 11, marginRight: 4 }} />
          <Text style={{ color: selectedSender === 'all' ? '#3497fd' : '#222', fontWeight: '500', fontSize: 12, textAlign: 'center' }}>Tất cả</Text>
        </TouchableOpacity>
        {allSenders.map(sender => (
          <TouchableOpacity key={sender?.id} onPress={() => setSelectedSender(sender?.id)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: selectedSender === sender?.id ? '#e6f0fd' : '#f3f4f6', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6, height: 32 }}>
            <Image source={sender?.avatar ? { uri: sender?.avatar } : defaultAvatar} style={{ width: 22, height: 22, borderRadius: 11, marginRight: 4 }} />
            <Text style={{ color: selectedSender === sender?.id ? '#3497fd' : '#222', fontWeight: '500', fontSize: 12, textAlign: 'center' }} numberOfLines={1}>{sender?.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Tabs */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff', marginBottom: 0, paddingVertical: 0, height: 44, marginTop: -500}}>
        <TouchableOpacity onPress={() => setActiveTab('image')} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 0, borderBottomWidth: activeTab === 'image' ? 2 : 0, borderBottomColor: '#3497fd' }}>
          <Text style={{ color: activeTab === 'image' ? '#3497fd' : '#888', fontWeight: '500', fontSize: 16 }}>Ảnh</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('file')} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 0, borderBottomWidth: activeTab === 'file' ? 2 : 0, borderBottomColor: '#3497fd' }}>
          <Text style={{ color: activeTab === 'file' ? '#3497fd' : '#888', fontWeight: '500', fontSize: 16 }}>File</Text>
        </TouchableOpacity>
      </View>
      {/* Content */}
      <ScrollView style={{ flex: 1, backgroundColor: '#fff', padding: 8, paddingTop: 0 }}>
        {activeTab === 'image' ? renderImages() : renderFiles()}
      </ScrollView>
      {/* Modal xem ảnh */}
      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setSelectedImage(null)} style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 8 }}>
            <Text style={{ color: '#fff', fontSize: 28 }}>×</Text>
          </TouchableOpacity>
          <Image source={{ uri: selectedImage }} style={{ width: width - 32, height: width - 32, resizeMode: 'contain', borderRadius: 12 }} />
        </View>
      </Modal>
      {/* Modal xem file */}
      <Modal visible={!!selectedFile} transparent animationType="fade" onRequestClose={() => setSelectedFile(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setSelectedFile(null)} style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 8 }}>
            <Text style={{ color: '#fff', fontSize: 28 }}>×</Text>
          </TouchableOpacity>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', maxWidth: width - 48 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>File</Text>
            <Text style={{ fontSize: 16, marginBottom: 18, color: '#222', textAlign: 'center' }} numberOfLines={2}>
              {(() => { try { return JSON.parse(selectedFile?.metadata).fileName || 'File'; } catch { return 'File'; } })()}
            </Text>
            <TouchableOpacity onPress={() => { if(selectedFile?.content) { try { require('react-native').Linking.openURL(selectedFile.content); } catch {} }}} style={{ backgroundColor: '#3497fd', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24 }}>
              <Text style={{ color: '#fff', fontWeight: '500', fontSize: 16 }}>Mở file</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MediaGalleryScreen; 