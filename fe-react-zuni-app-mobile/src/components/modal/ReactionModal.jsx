import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import Modal from "react-native-modal";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import defaultAvatar from "../../assets/images/defaultAvatar.jpg"; // Use require if needed

const { width } = Dimensions.get("window");

const ReactionModal = ({ isOpen, onClose, data, userDetails = {} }) => {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "all", title: "Tất cả" },
    { key: "heart", title: "Heart" },
  ]);

  if (!isOpen || !data) return null;

  // Calculate total reactions
  const totalReactions = Object.values(data.reactions).reduce(
    (sum, reaction) => sum + reaction.count,
    0
  );

  // Get list of users who reacted
  const reactedUsers = Object.entries(data.reactions).map(([userId, reaction]) => ({
    userId,
    type: reaction.type,
    count: reaction.count,
    ...(userDetails[userId]?.fullName ? userDetails[userId] : null),
  }));

  // Check if userDetails are still loading
  const isLoading = reactedUsers.some((user) => !user.fullName);

  const renderUserList = () => (
    <ScrollView style={styles.userList}>
      {reactedUsers.map((user) => (
        <View key={user.userId} style={styles.userItem}>
          {isLoading ? (
            <View style={styles.skeletonContainer}>
              <ActivityIndicator size="large" color="#000" style={styles.skeletonAvatar} />
              <View style={styles.skeletonText} />
            </View>
          ) : (
            <>
              <Image
                source={{ uri: user.avatar || defaultAvatar }}
                style={styles.avatar}
                resizeMode="cover"
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.fullName || "Đang tải..."}</Text>
              </View>
              <View style={styles.reactionInfo}>
                <FontAwesome name="heart" size={16} color="#ef4444" style={styles.heartIcon} />
                <Text style={styles.reactionCount}>{user.count}</Text>
              </View>
            </>
          )}
        </View>
      ))}
    </ScrollView>
  );

  const renderScene = SceneMap({
    all: renderUserList,
    heart: renderUserList, // Same content for both tabs as per web version
  });

  const renderTabBar = (props) => (
    <TabBar
      {...props}
      indicatorStyle={styles.tabIndicator}
      style={styles.tabBar}
      renderLabel={({ route, focused }) => (
        <View style={styles.tabLabelContainer}>
          {route.key === "heart" && (
            <FontAwesome name="heart" size={16} color="#ef4444" style={styles.tabIcon} />
          )}
          <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
            {route.title} {totalReactions}
          </Text>
        </View>
      )}
    />
  );

  return (
    <Modal
      isVisible={isOpen}
      onBackdropPress={onClose}
      style={styles.modal}
      backdropOpacity={0.3}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Biểu cảm</Text>
        </View>
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width: width - 32 }}
          renderTabBar={renderTabBar}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: "center",
    alignItems: "center",
    margin: 0,
  },
  container: {
    width: 280, // Adjusted from 400px for mobile
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
  },
  header: {
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#00000026",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  tabBar: {
    backgroundColor: "#fff",
  },
  tabIndicator: {
    backgroundColor: "#0068ff",
  },
  tabLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  tabLabelFocused: {
    color: "#0068ff",
  },
  tabIcon: {
    marginRight: 8,
  },
  userList: {
    maxHeight: 400,
    padding: 16,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  skeletonContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  skeletonAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 16,
  },
  skeletonText: {
    width: 160, // Adjusted to fit mobile
    height: 16,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 8,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
  reactionInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  heartIcon: {
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 14,
    color: "#000",
  },
});

export default ReactionModal;