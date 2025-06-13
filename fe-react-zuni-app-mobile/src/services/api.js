import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const fallbackBaseUrl = "https://be-zuni-app.onrender.com/";

const axiosClient = axios.create({
  baseURL: fallbackBaseUrl,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  validateStatus: function (status) {
    return status >= 200 && status < 500;
  },
});

// ✅ Interceptor để gắn accessToken vào mỗi request
axiosClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --------- API CALLS ----------

export const registerApi = async (data) => {
  try {
    const res = await axiosClient.post("/v1/api/auth/register", data);
    return res;
  } catch (error) {
    console.log("❌ Lỗi gọi API đăng ký:", error.message);
    if (error.response) {
      console.log("📦 Status:", error.response.status);
      console.log("📦 Data:", error.response.data);
      console.log("📦 Gửi dữ liệu:", data);
    }
    throw error;
  }
};

export const loginApi = async (data) => {
  return axiosClient.post("/v1/api/auth/login", data);
};

export const logoutApi = async () => {
  return axiosClient.post("/v1/api/auth/logout");
};

export const forgotPasswordApi = async (email) => {
  try {
    return await axiosClient.post("/v1/api/auth/forgotPassword", { email });
  } catch (error) {
    console.error("Error in forgotPasswordApi:", error.message);
    throw error;
  }
};

export const verifyResetPasswordTokenApi = async (token) => {
  try {
    return await axiosClient.get(`/v1/api/auth/resetPassword/${token}`);
  } catch (error) {
    console.error("Error in verifyResetPasswordTokenApi:", error.message);
    throw error;
  }
};

export const resetPasswordApi = async (token, password) => {
  try {
    return await axiosClient.post(`/v1/api/auth/resetPassword/${token}`, {
      password,
    });
  } catch (error) {
    console.error("Error in resetPasswordApi:", error.message);
    throw error;
  }
};

