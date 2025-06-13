import { useState, useEffect } from "react";
import { Modal, Upload, Image, Button } from "antd";
import { LeftOutlined, PlusOutlined, LoadingOutlined } from "@ant-design/icons";
import { useCurrentApp } from "../../contexts/app.context";
import { uploadFileApi } from "../../services/api";
import defaultAvatar from "../../assets/images/defaultAvatar.jpg";

const UpdateAvatarModal = ({ isOpen, onClose }) => {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const { messageApi, notificationApi, setUser, user } = useCurrentApp();

  useEffect(() => {
    if (!isOpen) {
      setFileList([]);
      setPreviewImage("");
    }
  }, [isOpen]);

  const handleUpload = async () => {
    if (fileList.length === 0) {
      messageApi.open({
        type: "error",
        content: "Vui lòng chọn ảnh đại diện",
      });
      return;
    }

    const file = fileList[0].originFileObj;
    if (!file) {
      messageApi.open({
        type: "error",
        content: "Không thể tải lên file!",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await uploadFileApi(formData);

      if (response?.status) {
        messageApi.open({
          type: "success",
          content: "Cập nhật ảnh đại diện thành công!",
        });
        setUser((prev) => ({
          ...prev,
          avatar: response.data.avatar,
        }));
        setFileList([]);
        onClose();
      } else {
        messageApi.open({
          type: "error",
          content: response?.message || "Có lỗi xảy ra khi tải ảnh lên",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      if (error.response) {
        notificationApi.error({
          message: "Lỗi từ server",
          description: error.response.message,
        });
      } else if (error.request) {
        notificationApi.error({
          message: "Lỗi mạng",
          description: "Không thể kết nối đến server. Vui lòng thử lại!",
        });
      } else {
        notificationApi.error({
          message: "Lỗi không xác định",
          description: error.message,
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const getBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handlePreview = async (file) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || file.preview);
    setPreviewOpen(true);
  };

  const handleChange = ({ file, fileList: newFileList }) => {
    setUploading(file.status === "uploading");

    const updatedFileList = newFileList.map((f) => {
      if (f.originFileObj && !f.url) {
        const previewUrl = URL.createObjectURL(f.originFileObj);
        return {
          ...f,
          status: "done",
          url: previewUrl,
          preview: previewUrl,
        };
      }
      return f;
    });

    setFileList(updatedFileList.slice(-1));
  };

  const beforeUpload = (file) => {
    const isJpgOrPng =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "image/jpg";
    if (!isJpgOrPng) {
      messageApi.open({
        type: "error",
        content: "Ảnh phải là định dạng JPG/JPEG/PNG!",
      });
      return Upload.LIST_IGNORE;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      messageApi.open({
        type: "error",
        content: "Ảnh phải nhỏ hơn 2MB!",
      });
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const uploadButton = (
    <button style={{ border: 0, background: "none" }} type="button">
      {uploading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>Tải ảnh lên</div>
    </button>
  );

  return (
    <Modal
      title={
        <div className="flex items-center justify-between">
          <LeftOutlined onClick={onClose} />
          <span className="text-lg select-none">Cập nhật ảnh đại diện</span>
          <div className="w-5" />
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      closeIcon={null}
      maskClosable={false}
      footer={null}
      width={500}
      centered
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center mt-2">
          <Upload
            listType="picture-circle"
            fileList={fileList}
            onPreview={handlePreview}
            onChange={handleChange}
            beforeUpload={beforeUpload}
            maxCount={1}
            showUploadList={{
              showPreviewIcon: false,
              showRemoveIcon: true,
            }}
          >
            {fileList.length >= 1 ? null : uploadButton}
          </Upload>
        </div>

        <div className="relative mb-4">
          <h3 className="text-base font-semibold mb-4 select-none">
            Ảnh đại diện của tôi
          </h3>
          <img
            src={user?.avatar || defaultAvatar}
            alt="current-avatar"
            className="w-26 h-26 rounded-full object-cover border border-gray-200"
          />
        </div>

        <Button
          type="primary"
          className="w-full"
          size="large"
          onClick={handleUpload}
          loading={uploading}
          disabled={fileList.length === 0}
        >
          Cập nhật
        </Button>
      </div>

      {previewImage && (
        <Image
          style={{ display: "none" }}
          preview={{
            visible: previewOpen,
            onVisibleChange: (visible) => setPreviewOpen(visible),
            afterOpenChange: (visible) => !visible && setPreviewImage(""),
          }}
          src={previewImage}
        />
      )}
    </Modal>
  );
};

export default UpdateAvatarModal;
