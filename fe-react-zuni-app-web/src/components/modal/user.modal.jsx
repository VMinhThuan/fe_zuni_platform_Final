import dayjs from "dayjs";
import { Modal } from "antd";
import defaultAvatar from "../../assets/images/defaultAvatar.jpg";
import ImageViewModal from "./image.modal";
import { useState } from "react";

const UserInfoModal = ({ isOpen, onClose, userData }) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const handleOpenImage = () => {
    setIsImageModalOpen(true);
  };

  const handleCloseImageModal = () => {
    setIsImageModalOpen(false);
  };

  const modalTitle = (
    <div className="text-lg text-center font-semibold select-none">
      Thông tin người dùng
    </div>
  );

  return (
    <>
      <Modal
        title={modalTitle}
        open={isOpen}
        onCancel={onClose}
        centered
        footer={null}
        width={500}
      >
        <div className="flex flex-col items-center py-4">
          <div className="mb-3">
            <img
              src={userData?.avatar || defaultAvatar}
              alt="avatar"
              className="w-26 h-26 rounded-full object-cover border border-gray-200 cursor-pointer"
              onClick={handleOpenImage}
            />
          </div>

          <div className="w-full">
            <h3 className="text-lg text-center font-semibold mb-4 select-none">
              {userData?.fullName}
            </h3>
          </div>

          <div className="w-full">
            <h3 className="text-base font-semibold mb-4 select-none">
              Thông tin cá nhân
            </h3>

            <div className="space-y-4">
              <div className="flex">
                <div className="w-27 text-gray-500 select-none">Giới tính</div>
                <div className="flex-1 text-black">{userData?.gender}</div>
              </div>

              <div className="flex">
                <div className="w-27 text-gray-500 select-none">Ngày sinh</div>
                <div className="flex-1 text-black">
                  {dayjs(userData?.dateOfBirth).format("DD-MM-YYYY")}
                </div>
              </div>

              <div className="flex">
                <div className="w-27 text-gray-500 select-none">Điện thoại</div>
                <div className="flex-1 text-black tracking-wide">
                  {userData?.phoneNumber}
                </div>
              </div>
            </div>

            <div className="mt-6 text-gray-500 text-sm select-none">
              Chỉ bạn bè có lưu số của bạn trong danh bạ máy xem được số này
            </div>
          </div>
        </div>
      </Modal>

      <ImageViewModal
        isOpen={isImageModalOpen}
        onClose={handleCloseImageModal}
        imageUrl={userData?.avatar || defaultAvatar}
      />
    </>
  );
};

export default UserInfoModal;
