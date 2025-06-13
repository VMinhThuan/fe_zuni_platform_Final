import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  SectionList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from "react-native";
import { getFriendsApi, removeFriendApi } from "../services/api";
import { useCurrentApp } from "../contexts/app.context";
import defaultAvatar from "../assets/images/defaultAvatar.jpg";

const FriendListScreen = () => {
  const { messageApi } = useCurrentApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const fetchFriends = async () => {
    try {
      const res = await getFriendsApi();
      if (res.data?.status) {
        setFriends(res.data?.data || []);
      } else {
        messageApi.error(res.data?.message || "Lỗi khi lấy danh sách bạn bè");
      }
    } catch (err) {
      messageApi.error("Không thể lấy danh sách bạn bè");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const handleRemoveFriend = async () => {
    if (!friendToRemove?.userId) return;
  
    setConfirmLoading(true);
    try {
      const res = await removeFriendApi(friendToRemove.userId);
      if (res.data?.status) {
        messageApi.success(res.data?.message || "Hủy kết bạn thành công");
  
        // ✅ Xoá bạn khỏi danh sách hiển thị ngay lập tức
        setFriends((prev) =>
          prev.filter((friend) => friend.userId !== friendToRemove.userId)
        );
      } else {
        messageApi.error(res.data?.message || "Lỗi khi hủy kết bạn");
      }
    } catch (err) {
      messageApi.error("Không thể hủy kết bạn");
    } finally {
      setConfirmLoading(false);
      setFriendToRemove(null);
      setConfirmVisible(false);
    }
  };
  
  const groupedFriends = friends
    .filter((f) =>
      f.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .reduce((acc, friend) => {
      const letter = friend.fullName.charAt(0).toUpperCase();
      const section = acc.find((s) => s.title === letter);
      if (section) {
        section.data.push(friend);
      } else {
        acc.push({ title: letter, data: [friend] });
      }
      return acc;
    }, [])
    .sort((a, b) => a.title.localeCompare(b.title));

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.info}>
        <Image
          source={{ uri: item.avatar || defaultAvatar }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{item.fullName}</Text>
      </View>
      <TouchableOpacity
        style={styles.moreBtn}
        onPress={() => {
          setFriendToRemove(item);
          setConfirmVisible(true);
        }}
      >
        <Text style={styles.moreText}>⋮</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Bạn bè ({friends.length})</Text>
      <TextInput
        placeholder="Tìm bạn"
        value={searchTerm}
        onChangeText={setSearchTerm}
        style={styles.input}
        placeholderTextColor="#888"
      />

      {groupedFriends.length === 0 ? (
        <Text style={styles.empty}>Chưa có bạn bè nào</Text>
      ) : (
        <SectionList
          sections={groupedFriends}
          keyExtractor={(item) => item.userId}
          renderItem={renderItem}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.section}>{title}</Text>
          )}
        />
      )}

      <Modal
        transparent
        visible={confirmVisible}
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xác nhận hủy kết bạn</Text>
            <Text style={styles.modalMessage}>
              Bạn có chắc chắn muốn hủy kết bạn với{" "}
              <Text style={{ fontWeight: "bold" }}>
                {friendToRemove?.fullName}
              </Text>{" "}
              không?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setConfirmVisible(false)}
              >
                <Text>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleRemoveFriend}
              >
                {confirmLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff" }}>Xác nhận</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default FriendListScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#ebecf0" },
  header: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  input: {
    backgroundColor: "#f1f1f1",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 16,
    color: "#000",
  },
  section: {
    fontWeight: "bold",
    color: "#666",
    marginTop: 12,
    marginBottom: 6,
  },
  item: {
    backgroundColor: "#fff",
    padding: 8,
    marginBottom: 6,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  info: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 28, height: 28, borderRadius: 24, marginRight: 12 },
  name: { fontWeight: "500", fontSize: 12 },
  moreBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#eee",
  },
  moreText: { fontSize: 20, color: "#333" },
  empty: { textAlign: "center", color: "#666", marginTop: 40 },
  loadingWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10 },
  modalMessage: { marginBottom: 16 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#eee",
    borderRadius: 6,
  },
  confirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#d32f2f",
    borderRadius: 6,
  },
});