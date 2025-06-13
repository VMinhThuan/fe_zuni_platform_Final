import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Form, Input, Result, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import {
  verifyResetPasswordTokenApi,
  resetPasswordApi,
} from "../../../services/api";
import { useCurrentApp } from "../../../contexts/app.context";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(null);
  const { messageApi } = useCurrentApp();

  const password = Form.useWatch("password", form);
  const confirmPassword = Form.useWatch("confirmPassword", form);

  const hasErrors = () => {
    const errors = form.getFieldsError();
    return errors.some(({ errors }) => errors.length);
  };

  const isButtonEnabled = () => {
    return password && confirmPassword && !hasErrors();
  };

  useEffect(() => {
    const verifyToken = async () => {
      try {
        setLoading(true);
        const res = await verifyResetPasswordTokenApi(token);
        if (res?.status && res?.error === 0) {
          setIsValidToken(true);
        } else {
          setIsValidToken(false);
        }
      } catch (err) {
        console.error("Error verifying token:", err);
        setIsValidToken(false);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const onFinish = async (values) => {
    try {
      setLoading(true);
      const res = await resetPasswordApi(token, values.password);

      if (res?.status && res?.error === 0) {
        messageApi.open({
          type: "success",
          content: res?.message,
        });
        navigate("/login");
      } else {
        messageApi.open({
          type: "error",
          content: res?.message,
        });
      }
    } catch (err) {
      console.error("Error resetting password:", err);
      messageApi.open({
        type: "error",
        content: "Đã có lỗi xảy ra",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#e5effa] px-4 py-5">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#e5effa] px-4 py-5">
        <Result
          status="error"
          title="Token không hợp lệ hoặc đã hết hạn"
          subTitle="Vui lòng yêu cầu đặt lại mật khẩu mới"
          extra={[
            <Button
              type="primary"
              key="forgot"
              onClick={() => navigate("/forgotPassword")}
            >
              Gửi lại yêu cầu đặt lại mật khẩu
            </Button>,
          ]}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#e5effa] px-4 py-5">
      <h1 className="text-5xl font-bold text-blue-600 mb-2">Zuni</h1>
      <p className="text-lg text-gray-700 mb-8 text-center">
        Đặt lại mật khẩu mới để truy cập tài khoản Zuni
      </p>

      <div className="bg-white rounded-2xl shadow-xl px-8 pt-4 pb-3 w-full max-w-lg">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h2 className="text-base font-bold text-center text-[#000000e0]">
            Đặt lại mật khẩu
          </h2>
        </div>

        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="password"
            validateTrigger={["onBlur", "onChange"]}
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
            style={{ marginBottom: 16 }}
          >
            <Input.Password
              style={{ width: "100%", padding: "8px 16px" }}
              placeholder="Mật khẩu mới"
              autoComplete="newPassword"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={["password"]}
            validateTrigger={["onBlur", "onChange"]}
            rules={[
              { required: true, message: "Vui lòng nhập lại mật khẩu" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Mật khẩu không khớp"));
                },
              }),
            ]}
            style={{ marginBottom: 16 }}
          >
            <Input.Password
              style={{ width: "100%", padding: "8px 16px" }}
              placeholder="Nhập lại mật khẩu"
              autoComplete="newPassword"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full mt-2"
              size="large"
              loading={loading}
              disabled={!isButtonEnabled()}
            >
              Đặt lại mật khẩu
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
