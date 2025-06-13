import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Form, Input } from "antd";
import debounce from "lodash/debounce";
import { checkEmailExistsApi, forgotPasswordApi } from "../../../services/api";
import { useCurrentApp } from "../../../contexts/app.context";
import BannerIcon from "../../../assets/images/banner_icon.svg";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const emailInputRef = useRef(null);
  const [emailExists, setEmailExists] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const [isSubmit, setIsSubmit] = useState(false);
  const { messageApi } = useCurrentApp();

  const email = Form.useWatch("email", form);

  const checkEmailExists = useCallback(
    (email) => {
      if (!email || !email.includes("@")) return;

      setIsCheckingEmail(true);
      checkEmailExistsApi(email)
        .then((res) => {
          setEmailExists(res?.data?.exists || false);
        })
        .catch((error) => {
          console.error("Error checking email:", error);
        })
        .finally(() => {
          setIsCheckingEmail(false);
        });
    },
    [setIsCheckingEmail, setEmailExists]
  );

  const debouncedCheckEmail = useMemo(
    () => debounce(checkEmailExists, 500),
    [checkEmailExists]
  );

  const onFinish = async (values) => {
    setIsSubmit(true);
    const res = await forgotPasswordApi(values.email);
    setIsSubmit(false);

    if (res?.status && res?.error === 0) {
      messageApi.open({
        type: "success",
        content: res?.message,
      });
      navigate("/login");
    } else {
      messageApi.open({
        type: "error",
        content: res?.message || "Yêu cầu đặt lại mật khẩu thất bại",
      });
    }
  };

  useEffect(() => {
    const email = form.getFieldValue("email");
    if (email) debouncedCheckEmail(email);
  }, [form, debouncedCheckEmail]);

  useEffect(() => {
    return () => {
      debouncedCheckEmail.cancel();
    };
  }, [debouncedCheckEmail]);

  useEffect(() => {
    const checkFormValid = async () => {
      try {
        const isValid =
          (!email ||
            (await form
              .validateFields(["email"])
              .then(() => true)
              .catch(() => false))) &&
          !isCheckingEmail &&
          emailExists;

        setFormValid(isValid);
      } catch (error) {
        console.log("error", error);
        setFormValid(false);
      }
    };

    checkFormValid();
  }, [form, email, emailExists, isCheckingEmail]);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#e5effa] px-4 py-5">
      <h1 className="text-5xl font-bold text-blue-600 mb-2">Zuni</h1>
      <p className="text-lg text-gray-700 mb-8 text-center">
        Lấy lại mật khẩu bằng email đã đăng ký
      </p>

      <div className="bg-white rounded-2xl shadow-xl p-8 pt-4 w-full max-w-lg">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h2 className="text-base font-bold text-center text-[#000000e0]">
            Quên mật khẩu
          </h2>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          validateTrigger={[]}
          onValuesChange={(changedValues) => {
            if (changedValues.email) {
              debouncedCheckEmail(changedValues.email);
            }
          }}
        >
          <Form.Item
            name="email"
            validateStatus={
              email
                ? !email.includes("@") || !email.includes(".")
                  ? "error"
                  : !emailExists
                  ? "error"
                  : undefined
                : undefined
            }
            help={
              email
                ? !email.includes("@") || !email.includes(".")
                  ? "Email không hợp lệ"
                  : !emailExists
                  ? "Email không tồn tại trong hệ thống"
                  : undefined
                : undefined
            }
            validateTrigger={["onBlur"]}
            rules={[
              {
                required: true,
                message: "Vui lòng nhập email",
              },
              {
                type: "email",
                message: "Email không hợp lệ",
              },
              {
                validator: async (_, value) => {
                  if (!value) return Promise.resolve();

                  if (!value.includes("@") || !value.includes(".")) {
                    return Promise.reject(new Error("Email không hợp lệ"));
                  }

                  if (!emailExists) {
                    return Promise.reject(
                      new Error("Email không tồn tại trong hệ thống")
                    );
                  }

                  return Promise.resolve();
                },
              },
            ]}
            style={{ marginBottom: 16 }}
          >
            <Input
              ref={emailInputRef}
              onKeyDown={(e) => {
                if (e.target.value.length === 0 && e.key === " ") {
                  e.preventDefault();
                }
              }}
              style={{ width: "100%", padding: "8px 16px" }}
              placeholder="Email"
              suffix={
                <span className={isCheckingEmail ? "text-gray-400" : "hidden"}>
                  ...
                </span>
              }
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full"
              size="large"
              disabled={!formValid}
              loading={isSubmit}
            >
              Gửi yêu cầu đặt lại mật khẩu
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-4">
          <p className="text-[#282828] font-medium text-sm">
            Bạn nhớ mật khẩu?{" "}
            <Link
              to="/login"
              className="text-blue-600 font-semibold hover:underline transition ml-1"
            >
              Đăng nhập
            </Link>
          </p>
        </div>

        <div className="mt-6 p-4 bg-white rounded-xl shadow-lg flex items-center gap-4 w-full max-w-md">
          <div className="bg-blue-100 rounded-full p-2">
            <img src={BannerIcon} alt="Zuni PC" className="w-10 h-10" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              Nâng cao hiệu quả công việc với Zuni PC
            </p>
            <p className="text-xs text-gray-500">
              Gửi file lớn đến 1 GB, chụp màn hình, gọi video và nhiều tiện ích
              hơn nữa
            </p>
          </div>
          <button className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-md cursor-pointer">
            Tải ngay
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
