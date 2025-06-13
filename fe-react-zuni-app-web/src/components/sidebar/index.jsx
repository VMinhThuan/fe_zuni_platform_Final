import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaRegCommentDots,
  FaUserFriends,
  FaRegCheckSquare,
  FaCloudUploadAlt,
  FaCloud,
  FaBriefcase,
  FaCog,
  FaUser,
  FaGlobe,
  FaDatabase,
  FaQuestionCircle,
} from "react-icons/fa";
import { Badge } from "antd";
import { HiOutlineArrowTopRightOnSquare } from "react-icons/hi2";
import { logoutApi, getFriendRequestsApi } from "../../services/api";
import { useCurrentApp } from "../../contexts/app.context";
import { useSocket } from "../../contexts/socket.context";
import defaultAvatar from "../../assets/images/defaultAvatar.jpg";
import InfoModal from "../modal/info.modal";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const { setIsAuthenticated, user, setUser, setIsAppLoading, messageApi } =
    useCurrentApp();
  const { socket } = useSocket();
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const settingsRef = useRef(null);
  const profileRef = useRef(null);

  const getFriendRequests = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        return;
      }

      const res = await getFriendRequestsApi();

      if (res?.status && Array.isArray(res.data)) {
        const count = res.data.length;
        setFriendRequestCount(count);
      } else {
        console.error("Sidebar - Response không hợp lệ:", res);
        setFriendRequestCount(0);
      }
    } catch (error) {
      console.error("Sidebar - Lỗi khi lấy lời mời kết bạn:", error);
      setFriendRequestCount(0);
    }
  }, []);

  // Xử lý socket events
  useEffect(() => {
    if (!socket) {
      console.log("Sidebar - Socket chưa được khởi tạo");
      return;
    }

    const handleFriendRequestReceived = () => {
      console.log("Sidebar - Nhận được lời mời kết bạn mới");
      getFriendRequests();
    };

    const handleFriendRequestAccepted = () => {
      console.log("Sidebar - Lời mời kết bạn được chấp nhận");
      getFriendRequests();
    };

    const handleFriendRequestRejected = () => {
      console.log("Sidebar - Lời mời kết bạn bị từ chối");
      getFriendRequests();
    };

    const handleSendFriendRequest = () => {
      console.log("Sidebar - Đã gửi lời mời kết bạn");
      getFriendRequests();
    };

    // Đăng ký lắng nghe các event
    socket.on("friend-request-received", handleFriendRequestReceived);
    socket.on("friend-request-accepted", handleFriendRequestAccepted);
    socket.on("friend-request-rejected", handleFriendRequestRejected);
    socket.on("send-friend-request", handleSendFriendRequest);

    // Thêm event listener cho connect và disconnect để debug
    socket.on("connect", () => {
      console.log("Sidebar - Socket đã kết nối:", socket.id);
      getFriendRequests();
    });

    socket.on("disconnect", () => {
      console.log("Sidebar - Socket đã ngắt kết nối");
    });

    // Cleanup function
    return () => {
      socket.off("friend-request-received", handleFriendRequestReceived);
      socket.off("friend-request-accepted", handleFriendRequestAccepted);
      socket.off("friend-request-rejected", handleFriendRequestRejected);
      socket.off("send-friend-request", handleSendFriendRequest);
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [socket, getFriendRequests]);

  // Lấy số lượng lời mời kết bạn ban đầu khi component mount và khi socket kết nối
  useEffect(() => {
    if (socket?.connected) {
      getFriendRequests();
    }
  }, [socket?.connected, getFriendRequests]);

  const isActive = (path) => {
    if (!path) return false;
    // Nếu là trang chat thì chỉ active icon chat
    if (path === "/") {
      return location.pathname === "/" || location.pathname.startsWith("/chat");
    }
    // Nếu không thì kiểm tra khớp path đúng 100%
    return location.pathname === path;
  };

  const commingSoonAlert = () => {
    messageApi.info("Chức năng đang phát triển. Vui lòng chờ đợi!");
  };

  const menus = [
    { icon: <FaRegCommentDots size={24} />, path: "/" },
    {
      icon: (
        <div className="relative w-full h-full flex items-center justify-center">
          <FaUserFriends
            className="absolute"
            style={{
              transform: "translate(50%, -50%)",
              top: "50%",
              right: "50%",
            }}
            size={24}
          />
          {friendRequestCount > 0 && (
            <Badge
              count={friendRequestCount}
              className="absolute"
              style={{
                backgroundColor: "#ff4d4f",
                transform: "translate(50%, -50%)",
                top: "-2px",
                right: "0",
              }}
            />
          )}
        </div>
      ),
      path: "/friends",
      onClick: () => {
        navigate("/friends", {
          state: { shouldUpdateCount: true },
        });
      },
    },
    { icon: <FaRegCheckSquare size={24} />, onClick: commingSoonAlert },
    { divider: true },
    { icon: <FaCloudUploadAlt size={24} />, onClick: commingSoonAlert },
    { icon: <FaCloud size={24} />, path: "/cloud" },
    { icon: <FaBriefcase size={24} />, onClick: commingSoonAlert },
  ];

  const updateSidebarFriendRequests = () => {
    getFriendRequests();
  };

  // Đăng ký hàm với window object để có thể gọi từ các component khác
  window.updateSidebarFriendRequests = updateSidebarFriendRequests;

  const handleLogout = async () => {
    setIsAppLoading(true);
    try {
      const res = await logoutApi();
      if (res?.status && res.error === 0) {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem("accessToken");
        socket?.disconnect();
        messageApi.open({
          type: "success",
          content: "Đăng xuất thành công!",
        });
        navigate("/login");
      }
    } catch (error) {
      messageApi.error({
        type: "error",
        content: "Đã có lỗi xảy ra trong quá trình đăng xuất.",
      });
      console.log(error);
    }
    setIsAppLoading(false);
  };

  const handleShowInfoModal = () => {
    setIsInfoModalOpen(true);
    setShowProfile(false);
    setShowSettings(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }

      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div className="w-16 bg-[#005ae0] text-white flex flex-col items-center pt-8 relative">
        <div className="relative">
          <img
            src={user?.avatar || defaultAvatar}
            alt="avatar"
            onClick={() => setShowProfile((prev) => !prev)}
            className="w-12 h-12 rounded-full mb-6 border-1 border-white object-cover cursor-pointer"
          />
          {showProfile && (
            <div
              ref={profileRef}
              className="absolute top-0 left-14 w-72 bg-white text-black shadow-lg rounded-xl p-3 text-sm z-50"
            >
              <div className="text-base font-semibold px-3 py-2 cursor-default">
                {user.fullName}
              </div>
              <div className="py-2 px-3 hover:bg-gray-100 rounded cursor-pointer flex items-center justify-between">
                <span>Nâng cấp tài khoản</span>
                <HiOutlineArrowTopRightOnSquare />
              </div>
              <div
                onClick={handleShowInfoModal}
                className="py-2 px-3 hover:bg-gray-100 rounded cursor-pointer"
              >
                Hồ sơ của bạn
              </div>
              <div className="py-2 px-3 hover:bg-gray-100 rounded cursor-pointer">
                Cài đặt
              </div>
              <hr className="my-2" />
              <div
                onClick={handleLogout}
                className="text-red-600 py-2 px-3 hover:bg-red-50 rounded cursor-pointer text-center font-semibold"
              >
                Đăng xuất
              </div>
            </div>
          )}
        </div>

        {/* Danh sách icon */}
        <div className="flex flex-col items-center gap-4 flex-1">
          {menus.map((menu, index) =>
            menu.divider ? (
              <hr key={index} className="w-8 border-white/30 my-auto" />
            ) : (
              <div
                key={index}
                onClick={() => {
                  if (menu.onClick) {
                    menu.onClick();
                  } else if (menu.path) {
                    navigate(menu.path);
                  }
                }}
                className={`w-12 h-12 flex items-center justify-center rounded-lg cursor-pointer 
        ${
          isActive(menu.path) ? "bg-white text-blue-600" : "hover:bg-blue-500"
        }`}
              >
                {menu.icon}
              </div>
            )
          )}
        </div>

        {/* Cài đặt popup */}
        <div className="relative mb-8 mt-4">
          <div
            onClick={() => setShowSettings((prev) => !prev)}
            className="w-12 h-12 flex items-center justify-center rounded-lg cursor-pointer hover:bg-blue-500"
          >
            <FaCog size={24} />
          </div>

          {showSettings && (
            <div
              ref={settingsRef}
              className="absolute bottom-12 left-0 w-64 bg-white text-black shadow-lg rounded-xl p-3 text-sm z-50"
            >
              <div
                onClick={handleShowInfoModal}
                className="flex items-center gap-2 py-2 px-3 hover:bg-gray-100 rounded cursor-pointer"
              >
                <FaUser /> <span>Thông tin tài khoản</span>
              </div>
              <div className="flex items-center gap-2 py-2 px-3 hover:bg-gray-100 rounded cursor-pointer">
                <FaCog /> <span>Cài đặt</span>
              </div>
              <hr className="my-2" />
              <div className="flex items-center gap-2 py-2 px-3 hover:bg-gray-100 rounded cursor-pointer">
                <FaDatabase /> <span>Dữ liệu</span>
              </div>
              <div className="flex items-center gap-2 py-2 px-3 hover:bg-gray-100 rounded cursor-pointer">
                <FaGlobe /> <span>Ngôn ngữ</span>
              </div>
              <div className="flex items-center gap-2 py-2 px-3 hover:bg-gray-100 rounded cursor-pointer">
                <FaQuestionCircle /> <span>Hỗ trợ</span>
              </div>
              <hr className="my-2" />
              <div
                onClick={handleLogout}
                className="text-red-600 py-2 px-3 hover:bg-red-50 rounded cursor-pointer text-center font-semibold"
              >
                Đăng xuất
              </div>
            </div>
          )}
        </div>
      </div>

      <InfoModal
        isInfoModalOpen={isInfoModalOpen}
        setIsInfoModalOpen={setIsInfoModalOpen}
      />
    </>
  );
};

export default Sidebar;
