import { CloseOutlined } from "@ant-design/icons";

const ImageViewModal = ({ isOpen, onClose, imageUrl }) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0"
        style={{ backgroundColor: "rgba(0, 0, 0, 1)", zIndex: 1500 }}
      >
        <div className="flex flex-col h-screen relative">
          <div className="absolute top-2 right-0 flex justify-end items-center px-4 py-2">
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white hover:bg-gray-300 cursor-pointer transition-all"
            >
              <CloseOutlined className="text-white text-base" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <img
              src={imageUrl}
              alt="image"
              className="max-h-[calc(100vh-120px)] w-auto object-contain"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ImageViewModal;
