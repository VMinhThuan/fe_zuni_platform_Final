import { useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const groups = [
  {
    id: 1,
    name: "Nhóm Dev React",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
    members: 156,
  },
  {
    id: 2,
    name: "Cộng đồng Frontend Việt Nam",
    avatar: "https://randomuser.me/api/portraits/men/2.jpg",
    members: 2345,
  },
  {
    id: 3,
    name: "Hội những người thích code",
    avatar: "https://randomuser.me/api/portraits/men/3.jpg",
    members: 789,
  },
];

const GroupList = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm nhóm"
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

      {/* Group List */}
      <div className="flex-1 overflow-y-auto px-4">
        {filteredGroups.map((group) => (
          <div
            key={group.id}
            className="flex items-center justify-between py-2 hover:bg-[#f1f2f4] rounded-lg px-2 cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <img
                src={group.avatar}
                alt={group.name}
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div>
                <div className="font-medium text-[#081b3a]">{group.name}</div>
                <div className="text-sm text-[#65676b]">
                  {group.members} thành viên
                </div>
              </div>
            </div>
            <button className="text-[#4a4a4a] px-2">⋯</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupList;
