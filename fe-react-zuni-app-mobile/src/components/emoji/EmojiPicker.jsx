import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";

const EmojiPicker = ({ onSelectEmoji }) => {
  const emojis = [
    "😀",
    "😁",
    "😂",
    "🤣",
    "😃",
    "😄",
    "😅",
    "😆",
    "😉",
    "😊",
    "😋",
    "😎",
    "😍",
    "😘",
    "🥰",
    "😗",
    "😙",
    "😚",
    "🙂",
    "🤗",
    "🤩",
    "🤔",
    "🤨",
    "😐",
    "😑",
    "😶",
    "🙄",
    "😏",
    "😣",
    "😥",
    "😮",
    "🤐",
    "😯",
    "😪",
    "😫",
    "🥱",
    "😴",
    "😌",
    "😛",
    "😜",
    "😝",
    "🤤",
    "😒",
    "😓",
    "😔",
    "😕",
    "🙃",
    "🤑",
    "😲",
    "☹️",
    "🙁",
    "😖",
    "😞",
    "😟",
    "😤",
    "😢",
    "😭",
    "😦",
    "😧",
    "😨",
    "😩",
    "🤯",
    "😬",
    "😰",
    "😱",
    "🥵",
    "🥶",
    "😳",
    "🤪",
    "😵",
    "🥴",
    "😠",
    "😡",
    "🤬",
    "😷",
    "🤒",
    "🤕",
    "🤢",
    "🤮",
    "🤧",
    "😇",
    "🥳",
    "🥺",
    "🤠",
    "🤡",
    "🤥",
    "🤫",
    "🤭",
    "🧐",
    "🤓",
    "😈",
    "👿",
    "👹",
    "👺",
    "💀",
    "👻",
    "👽",
    "🤖",
    "💩",
    "😺",
    "😸",
    "😹",
    "😻",
    "😼",
    "😽",
    "🙀",
    "😿",
    "😾",
    "👍",
    "👎",
    "👏",
    "🙌",
    "👐",
    "🤲",
    "🤝",
    "🙏",
    "✌️",
    "🤞",
    "🤟",
    "🤘",
    "👌",
    "🤏",
    "👈",
    "👉",
    "👆",
    "👇",
    "☝️",
    "👋",
    "🤚",
    "🖐️",
    "✋",
    "🖖",
    "👊",
    "✊",
    "🤛",
    "🤜",
    "🤌",
    "👋",
  ];

  const stickerCategories = [
    { name: "Cảm xúc", icon: "😊" },
    { name: "Động vật", icon: "🐱" },
    { name: "Thức ăn", icon: "🍔" },
    { name: "Hoạt động", icon: "⚽" },
    { name: "Du lịch", icon: "✈️" },
    { name: "Đồ vật", icon: "💡" },
    { name: "Biểu tượng", icon: "💯" },
  ];

  const [activeTab, setActiveTab] = useState("EMOJI");

  const handleEmojiClick = (emoji) => {
    onSelectEmoji(emoji);
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "STICKER" && styles.activeTab]}
          onPress={() => setActiveTab("STICKER")}
        >
          <Text style={[styles.tabText, activeTab === "STICKER" && styles.activeTabText]}>
            STICKER
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "EMOJI" && styles.activeTab]}
          onPress={() => setActiveTab("EMOJI")}
        >
          <Text style={[styles.tabText, activeTab === "EMOJI" && styles.activeTabText]}>
            EMOJI
          </Text>
        </TouchableOpacity>
      </View>

      {/* Nội dung tab */}
      {activeTab === "EMOJI" ? (
        <ScrollView style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>Cảm xúc</Text>
          <View style={styles.emojiGrid}>
            {emojis.map((emoji, index) => (
              <TouchableOpacity
                key={index}
                style={styles.emojiItem}
                onPress={() => handleEmojiClick(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>Danh mục</Text>
          <View style={styles.categoryGrid}>
            {stickerCategories.map((category, index) => (
              <View key={index} style={styles.categoryItem}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={styles.categoryName}>{category.name}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.developmentText}>Tính năng sticker đang được phát triển</Text>
        </ScrollView>
      )}

      {/* Bottom toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolbarButton}>
          <Text style={styles.toolbarIcon}>Z</Text>
        </TouchableOpacity>
        <View style={styles.toolbarIcons}>
          {["😊", "⚙️", "🕶️", "⚽", "✈️", "💡", "❤️"].map((icon, index) => (
            <TouchableOpacity key={index} style={styles.toolbarButton}>
              <Text style={styles.toolbarIcon}>{icon}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.toolbarButton}>
          <Text style={styles.toolbarIcon}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 36,
    right: 0,
    width: 360,
    height: 350,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    flexDirection: "column",
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#3b82f6",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  activeTabText: {
    color: "#3b82f6",
  },
  contentContainer: {
    padding: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
    marginLeft: 4,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  emojiItem: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  emojiText: {
    fontSize: 24,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryItem: {
    width: 80,
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  developmentText: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 14,
    color: "#6b7280",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  toolbarButton: {
    padding: 4,
  },
  toolbarIcons: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  toolbarIcon: {
    fontSize: 20,
    color: "#4b5563",
  },
});

export default EmojiPicker;