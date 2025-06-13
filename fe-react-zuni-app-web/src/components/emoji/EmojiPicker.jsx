import { useState } from "react";

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
    <div className="emoji-picker absolute bottom-9 right-0 w-[360px] h-[350px] bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden flex flex-col">
      {/* Tabs */}
      <div className="flex w-full border-b border-gray-200">
        <button
          className={`flex-1 py-2 text-center font-medium cursor-pointer hover:text-blue-500 ${
            activeTab === "STICKER"
              ? "text-blue-500 border-b-2 border-blue-500"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("STICKER")}
        >
          STICKER
        </button>
        <button
          className={`flex-1 py-2 text-center font-medium cursor-pointer hover:text-blue-500 ${
            activeTab === "EMOJI"
              ? "text-blue-500 border-b-2 border-blue-500"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("EMOJI")}
        >
          EMOJI
        </button>
      </div>

      {/* Nội dung tab */}
      {activeTab === "EMOJI" ? (
        <div className="p-2 flex-1 overflow-y-auto">
          <div className="text-xs text-gray-500 mb-2 ml-1">Cảm xúc</div>
          <div className="grid grid-cols-8 gap-2">
            {emojis.map((emoji, index) => (
              <div
                key={index}
                className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
                onClick={() => handleEmojiClick(emoji)}
              >
                <span className="text-2xl">{emoji}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-2 flex-1 overflow-y-auto">
          <div className="text-xs text-gray-500 mb-2 ml-1">Danh mục</div>
          <div className="grid grid-cols-4 gap-2">
            {stickerCategories.map((category, index) => (
              <div
                key={index}
                className="flex flex-col items-center justify-center p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
              >
                <span className="text-2xl">{category.icon}</span>
                <span className="text-xs mt-1">{category.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center text-sm text-gray-500">
            Tính năng sticker đang được phát triển
          </div>
        </div>
      )}

      {/* Bottom toolbar */}
      <div className="flex items-center px-2 py-1 border-t border-gray-200 bg-gray-50">
        <button className="p-1 text-gray-600 hover:text-blue-500">Z</button>
        <div className="flex-1 flex items-center justify-center space-x-3">
          <button className="p-1 text-gray-600 hover:text-blue-500">😊</button>
          <button className="p-1 text-gray-600 hover:text-blue-500">⚙️</button>
          <button className="p-1 text-gray-600 hover:text-blue-500">🕶️</button>
          <button className="p-1 text-gray-600 hover:text-blue-500">⚽</button>
          <button className="p-1 text-gray-600 hover:text-blue-500">✈️</button>
          <button className="p-1 text-gray-600 hover:text-blue-500">💡</button>
          <button className="p-1 text-gray-600 hover:text-blue-500">❤️</button>
        </div>
        <button className="p-1 text-gray-600 hover:text-blue-500">→</button>
      </div>
    </div>
  );
};

export default EmojiPicker;
