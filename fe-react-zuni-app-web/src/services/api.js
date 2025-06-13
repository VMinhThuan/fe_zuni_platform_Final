import createInstanceAxios from "./axios.customize";

const axios = createInstanceAxios(import.meta.env.VITE_BACKEND_URL);

export const registerApi = (data) => {
  return axios.post("/v1/api/auth/register", data);
};

export const loginApi = (data) => {
  return axios.post("/v1/api/auth/login", data);
};

export const logoutApi = () => {
  return axios.post("/v1/api/auth/logout");
};

export const forgotPasswordApi = (email) => {
  return axios.post("/v1/api/auth/forgotPassword", { email });
};

export const verifyResetPasswordTokenApi = (token) => {
  return axios.get(`/v1/api/auth/resetPassword/${token}`);
};

export const resetPasswordApi = (token, password) => {
  return axios.post(`/v1/api/auth/resetPassword/${token}`, {
    password,
  });
};

export const uploadFileApi = (formData) => {
  try {
    return axios({
      method: "post",
      url: "/v1/api/uploads/avatar",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  } catch (error) {
    return error.response;
  }
};

export const fetchAccountApi = () => {
  return axios.get("/v1/api/auth/account", {
    headers: {
      delay: 1000,
    },
  });
};

export const checkEmailExistsApi = (email) => {
  return axios.get(`/v1/api/auth/email?email=${email}`);
};

export const checkPhoneExistsApi = (phoneNumber) => {
  return axios.get(`/v1/api/auth/phone?phoneNumber=${phoneNumber}`);
};

export const updateUserApi = (data) => {
  return axios.put("/v1/api/users/", data);
};

export const updatePasswordApi = (data) => {
  return axios.put("/v1/api/users/changePassword", data);
};

export const getFriendsApi = () => {
  return axios.get("/v1/api/friends");
};

export const getFriendRequestsApi = () => {
  return axios.get("/v1/api/friends/requests");
};

export const sendFriendRequestApi = (friendId) => {
  return axios.post("/v1/api/friends/request", { friendId });
};

export const acceptFriendRequestApi = (friendId) => {
  return axios.post(`/v1/api/friends/accept/${friendId}`);
};

export const rejectFriendRequestApi = (friendId) => {
  return axios.post(`/v1/api/friends/reject/${friendId}`);
};

export const removeFriendApi = (friendId) => {
  return axios.delete(`/v1/api/friends/${friendId}`);
};

export const searchUserByPhoneApi = (phoneNumber) => {
  return axios.get(`/v1/api/users/search?phoneNumber=${phoneNumber}`);
};

export const getChatListApi = () => {
  return axios.get("/v1/api/chat");
};

export const getUserByIdApi = (userId) => {
  return axios.get(`/v1/api/users/${userId}`);
};

export const checkSentFriendRequestApi = (targetId) => {
  return axios.get(`/v1/api/friends/checkRequest/${targetId}`);
};

export const checkReceivedFriendRequestApi = (targetId) => {
  return axios.get(`/v1/api/friends/checkReceivedRequest/${targetId}`);
};

// Conversation APIs
export const createConversationApi = (data) => {
  return axios.post("/v1/api/conversations", data);
};

export const getConversationsApi = () => {
  return axios.get("/v1/api/conversations");
};

export const getConversationApi = (conversationId) => {
  return axios.get(`/v1/api/conversations/${conversationId}`);
};

export const updateConversationApi = (conversationId, data) => {
  return axios.put(`/v1/api/conversations/${conversationId}`, data);
};

export const deleteConversationApi = (conversationId) => {
  return axios.delete(`/v1/api/conversations/${conversationId}`);
};

export const addParticipantsApi = (conversationId, participants) => {
  return axios.post(`/v1/api/conversations/${conversationId}/participants`, {
    participants,
  });
};

export const removeParticipantsApi = (conversationId, participants) => {
  return axios.delete(`/v1/api/conversations/${conversationId}/participants`, {
    data: { participants },
  });
};

export const sendMessageApi = (data) => {
  return axios.post("/v1/api/messages", data);
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
  return axios.get(url);
};

export const updateMessageStatusApi = (messageId, status) => {
  return axios.put(`/v1/api/messages/${messageId}/status`, { status });
};

export const deleteMessageApi = (messageId, conversationId) => {
  return axios.delete(`/v1/api/messages/${messageId}`, {
    data: { conversationId },
  });
};

export const markAsReadApi = (conversationId) => {
  return axios.put(`/v1/api/messages/${conversationId}/read`);
};

export const uploadMessageImageApi = (formData) => {
  return axios({
    method: "post",
    url: "/v1/api/messages/uploadImage",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const uploadMessageFileApi = (formData) => {
  return axios({
    method: "post",
    url: "/v1/api/uploads/file",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const addMessageReactionApi = async (data) => {
  try {
    return await axios.post("/v1/api/reactions", data);
  } catch (error) {
    console.error("Error adding message reaction:", error);
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
    return await axios.delete(
      `/v1/api/reactions/${messageId}/${conversationId}`
    );
  } catch (error) {
    console.error("Error removing message reaction:", error);
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
    return await axios.get(`/v1/api/reactions/${messageId}`);
  } catch (error) {
    console.error("Error getting message reactions:", error);
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
    return await axios.post("/v1/api/reactions/batch", {
      messageIds,
    });
  } catch (error) {
    console.error("Error getting reactions for messages:", error);
    return {
      status: false,
      error: 500,
      message: error.response?.data?.message || "Lỗi khi lấy reactions",
      data: null,
    };
  }
};

export const getUserStatusApi = async (userId) => {
  try {
    return await axios.get(`/v1/api/users/${userId}/status`);
  } catch (error) {
    console.error("Error getting user status:", error);
    return {
      status: false,
      message:
        error.response?.data?.message || "Không thể lấy trạng thái người dùng",
    };
  }
};

export const updateUserStatusApi = async (status) => {
  try {
    return await axios.post("/v1/api/users/status", status);
  } catch (error) {
    console.error("Error updating user status:", error);
    return {
      status: false,
      message:
        error.response?.data?.message ||
        "Không thể cập nhật trạng thái người dùng",
    };
  }
};

export const getGroupChatsApi = () => {
  return axios.get("/v1/api/conversations/groups");
};

export const uploadGroupAvatarApi = (formData) => {
  try {
    return axios({
      method: "post",
      url: "/v1/api/uploads/groupAvatar",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  } catch (error) {
    console.error("Error uploading group avatar:", error);
    return error.response;
  }
};

export const leaveGroupApi = (conversationId) => {
  return axios.post(`/v1/api/conversations/${conversationId}/leave`);
};
