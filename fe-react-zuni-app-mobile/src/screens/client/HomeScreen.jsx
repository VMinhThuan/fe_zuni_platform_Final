import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Platform, ToastAndroid, Alert } from "react-native";
import ChatListScreen from "../../components/ChatListScreen";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSocket } from "../../contexts/socket.context";
import { useCurrentApp } from "../../contexts/app.context";
import { getConversationsApi } from "../../services/api";

const HomeScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { socket } = useSocket();
  const { user, notificationApi } = useCurrentApp();
  const [isFetching, setIsFetching] = useState(false);
  const [chatList, setChatList] = useState(route.params?.chatList || []);
  const currentChatId = route.params?.id ?? null;
  const [isProcessingMemberLeft, setIsProcessingMemberLeft] = useState(false);

  const fetchConversations = useCallback(async (showError = false) => {
    if (isFetching || !user?.userId) return;
  
    setIsFetching(true);
    try {
      const response = await getConversationsApi();
      if (response.data?.status && Array.isArray(response.data?.data)) {
        const sortedChats = response.data.data.sort((a, b) => {
          const timeA = new Date(a.lastMessageTime || a.createdAt || 0).getTime();
          const timeB = new Date(b.lastMessageTime || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        const formattedChats = sortedChats.map((chat) => {
          let formattedLastMsg = chat.lastMsg;
          if (chat.lastMsg && chat.lastMsg !== "Chưa có tin nhắn") {
            if (chat.type === "group") {
              formattedLastMsg = chat.lastMsg.includes(": ") 
                ? chat.lastMsg 
                : `${chat.lastMsg}`;
            } else {
              if (chat.id === user.userId) {
                formattedLastMsg = `Bạn: ${chat.lastMsg}`;
              }
            }
          }

          return {
            ...chat,
            lastMsg: formattedLastMsg,
            time: new Date(chat.lastMessageTime || chat.createdAt).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            unreadCount: chat.unreadCount || 0,
            type: chat.type || 'single'
          };
        });

        setChatList(formattedChats);
      } else {
        // Không hiển thị warning nữa
        setChatList([]);
      }
    } catch (error) {
      // Chỉ log lỗi ra console để debug, không hiển thị lên UI
      console.log("Debug - Error fetching conversations:", error?.message || error);
      
      // Nếu đang xử lý member-left, giữ nguyên chatList hiện tại
      if (!isProcessingMemberLeft) {
        setChatList([]);
      }
    } finally {
      setIsFetching(false);
    }
  }, [user?.userId, isProcessingMemberLeft]);

  useEffect(() => {
    if (user?.userId) {
      fetchConversations();
    }
  }, [fetchConversations]);

  useEffect(() => {
    if (!socket || !user?.userId) return;

    const handleNewMessage = (data) => {
      try {
        setChatList((prev) => {
          const existingChat = prev.find((chat) => chat.conversationId === data.conversationId);
          if (existingChat) {
            const updatedChat = {
              ...existingChat,
              lastMsg: data.type === "group"
                ? `${data.sender?.name || data.senderName}: ${data.content}`
                : data.sender?.id === user.userId
                ? `Bạn: ${data.content}`
                : data.content,
              time: new Date(data.createdAt).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              unreadCount: existingChat.unreadCount + 1,
            };
            return [
              updatedChat,
              ...prev.filter((chat) => chat.conversationId !== data.conversationId),
            ];
          }
          return prev;
        });
      } catch (error) {
        console.log("Debug - Error handling new message:", error?.message || error);
      }
    };

    const handleMemberLeft = async (data) => {
      try {
        setIsProcessingMemberLeft(true);
        
        if (data.userId === user.userId) {
          // Nếu chính user rời nhóm
          setChatList(prev => {
            const newList = prev.filter(chat => chat.conversationId !== data.conversationId);
            return newList;
          });
        } else if (data.conversation) {
          // Nếu thành viên khác rời nhóm
          setChatList(prev => 
            prev.map(chat => 
              chat.conversationId === data.conversationId
                ? {
                    ...chat,
                    admin: data.conversation.admin,
                    participants: data.conversation.participants,
                    totalMembers: data.conversation.participants.length
                  }
                : chat
            )
          );
        }
      } catch (error) {
        console.log("Debug - Error handling member left:", error?.message || error);
      } finally {
        // Đợi một chút trước khi reset flag và fetch lại
        setTimeout(() => {
          setIsProcessingMemberLeft(false);
        }, 1000);
      }
    };

    const handleMemberRemoved = (data) => {
      try {
        if (data.removedMembers.includes(user.userId)) {
          // Nếu người dùng hiện tại bị xóa khỏi nhóm
          setChatList(prev => 
            prev.filter(chat => chat.conversationId !== data.conversationId)
          );
          
          // Hiển thị thông báo
          Platform.OS === 'android'
            ? ToastAndroid.show('Bạn đã bị xóa khỏi nhóm!', ToastAndroid.SHORT)
            : Alert.alert('Thông báo', 'Bạn đã bị xóa khỏi nhóm!');
        }
      } catch (error) {
        console.log("Debug - Error handling member removed:", error?.message || error);
      }
    };

    socket.on("receive-message", handleNewMessage);
    socket.on("member-left", handleMemberLeft);
    socket.on("member-removed", handleMemberRemoved);

    return () => {
      socket.off("receive-message", handleNewMessage);
      socket.off("member-left", handleMemberLeft);
      socket.off("member-removed", handleMemberRemoved);
    };
  }, [socket, user?.userId]);

  return (
    <View style={styles.container}>
      <ChatListScreen
        navigation={navigation}
        chatList={chatList}
        currentChatId={currentChatId}
        notificationApi={notificationApi}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});

export default HomeScreen;