export const uploadFileApi = async (formData) => {
  try {
    return await axiosClient({
      method: "post",
      url: "/v1/api/uploads/avatar",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  } catch (error) {
    console.error("Error in uploadFileApi:", error.message);
    return error.response;
  }
};

export const fetchAccountApi = async () => {
  try {
    return await axiosClient.get("/v1/api/auth/account", {
      headers: {
        delay: 1000,
      },
    });
  } catch (error) {
    console.error("Error in fetchAccountApi:", error.message);
    throw error;
  }
};

export const checkEmailExistsApi = async (email) => {
  return axiosClient.get(`/v1/api/auth/email?email=${email}`);
};

export const checkPhoneExistsApi = async (phoneNumber) => {
  return axiosClient.get(`/v1/api/auth/phone?phoneNumber=${phoneNumber}`);
};

export const updateUserApi = async (data) => {
  try {
    return await axiosClient.put("/v1/api/users/", data);
  } catch (error) {
    console.error("Error in updateUserApi:", error.message);
    throw error;
  }
};

export const updatePasswordApi = async (data) => {
  try {
    return await axiosClient.put("/v1/api/users/changePassword", data);
  } catch (error) {
    console.error("Error in updatePasswordApi:", error.message);
    throw error;
  }
};

export const getFriendsApi = () => {
  return axiosClient.get("/v1/api/friends");
};

export const getFriendRequestsApi = () => {
  return axiosClient.get("/v1/api/friends/requests");
};

export const sendFriendRequestApi = (friendId) => {
  return axiosClient.post("/v1/api/friends/request", { friendId });
};

export const acceptFriendRequestApi = (friendId) => {
  return axiosClient.post(`/v1/api/friends/accept/${friendId}`);
};

export const rejectFriendRequestApi = (friendId) => {
  return axiosClient.post(`/v1/api/friends/reject/${friendId}`);
};

export const removeFriendApi = (friendId) => {
  return axiosClient.delete(`/v1/api/friends/${friendId}`);
};

export const searchUserByPhoneApi = (phoneNumber) => {
  return axiosClient.get(`/v1/api/users/search?phoneNumber=${phoneNumber}`);
};

export const getChatListApi = () => {
  return axiosClient.get("/v1/api/chat");
};

export const getUserByIdApi = (userId) => {
  return axiosClient.get(`/v1/api/users/${userId}`);
};

export const checkSentFriendRequestApi = (targetId) => {
  return axiosClient.get(`/v1/api/friends/checkRequest/${targetId}`);
};

export const checkReceivedFriendRequestApi = (targetId) => {
  return axiosClient.get(`/v1/api/friends/checkReceivedRequest/${targetId}`);
};

// Conversation APIs
export const createConversationApi = (data) => {
  return axiosClient.post("/v1/api/conversations", data);
};

export const getConversationsApi = () => {
  return axiosClient.get("/v1/api/conversations");
};

export const getConversationApi = (conversationId) => {
  return axiosClient.get(`/v1/api/conversations/${conversationId}`);
};

export const updateConversationApi = (conversationId, data) => {
  return axiosClient.put(`/v1/api/conversations/${conversationId}`, data);
};

export const deleteConversationApi = (conversationId) => {
  return axiosClient.delete(`/v1/api/conversations/${conversationId}`);
};

export const addParticipantsApi = (conversationId, participants) => {
  return axiosClient.post(`/v1/api/conversations/${conversationId}/participants`, {
    participants,
  });
};

export const removeParticipantsApi = (conversationId, participants) => {
  return axiosClient.delete(`/v1/api/conversations/${conversationId}/participants`, {
    data: { participants },
  });
};

export const getGroupChatsApi = () => {
  return axiosClient.get("/v1/api/conversations/groups");
};

export const uploadGroupAvatarApi = (formData) => {
  try {
    return axiosClient({
      method: "post",
      url: "/v1/api/uploads/groupAvatar",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  } catch (error) {
    console.error("Error in uploadGroupAvatarApi:", error.message);
    return error.response;
  }
};

// Message APIs
export const sendMessageApi = (data) => {
  return axiosClient.post("/v1/api/messages", data);
};

export const getMessagesApi = (
  conversationId,
  limit = 50,
  lastEvaluatedKey
) => {
  let url = `/v1/api/messages/conversation/${conversationId}?limit=${limit}`;
  if (lastEvaluatedKey) {
    url += `&lastEvaluatedKey=${lastEvaluatedKey}`;
  }
  return axiosClient.get(url);
};

export const updateMessageStatusApi = (messageId, status) => {
  return axiosClient.put(`/v1/api/messages/${messageId}/status`, { status });
};

export const deleteMessageApi = (messageId, conversationId) => {
  return axiosClient.delete(`/v1/api/messages/${messageId}`, {
    data: { conversationId },
  });
};

export const markAsReadApi = (conversationId) => {
  return axiosClient.put(`/v1/api/messages/${conversationId}/read`);
};

export const uploadMessageImageApi = (formData) => {
  const maxRetries = 3;
  const retryDelay = 2000; // 2 giây
  
  // Hàm gọi API với retry logic
  const callWithRetry = async (retryCount = 0) => {
    try {
      console.log(`Thực hiện upload ảnh lần ${retryCount + 1}/${maxRetries + 1}`);
      
      return await axiosClient({
        method: "post",
        url: "/v1/api/messages/uploadImage",
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 120000, // 2 phút timeout
        transformRequest: [function (data, headers) {
          // Không chuyển đổi dữ liệu form data
          if (data instanceof FormData) {
            return data;
          }
          return JSON.stringify(data);
        }],
      });
    } catch (error) {
      // Nếu là lỗi network và còn retry attempts
      if (error.message === 'Network Error' && retryCount < maxRetries) {
        console.log(`Lỗi Network, thử lại sau ${retryDelay}ms...`);
        // Đợi một khoảng thời gian trước khi thử lại
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        // Thử lại với retryCount tăng lên
        return callWithRetry(retryCount + 1);
      }
      
      // Nếu hết số lần retry hoặc lỗi khác, ném ra lỗi
      throw error;
    }
  };
  
  // Bắt đầu với retryCount = 0
  return callWithRetry(0);
};

export const uploadMessageFileApi = (formData) => {
  const maxRetries = 3;
  const retryDelay = 2000; // 2 giây
  
  // Hàm gọi API với retry logic
  const callWithRetry = async (retryCount = 0) => {
    try {
      console.log(`Thực hiện upload file lần ${retryCount + 1}/${maxRetries + 1}`);
      
      return await axiosClient({
        method: "post",
        url: "/v1/api/uploads/file",
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30000, // 2 phút timeout
        transformRequest: [function (data, headers) {
          // Không chuyển đổi dữ liệu form data
          if (data instanceof FormData) {
            return data;
          }
          return JSON.stringify(data);
        }],
      });
    } catch (error) {
      // Nếu là lỗi network và còn retry attempts
      if (error.message === 'Network Error' && retryCount < maxRetries) {
        console.log(`Lỗi Network, thử lại sau ${retryDelay}ms...`);
        // Đợi một khoảng thời gian trước khi thử lại
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        // Thử lại với retryCount tăng lên
        return callWithRetry(retryCount + 1);
      }
      
      // Nếu hết số lần retry hoặc lỗi khác, ném ra lỗi
      throw error;
    }
  };
  
  // Bắt đầu với retryCount = 0
  return callWithRetry(0);
};

// Reaction APIs
export const addMessageReactionApi = async (data) => {
  try {
    return await axiosClient.post("/v1/api/reactions", data);
  } catch (error) {
    console.error("Error adding message reaction:", error.message);
    return {
      status: false,
      error: 500,
      message: error.response?.data?.message || "Lỗi khi thêm reaction",
      data: null,
    };
  }
};

export const removeMessageReactionApi = async (messageId, conversationId) => {
  try {
    return await axiosClient.delete(
      `/v1/api/reactions/${messageId}/${conversationId}`
    );
  } catch (error) {
    console.error("Error removing message reaction:", error.message);
    return {
      status: false,
      error: 500,
      message: error.response?.data?.message || "Lỗi khi xóa reaction",
      data: null,
    };
  }
};

export const getMessageReactionsApi = async (messageId) => {
  try {
    return await axiosClient.get(`/v1/api/reactions/${messageId}`);
  } catch (error) {
    console.error("Error getting message reactions:", error.message);
    return {
      status: false,
      error: 500,
      message: error.response?.data?.message || "Lỗi khi lấy reactions",
      data: null,
    };
  }
};

export const getReactionsForMessagesApi = async (messageIds) => {
  try {
    return await axiosClient.post("/v1/api/reactions/batch", {
      messageIds,
    });
  } catch (error) {
    console.error("Error getting reactions for messages:", error.message);
    return {
      status: false,
      error: 500,
      message: error.response?.data?.message || "Lỗi khi lấy reactions",
      data: null,
    };
  }
};

// User Status APIs
export const getUserStatusApi = async (userId) => {
  try {
    return await axiosClient.get(`/v1/api/users/${userId}/status`);
  } catch (error) {
    console.error("Error getting user status:", error.message);
    return {
      status: false,
      message:
        error.response?.data?.message || "Không thể lấy trạng thái người dùng",
    };
  }
};

export const updateUserStatusApi = async (status) => {
  try {
    return await axiosClient.post("/v1/api/users/status", status);
  } catch (error) {
    console.error("Error updating user status:", error.message);
    return {
      status: false,
      message:
        error.response?.data?.message ||
        "Không thể cập nhật trạng thái người dùng",
    };
  }
};

export const leaveGroupApi = (conversationId) => {
  return axiosClient.post(`/v1/api/conversations/${conversationId}/leave`);
};

export { axiosClient }; // 👈 xuất thêm nếu cần dùng trực tiếp client