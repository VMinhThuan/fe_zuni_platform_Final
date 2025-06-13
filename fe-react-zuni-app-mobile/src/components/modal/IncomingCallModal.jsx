import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  SafeAreaView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Sound from 'react-native-sound';

const defaultAvatar = 'https://secure.gravatar.com/avatar/d41d8cd98f00b204e9800998ecf8427e?s=150&r=g&d=mm';
const ringtonePath = require('../../assets/audio/nhacChuongZuni.mp3');

const IncomingCallModal = ({ incomingCall, onAccept, onReject }) => {
  const ringtoneRef = useRef(null);

  useEffect(() => {
    if (incomingCall) {
      // Phát nhạc chuông khi có cuộc gọi đến
      ringtoneRef.current = new Sound(ringtonePath, Sound.MAIN_BUNDLE, (error) => {
        if (!error) {
          ringtoneRef.current.setNumberOfLoops(-1); // Lặp vô hạn
          ringtoneRef.current.setVolume(1.0);
          ringtoneRef.current.play();
        }
      });
    } else {
      // Dừng nhạc chuông khi modal đóng
      if (ringtoneRef.current) {
        ringtoneRef.current.stop(() => {
          ringtoneRef.current.release();
        });
        ringtoneRef.current = null;
      }
    }
    // Cleanup khi unmount
    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.stop(() => {
          ringtoneRef.current.release();
        });
        ringtoneRef.current = null;
      }
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const handleAccept = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.stop(() => {
        ringtoneRef.current.release();
      });
      ringtoneRef.current = null;
    }
    onAccept(incomingCall);
  };

  const handleReject = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.stop(() => {
        ringtoneRef.current.release();
      });
      ringtoneRef.current = null;
    }
    onReject(incomingCall);
  };

  return (
    <Modal
      visible={!!incomingCall}
      transparent={true}
      animationType="fade"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Image
            source={{ uri: incomingCall.fromAvatar || defaultAvatar }}
            style={styles.avatar}
          />
          <Text style={styles.callerName}>{incomingCall.fromName}</Text>
          <Text style={styles.callingText}>đang gọi video cho bạn</Text>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.callButton, styles.acceptButton]}
              onPress={handleAccept}
            >
              <Ionicons name="videocam" size={24} color="white" />
              <Text style={styles.buttonText}>Chấp nhận</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.callButton, styles.rejectButton]}
              onPress={handleReject}
            >
              <MaterialIcons name="call-end" size={24} color="white" />
              <Text style={styles.buttonText}>Từ chối</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  callerName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  callingText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    width: '45%',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
});

export default IncomingCallModal; 
