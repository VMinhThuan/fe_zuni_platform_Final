import { useState, useEffect, useCallback } from "react";
import { IoSearchOutline } from "react-icons/io5";
import { AiOutlineUserAdd, AiOutlineUsergroupAdd } from "react-icons/ai";
import { PiUsersThreeBold, PiUserPlusBold, PiUserList } from "react-icons/pi";
import { LiaUsersSolid } from "react-icons/lia";
import { Badge } from "antd";
import FriendList from "../../components/friendList";
import GroupList from "../../components/groupList";
import FriendRequests from "../../components/friendRequests";
import GroupInvites from "../../components/groupInvites";
import { useSocket } from "../../contexts/socket.context";
import { getFriendRequestsApi } from "../../services/api";

const MENU_TYPES = {
  FRIENDS: "friends",
  GROUPS: "groups",
  FRIEND_REQUESTS: "friend_requests",
  GROUP_INVITES: "group_invites",
};

const menuItems = [
  {
    type: MENU_TYPES.FRIENDS,
    label: "Danh sách bạn bè",
    icon: <PiUserList size={20} />,
  },
  {
    type: MENU_TYPES.GROUPS,
    label: "Danh sách nhóm và cộng đồng",
    icon: <PiUsersThreeBold size={20} />,
  },
  {
    type: MENU_TYPES.FRIEND_REQUESTS,
    label: "Lời mời kết bạn",
    icon: <PiUserPlusBold size={20} />,
  },
  {
    type: MENU_TYPES.GROUP_INVITES,
    label: "Lời mời vào nhóm và cộng đồng",
    icon: <LiaUsersSolid size={20} />,
  },
];

const FriendsPage = () => {
  const [activeMenu, setActiveMenu] = useState(MENU_TYPES.FRIENDS);
  const [searchTerm, setSearchTerm] = useState("");
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const { socket } = useSocket();

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
        console.error("FriendsPage - Response không hợp lệ:", res);
        setFriendRequestCount(0);
      }
    } catch (error) {
      console.error("FriendsPage - Lỗi khi lấy lời mời kết bạn:", error);
      setFriendRequestCount(0);
    }
  }, []);

  useEffect(() => {
    if (!socket) {
      console.log("FriendsPage - Socket chưa được khởi tạo");
      return;
    }

    const handleFriendRequestReceived = (data) => {
      console.log("FriendsPage - Nhận được lời mời kết bạn mới:", data);
      getFriendRequests();
    };

    const handleFriendRequestAccepted = (data) => {
      console.log("FriendsPage - Lời mời kết bạn được chấp nhận:", data);
      getFriendRequests();
    };

    const handleFriendRequestRejected = (data) => {
      console.log("FriendsPage - Lời mời kết bạn bị từ chối:", data);
      getFriendRequests();
    };

    socket.on("friend-request-received", handleFriendRequestReceived);
    socket.on("friend-request-accepted", handleFriendRequestAccepted);
    socket.on("friend-request-rejected", handleFriendRequestRejected);

    return () => {
      socket.off("friend-request-received", handleFriendRequestReceived);
      socket.off("friend-request-accepted", handleFriendRequestAccepted);
      socket.off("friend-request-rejected", handleFriendRequestRejected);
    };
  }, [socket, getFriendRequests]);

  useEffect(() => {
    if (socket?.connected) {
      getFriendRequests();
    }
  }, [socket?.connected, getFriendRequests]);

  const renderContent = () => {
    switch (activeMenu) {
      case MENU_TYPES.FRIENDS:
        return <FriendList />;
      case MENU_TYPES.GROUPS:
        return <GroupList />;
      case MENU_TYPES.FRIEND_REQUESTS:
        return <FriendRequests onUpdateCount={getFriendRequests} />;
      case MENU_TYPES.GROUP_INVITES:
        return <GroupInvites />;
      default:
        return <FriendList />;
    }
  };

  const getActiveMenuInfo = () => {
    return menuItems.find((item) => item.type === activeMenu);
  };

  return (
    <div className="flex h-screen bg-[#f4f5f7]">
      {/* Sidebar */}
      <div className="w-[350px] border-r border-[#00000026] bg-white flex flex-col">
        {/* Tìm kiếm + icon */}
        <div className="p-3">
          <div className="flex items-center gap-1">
            <div className="flex items-center bg-[#f0f2f5] rounded-lg px-3 py-2 flex-1">
              <IoSearchOutline size={18} className="text-[#4a4a4a]" />
              <input
                type="text"
                placeholder="Tìm kiếm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.target.value.length === 0 && e.key === " ") {
                    e.preventDefault();
                  }
                }}
                className="w-full bg-transparent outline-none text-sm ml-2 text-[#4a4a4a]"
              />
            </div>
            <div className="flex gap-1 ml-1">
              <button className="text-[#0f182e] hover:bg-gray-100 p-2 rounded cursor-pointer">
                <AiOutlineUserAdd size={18} />
              </button>
              <button className="text-[#0f182e] hover:bg-gray-100 p-2 rounded cursor-pointer">
                <AiOutlineUsergroupAdd size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Danh sách menu */}
        <div className="flex flex-col">
          {menuItems.map((item) => (
            <div
              key={item.type}
              className={`flex items-center justify-between px-4 py-[14px] text-[#081b3a] cursor-pointer transition-all text-[16px] ${
                activeMenu === item.type ? "bg-[#dbebff]" : "hover:bg-[#f1f2f4]"
              } font-[500]`}
              onClick={() => setActiveMenu(item.type)}
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">
                  {item.icon}
                </div>
                <span>{item.label}</span>
              </div>
              {item.type === MENU_TYPES.FRIEND_REQUESTS &&
                friendRequestCount > 0 && (
                  <Badge
                    count={friendRequestCount}
                    style={{
                      backgroundColor: "#ff4d4f",
                    }}
                  />
                )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white flex flex-col">
        <div className="flex items-center gap-4 px-4 py-[17.5px] border-b border-[#00000026] select-none text-[16px] text-[#081b3a] font-medium">
          {getActiveMenuInfo()?.icon}
          <span>{getActiveMenuInfo()?.label}</span>
        </div>

        <div className="flex-1 overflow-hidden">{renderContent()}</div>
      </div>
    </div>
  );
};

export default FriendsPage;
