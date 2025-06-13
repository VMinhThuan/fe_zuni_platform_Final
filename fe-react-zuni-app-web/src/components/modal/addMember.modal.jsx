import { useState, useEffect } from "react";
import { Button, Spin, Modal } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { getFriendsApi, addParticipantsApi } from "../../services/api";
import { useCurrentApp } from "../../contexts/app.context";

const AddMemberModal = ({
  isOpen,
  onClose,
  onAddMembers,
  groupParticipants = [],
  conversationId,
}) => {
  const { messageApi } = useCurrentApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setSelected([]);
      setLoading(true);
      getFriendsApi()
        .then((res) => {
          if (res.status) setFriends(res.data || []);
        })
        .catch(() => setFriends([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  // Lọc bạn bè theo search
  const filteredFriends = friends.filter((f) => {
    const name = f.fullName?.toLowerCase() || "";
    const phone = f.phoneNumber || "";
    return (
      name.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm)
    );
  });

  // Group theo alphabet
  const grouped = filteredFriends.reduce((acc, f) => {
    const letter = f.fullName?.charAt(0).toUpperCase() || "#";
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(f);
    return acc;
  }, {});
  const sortedLetters = Object.keys(grouped).sort();

  // Đã tham gia nhóm
  const isInGroup = (userId) =>
    groupParticipants.some((p) =>
      typeof p === "string" ? p === userId : p.userId === userId
    );

  // Chọn bạn bè
  const handleSelect = (userId) => {
    if (isInGroup(userId)) return;
    setSelected((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Xử lý thêm thành viên
  const handleAddMembers = async () => {
    if (!conversationId || selected.length === 0) return;
    setAdding(true);
    try {
      const res = await addParticipantsApi(conversationId, selected);
      if (res.status) {
        messageApi.open({
          type: "success",
          content: "Thêm thành viên thành công!",
        });
        onAddMembers && onAddMembers(selected);
        onClose && onClose();
      } else {
        messageApi.open({
          type: "error",
          content: res.message || "Thêm thành viên thất bại!",
        });
      }
    } catch {
      messageApi.open({
        type: "error",
        content: "Lỗi khi thêm thành viên!",
      });
    } finally {
      setAdding(false);
    }
  };

  // Giao diện
  return (
    <Modal
      title="Thêm thành viên"
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={480}
      centered
      className="add-member-modal"
      maskClosable={!loading && !adding}
      closable={!loading && !adding}
    >
      {/* Input search */}
      <div className="mb-3">
        <input
          className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none"
          placeholder="Nhập tên, số điện thoại, hoặc danh sách số điện thoại"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={loading || adding}
        />
      </div>
      {/* Danh sách bạn bè theo alphabet */}
      <div className="max-h-[38vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 20 }} spin />}
            />
          </div>
        ) : filteredFriends.length === 0 ? (
          <div className="flex justify-center items-center h-32 text-gray-400 text-base">
            Không có bạn bè nào để thêm
          </div>
        ) : (
          sortedLetters.map((letter) => (
            <div key={letter} className="mb-2">
              <div className="px-2 py-1 font-semibold text-base text-[#1a2233]">
                {letter}
              </div>
              {grouped[letter].map((f) => (
                <div
                  key={f.userId}
                  className="flex items-center gap-3 px-2 py-2 hover:bg-gray-100 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isInGroup(f.userId) || selected.includes(f.userId)}
                    disabled={isInGroup(f.userId) || loading || adding}
                    onChange={() => handleSelect(f.userId)}
                    className="h-5 w-5 rounded-full"
                  />
                  <img
                    src={f.avatar}
                    alt={f.fullName}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-[#06132b]">
                      {f.fullName}
                    </span>
                    {isInGroup(f.userId) && (
                      <span className="ml-2 text-xs text-gray-400">
                        Đã tham gia
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      {/* Footer */}
      <div className="flex items-center justify-end gap-3 border-t border-[#d9d9d9] pt-3 mt-2">
        <Button onClick={onClose} disabled={loading || adding}>
          Hủy
        </Button>
        <Button
          type="primary"
          onClick={handleAddMembers}
          disabled={selected.length === 0 || loading || adding}
          loading={adding}
        >
          Xác nhận
        </Button>
      </div>
    </Modal>
  );
};

export default AddMemberModal;
