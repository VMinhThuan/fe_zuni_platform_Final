import { useEffect, useRef, useState } from "react";
import { Form, Input, Button } from "antd";
import { useCurrentApp } from "../../contexts/app.context";
import { updatePasswordApi } from "../../services/api";

const ChangePasswordTab = ({ form, onClose, isActive }) => {
  const [isSubmit, setIsSubmit] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const { messageApi } = useCurrentApp();

  const oldPasswordRef = useRef(null);

  const oldPassword = Form.useWatch("oldPassword", form);
  const newPassword = Form.useWatch("newPassword", form);
  const confirmPassword = Form.useWatch("confirmPassword", form);

  useEffect(() => {
    const checkFormValid = async () => {
      try {
        const isValid =
          (!oldPassword ||
            (await form
              .validateFields(["oldPassword"])
              .then(() => true)
              .catch(() => false))) &&
          (!newPassword ||
            (await form
              .validateFields(["newPassword"])
              .then(() => true)
              .catch(() => false))) &&
          (!confirmPassword ||
            (await form
              .validateFields(["confirmPassword"])
              .then(() => true)
              .catch(() => false)));

        const allFieldsFilled = oldPassword && newPassword && confirmPassword;

        setFormValid(isValid && allFieldsFilled);
      } catch (error) {
        console.log("error", error);
        setFormValid(false);
      }
    };

    checkFormValid();
  }, [form, oldPassword, newPassword, confirmPassword]);

  const onFinish = async (values) => {
    setIsSubmit(true);
    try {
      const res = await updatePasswordApi({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });

      if (res?.status) {
        messageApi.open({
          type: "success",
          content: "Đổi mật khẩu thành công!",
        });
        form.resetFields();
        onClose();
      } else {
        messageApi.open({
          type: "error",
          content: res?.message || "Có lỗi xảy ra khi đổi mật khẩu",
        });
      }
    } catch (error) {
      console.error("Update password error:", error);
      messageApi.open({
        type: "error",
        content: "Có lỗi xảy ra khi đổi mật khẩu",
      });
    } finally {
      setIsSubmit(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      setTimeout(() => {
        oldPasswordRef?.current?.focus();
      }, 100);
    }
  }, [isActive]);

  return (
    <Form
      form={form}
      onFinish={onFinish}
      validateTrigger={[]}
      layout="vertical"
      className="mt-4"
    >
      <Form.Item
        name="oldPassword"
        label="Mật khẩu hiện tại"
        validateTrigger={["onBlur"]}
        rules={[
          {
            required: true,
            message: "Vui lòng nhập mật khẩu hiện tại",
          },
        ]}
      >
        <Input.Password
          ref={oldPasswordRef}
          placeholder="Nhập mật khẩu hiện tại"
          style={{ width: "100%", padding: "8px 16px" }}
        />
      </Form.Item>

      <Form.Item
        name="newPassword"
        label="Mật khẩu mới"
        validateTrigger={["onBlur"]}
        rules={[
          { required: true, message: "Vui lòng nhập mật khẩu mới" },
          { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự" },
          {
            pattern:
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            message:
              "Mật khẩu phải có ít nhất 1 chữ thường, 1 chữ in hoa, 1 số và 1 ký tự đặc biệt",
          },
        ]}
      >
        <Input.Password
          placeholder="Nhập mật khẩu mới"
          style={{ width: "100%", padding: "8px 16px" }}
        />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        label="Xác nhận mật khẩu mới"
        dependencies={["newPassword"]}
        validateTrigger={["onBlur"]}
        rules={[
          { required: true, message: "Vui lòng xác nhận mật khẩu mới" },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("newPassword") === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error("Mật khẩu không khớp"));
            },
          }),
        ]}
      >
        <Input.Password
          placeholder="Xác nhận mật khẩu mới"
          style={{ width: "100%", padding: "8px 16px" }}
        />
      </Form.Item>

      <Form.Item className="mb-0">
        <Button
          type="primary"
          htmlType="submit"
          className="w-full"
          size="large"
          loading={isSubmit}
          disabled={!formValid}
        >
          Đổi mật khẩu
        </Button>
      </Form.Item>
    </Form>
  );
};

export default ChangePasswordTab;
