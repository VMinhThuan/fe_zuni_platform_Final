import React from "react";
import { View, Image, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import Modal from "react-native-modal";
import AntDesign from "react-native-vector-icons/AntDesign";

const { height } = Dimensions.get("window");

const ImageViewModal = ({ isOpen, onClose, imageUrl }) => {
  return (
    <Modal
      isVisible={isOpen}
      onBackdropPress={onClose}
      style={styles.modal}
      backdropOpacity={1}
      backdropColor="#000"
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <AntDesign name="close" size={16} color="#000" />
        </TouchableOpacity>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  closeButton: {
    position: "absolute",
    top: 8,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: height - 120, // Matches max-h-[calc(100vh-120px)]
  },
});

export default ImageViewModal;