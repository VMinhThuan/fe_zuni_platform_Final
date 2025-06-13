import { useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const groupInvites = [
  {
    id: 1,
    groupName: "Nhóm Dev React Native",
    avatar: "https://randomuser.me/api/portraits/men/7.jpg",
    invitedBy: "Nguyễn Văn X",
    members: 234,
  },
  {
    id: 2,
    groupName: "Cộng đồng Backend Việt Nam",
    avatar: "https://randomuser.me/api/portraits/men/8.jpg",
    invitedBy: "Trần Thị Y",
    members: 567,
  },
  {
    id: 3,
    groupName: "Hội Những Người Thích Design",
    avatar: "https://randomuser.me/api/portraits/men/9.jpg",
    invitedBy: "Lê Văn Z",
    members: 890,
  },
];

const GroupInvites = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredInvites = groupInvites.filter((invite) =>
    invite.groupName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Search */}
      <div className="p-4">
        <div className="relative">
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
            className="w-full bg-[#f0f2f5] text-[#4a4a4a] pl-10 pr-4 py-2 rounded-lg focus:outline-none"
          />
          <MagnifyingGlassIcon className="h-5 w-5 text-[#4a4a4a] absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Group Invites List */}
      <div className="flex-1 overflow-y-auto px-4">
        {filteredInvites.map((invite) => (
          <div
            key={invite.id}
            className="flex items-center justify-between py-3 hover:bg-[#f1f2f4] rounded-lg px-2"
          >
            <div className="flex items-center space-x-3">
              <img
                src={invite.avatar}
                alt={invite.groupName}
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div>
                <div className="font-medium text-[#081b3a]">
                  {invite.groupName}
                </div>
                <div className="text-sm text-[#65676b]">
                  Được mời bởi {invite.invitedBy} • {invite.members} thành viên
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-1.5 bg-[#0068ff] text-white rounded-lg hover:bg-[#0052cc] transition-colors">
                Tham gia
              </button>
              <button className="px-4 py-1.5 bg-[#f0f2f5] text-[#081b3a] rounded-lg hover:bg-[#e4e6eb] transition-colors">
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupInvites;
