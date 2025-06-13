import dayjs from "dayjs";
import { useState } from "react";
import { Modal, Button } from "antd";
import { CameraOutlined } from "@ant-design/icons";
import { useCurrentApp } from "../../contexts/app.context";
import defaultAvatar from "../../assets/images/defaultAvatar.jpg";
import ImageViewModal from "./image.modal";
import UpdateAvatarModal from "./avatar.modal";
import UpdateModal from "./update.modal";

const InfoModal = (props) => {
  const { isInfoModalOpen, setIsInfoModalOpen } = props;
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isUpdateAvatarModalOpen, setIsUpdateAvatarModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [dataUpdate, setDataUpdate] = useState(null);
  const { user } = useCurrentApp();

  const handleCancelInfoModal = () => {
    setIsInfoModalOpen(false);
  };

  const handleOpenImage = () => {
    setIsImageModalOpen(true);
  };

  const handleCloseImageModal = () => {
    setIsImageModalOpen(false);
  };

  const handleOpenUpdateAvatar = () => {
    setIsUpdateAvatarModalOpen(true);
    setIsInfoModalOpen(false);
  };

  const handleCloseUpdateAvatar = () => {
    setIsUpdateAvatarModalOpen(false);
    setIsInfoModalOpen(true);
  };

  const handleOpenUpdateModal = () => {
    setDataUpdate(user);
    setIsUpdateModalOpen(true);
    setIsInfoModalOpen(false);
  };

  const handleCloseUpdateModal = () => {
    setDataUpdate(null);
    setIsUpdateModalOpen(false);
    setIsInfoModalOpen(true);
  };

  const modalTitle = (
    <div className="text-lg text-center font-semibold select-none">
      Thông tin tài khoản
    </div>
  );

  return (
    <>
      <Modal
        title={modalTitle}
        open={isInfoModalOpen}
        onCancel={handleCancelInfoModal}
        centered
        footer={null}
        width={500}
      >
        <div className="flex flex-col items-center py-4">
          <div className="relative mb-3">
            <img
              src={user?.avatar || defaultAvatar}
              alt="avatar"
              className="w-26 h-26 rounded-full object-cover border border-gray-200 cursor-pointer"
              onClick={handleOpenImage}
            />
            <div
              onClick={handleOpenUpdateAvatar}
              className="absolute bottom-0 right-0 cursor-pointer bg-white rounded-full p-1 shadow-md hover:shadow-lg transition duration-200 ease-in-out transform hover:scale-101"
            >
              <CameraOutlined style={{ fontSize: 18 }} />
            </div>
          </div>

          <div className="w-full">
            <h3 className="text-lg text-center font-semibold mb-4 select-none">
              {user?.fullName}
            </h3>
          </div>

          <div className="w-full">
            <h3 className="text-base font-semibold mb-4 select-none">
              Thông tin cá nhân
            </h3>

            <div className="space-y-4">
              <div className="flex">
                <div className="w-27 text-gray-500 select-none">Giới tính</div>
                <div className="flex-1 text-black">{user?.gender}</div>
              </div>

              <div className="flex">
                <div className="w-27 text-gray-500 select-none">Ngày sinh</div>
                <div className="flex-1 text-black">
                  {dayjs(user?.dateOfBirth).format("DD-MM-YYYY")}
                </div>
              </div>

              <div className="flex">
                <div className="w-27 text-gray-500 select-none">Điện thoại</div>
                <div className="flex-1 text-black tracking-wide">
                  {user?.phoneNumber}
                </div>
              </div>
            </div>

            <div className="mt-6 text-gray-500 text-sm select-none">
              Chỉ bạn bè có lưu số của bạn trong danh bạ máy xem được số này
            </div>

            <div className="mt-8 flex justify-center">
              <Button
                type="primary"
                icon={<span>✏️</span>}
                onClick={handleOpenUpdateModal}
              >
                Cập nhật
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <ImageViewModal
        isOpen={isImageModalOpen}
        onClose={handleCloseImageModal}
        imageUrl={user?.avatar || defaultAvatar}
      />

      <UpdateAvatarModal
        isOpen={isUpdateAvatarModalOpen}
        onClose={handleCloseUpdateAvatar}
      />

      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={handleCloseUpdateModal}
        dataUpdate={dataUpdate}
        setDataUpdate={setDataUpdate}
      />
    </>
  );
};

export default InfoModal;
