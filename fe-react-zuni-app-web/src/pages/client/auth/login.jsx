import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Form, Input } from "antd";
import { useCurrentApp } from "../../../contexts/app.context";
import { loginApi } from "../../../services/api";
import BannerIcon from "../../../assets/images/banner_icon.svg";

const LoginPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { setIsAuthenticated, setUser, messageApi, notificationApi } =
    useCurrentApp();
  const [isSubmit, setIsSubmit] = useState(false);

  const accountInputRef = useRef(null);

  const account = Form.useWatch("account", form);
  const password = Form.useWatch("password", form);

  const isFormValid = account && password;

  const onFinish = async (values) => {
    setIsSubmit(true);
    const res = await loginApi(values);

    if (res?.data) {
      setIsAuthenticated(true);
      setUser(res.data.user);
      localStorage.setItem("accessToken", res.data.accessToken);
      messageApi.open({
        type: "success",
        content: "Đăng nhập thành công!",
      });
      navigate("/");
    } else {
      notificationApi.error({
        message: "Đăng nhập thất bại",
        description: res?.message,
      });
    }
    setIsSubmit(false);
  };

  useEffect(() => {
    accountInputRef.current?.focus();
  }, []);

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#e5effa] px-4">
        <h1 className="text-5xl font-bold text-blue-600 mb-2">Zuni</h1>
        <p className="text-lg text-gray-700 mb-8 text-center">
          Đăng nhập tài khoản Zuni <br /> để kết nối với ứng dụng Zuni Web
        </p>

        <div className="bg-white rounded-2xl shadow-xl p-8 pt-4 w-full max-w-lg">
          <div className="border-b border-gray-200 pb-4 mb-6">
            <h2 className="text-base font-bold text-center text-[#000000e0]">
              Đăng nhập
            </h2>
          </div>

          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
              name="account"
              rules={[
                {
                  required: true,
                  message: "Vui lòng nhập email hoặc số điện thoại",
                },
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input
                ref={accountInputRef}
                onKeyDown={(e) => {
                  if (e.target.value.length === 0 && e.key === " ") {
                    e.preventDefault();
                  }
                }}
                style={{ width: "100%", padding: "8px 16px" }}
                placeholder="Email hoặc số điện thoại"
                autoComplete="account"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
              style={{ marginBottom: 16 }}
            >
              <Input.Password
                style={{ width: "100%", padding: "8px 16px" }}
                placeholder="Mật khẩu"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="w-full"
                size="large"
                loading={isSubmit}
                disabled={!isFormValid}
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center mt-4">
            <Link
              to="/forgotPassword"
              className="text-[#282828] font-medium text-sm"
            >
              Quên mật khẩu
            </Link>
          </div>

          <div className="text-center mt-4">
            <p className="text-[#282828] font-medium text-sm">
              Chưa có tài khoản?{" "}
              <Link
                to="/register"
                className="text-blue-600 font-semibold hover:underline transition ml-1"
              >
                Đăng ký
              </Link>
            </p>
          </div>

          <div className="mt-2 p-4 bg-white rounded-xl shadow-lg flex items-center gap-4 w-full max-w-md">
            <div className="bg-blue-100 rounded-full p-2">
              <img src={BannerIcon} alt="Zuni PC" className="w-10 h-10" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">
                Nâng cao hiệu quả công việc với Zuni PC
              </p>
              <p className="text-xs text-gray-500">
                Gửi file lớn đến 1 GB, chụp màn hình, gọi video và nhiều tiện
                ích hơn nữa
              </p>
            </div>
            <button className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-md cursor-pointer">
              Tải ngay
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
