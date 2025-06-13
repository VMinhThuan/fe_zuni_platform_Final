import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Upload, Image } from "antd";
import { PlusOutlined, LoadingOutlined } from "@ant-design/icons";
import { useCurrentApp } from "../../contexts/app.context";
import { uploadFileApi } from "../../services/api";

const SetupAvatarPage = () => {
  const navigate = useNavigate();
  const { setIsAuthenticated, messageApi, notificationApi, setUser } =
    useCurrentApp();
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");

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
          content: "Thiết lập ảnh đại diện thành công!",
        });
        localStorage.removeItem("justRegistered");
        setUser((prev) => ({
          ...prev,
          avatar: response.data.avatar,
        }));
        setIsAuthenticated(true);
        navigate("/");
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
    // Cập nhật trạng thái uploading
    setUploading(file.status === "uploading");

    // Tạo file list mới với preview URL
    const updatedFileList = newFileList.map((f) => {
      if (f.originFileObj && !f.url) {
        // Tạo URL preview cho file mới
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

    // Lọc và giữ lại file cuối cùng
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#e5effa] px-4">
      <h1 className="text-5xl font-bold text-blue-600 mb-2">Zuni</h1>
      <p className="text-lg text-gray-700 mb-8 text-center">
        Thiết lập ảnh đại diện <br /> để hoàn tất quá trình đăng ký
      </p>

      <div className="bg-white rounded-2xl shadow-xl p-8 pt-4 w-full max-w-lg">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h2 className="text-base font-bold text-center text-[#000000e0]">
            Thiết lập ảnh đại diện
          </h2>
        </div>

        <div className="flex flex-col items-center mb-6">
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

        <Button
          type="primary"
          className="w-full"
          size="large"
          onClick={handleUpload}
          loading={uploading}
          disabled={fileList.length === 0}
        >
          Hoàn tất
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
    </div>
  );
};

export default SetupAvatarPage;
