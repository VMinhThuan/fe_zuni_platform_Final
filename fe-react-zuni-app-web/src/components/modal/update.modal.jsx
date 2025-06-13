import { useEffect, useState } from "react";
import { Form, Modal, Tabs } from "antd";
import { LeftOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import UpdateInfoTab from "../tab/info.tab";
import ChangePasswordTab from "../tab/password.tab";

const UpdateModal = (props) => {
  const { isOpen, onClose, dataUpdate, setDataUpdate } = props;
  const [infoForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState("updateInfo");

  useEffect(() => {
    if (dataUpdate) {
      infoForm.setFieldsValue({
        fullName: dataUpdate.fullName,
        gender: dataUpdate.gender,
        dateOfBirth: dataUpdate.dateOfBirth
          ? dayjs(dataUpdate.dateOfBirth)
          : null,
      });
    }
  }, [dataUpdate, infoForm]);

  // Reset password form and active tab when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      passwordForm.resetFields();
      setActiveTab("updateInfo");
    }
  }, [isOpen, passwordForm]);

  const handleClose = () => {
    passwordForm.resetFields();
    setActiveTab("updateInfo");
    onClose();
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === "changePassword") {
      passwordForm.resetFields();
    }
  };

  const items = [
    {
      key: "updateInfo",
      label: "Cập nhật thông tin",
      children: (
        <UpdateInfoTab
          form={infoForm}
          onClose={handleClose}
          dataUpdate={dataUpdate}
          setDataUpdate={setDataUpdate}
        />
      ),
    },
    {
      key: "changePassword",
      label: "Đổi mật khẩu",
      children: (
        <ChangePasswordTab
          form={passwordForm}
          onClose={handleClose}
          isActive={activeTab === "changePassword"}
        />
      ),
    },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center justify-between">
          <LeftOutlined className="cursor-pointer" onClick={handleClose} />
          <span className="text-lg select-none">Thông tin cá nhân</span>
          <div className="w-5" />
        </div>
      }
      open={isOpen}
      onCancel={handleClose}
      maskClosable={false}
      closeIcon={null}
      footer={null}
      width={500}
      centered
    >
      <Tabs
        activeKey={activeTab}
        items={items}
        centered
        className="mt-4"
        onChange={handleTabChange}
      />
    </Modal>
  );
};

export default UpdateModal;
