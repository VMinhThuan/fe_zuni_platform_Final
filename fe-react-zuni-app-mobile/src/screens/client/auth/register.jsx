import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Form, Input, DatePicker, Radio } from "antd";
import {
  registerApi,
  checkEmailExistsApi,
  checkPhoneExistsApi,
} from "../../../services/api";
import BannerIcon from "../../../assets/images/banner_icon.svg";
import debounce from "lodash/debounce";
import { useCurrentApp } from "../../../contexts/app.context";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [isSubmit, setIsSubmit] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const { messageApi, setUser } = useCurrentApp();

  const emailInputRef = useRef(null);

  const email = Form.useWatch("email", form);
  const phoneNumber = Form.useWatch("phoneNumber", form);
  const fullName = Form.useWatch("fullName", form);
  const password = Form.useWatch("password", form);
  const confirmPassword = Form.useWatch("confirmPassword", form);
  const gender = Form.useWatch("gender", form);
  const dateOfBirth = Form.useWatch("dateOfBirth", form);

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

  const checkPhoneExists = useCallback(
    (phoneNumber) => {
      if (!phoneNumber || !/^0\d{9}$/.test(phoneNumber)) return;

      setIsCheckingPhone(true);
      checkPhoneExistsApi(phoneNumber)
        .then((res) => {
          setPhoneExists(res?.data?.exists || false);
        })
        .catch((error) => {
          console.error("Error checking phone:", error);
        })
        .finally(() => {
          setIsCheckingPhone(false);
        });
    },
    [setIsCheckingPhone, setPhoneExists]
  );

  const debouncedCheckPhone = useMemo(
    () => debounce(checkPhoneExists, 500),
    [checkPhoneExists]
  );

  const onFinish = async (values) => {
    setIsSubmit(true);
    const res = await registerApi(values);
    setIsSubmit(false);

    if (res.data) {
      localStorage.setItem("accessToken", res.data.accessToken);
      localStorage.setItem("justRegistered", "true");
      setUser(res.data.user);
      messageApi.open({
        type: "success",
        content: "Đăng ký thành công!",
      });
      navigate("/setupAvatar");
    } else {
      messageApi.open({
        type: "error",
        content: res?.message,
      });
    }
  };

  useEffect(() => {
    const email = form.getFieldValue("email");
    const phoneNumber = form.getFieldValue("phoneNumber");

    if (email) debouncedCheckEmail(email);
    if (phoneNumber) debouncedCheckPhone(phoneNumber);
  }, [form, debouncedCheckEmail, debouncedCheckPhone]);

  // Cleanup debounced functions when component unmounts
  useEffect(() => {
    return () => {
      debouncedCheckEmail.cancel();
      debouncedCheckPhone.cancel();
    };
  }, [debouncedCheckEmail, debouncedCheckPhone]);

  // Kiểm tra form hợp lệ
  useEffect(() => {
    const checkFormValid = async () => {
      try {
        // Kiểm tra các điều kiện
        const isValid =
          (!email ||
            (await form
              .validateFields(["email"])
              .then(() => true)
              .catch(() => false))) &&
          (!phoneNumber ||
            (await form
              .validateFields(["phoneNumber"])
              .then(() => true)
              .catch(() => false))) &&
          (!fullName ||
            (await form
              .validateFields(["fullName"])
              .then(() => true)
              .catch(() => false))) &&
          (!password ||
            (await form
              .validateFields(["password"])
              .then(() => true)
              .catch(() => false))) &&
          (!confirmPassword ||
            (await form
              .validateFields(["confirmPassword"])
              .then(() => true)
              .catch(() => false))) &&
          (!gender ||
            (await form
              .validateFields(["gender"])
              .then(() => true)
              .catch(() => false))) &&
          (!dateOfBirth ||
            (await form
              .validateFields(["dateOfBirth"])
              .then(() => true)
              .catch(() => false))) &&
          !emailExists &&
          !phoneExists &&
          !isCheckingEmail &&
          !isCheckingPhone;

        // Kiểm tra xem tất cả các trường bắt buộc đã được điền chưa
        const allFieldsFilled =
          email &&
          phoneNumber &&
          fullName &&
          password &&
          confirmPassword &&
          gender &&
          dateOfBirth;

        setFormValid(isValid && allFieldsFilled);
      } catch (error) {
        console.log("error", error);
        setFormValid(false);
      }
    };

    checkFormValid();
  }, [
    form,
    email,
    phoneNumber,
    fullName,
    password,
    confirmPassword,
    gender,
    dateOfBirth,
    emailExists,
    phoneExists,
    isCheckingEmail,
    isCheckingPhone,
  ]);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#e5effa] px-4 py-5">
        <h1 className="text-5xl font-bold text-blue-600 mb-2">Zuni</h1>
        <p className="text-lg text-gray-700 mb-8 text-center">
          Đăng ký tài khoản Zuni <br /> để kết nối với bạn bè và gia đình
        </p>

        <div className="bg-white rounded-2xl shadow-xl p-8 pt-4 w-full max-w-lg">
          <div className="border-b border-gray-200 pb-4 mb-6">
            <h2 className="text-base font-bold text-center text-[#000000e0]">
              Đăng ký
            </h2>
          </div>

          <Form
            form={form}
            onFinish={onFinish}
            validateTrigger={[]}
            onValuesChange={(changedValues) => {
              if (changedValues.email) {
                debouncedCheckEmail(changedValues.email);
              }
              if (changedValues.phoneNumber) {
                debouncedCheckPhone(changedValues.phoneNumber);
              }
            }}
          >
            <Form.Item
              name="email"
              validateStatus={emailExists ? "error" : undefined}
              help={emailExists ? "Email đã được sử dụng" : undefined}
              validateTrigger={["onBlur"]}
              rules={[
                { required: true, message: "Vui lòng nhập email" },
                {
                  validator: async (_, value) => {
                    if (!value) return Promise.resolve();

                    if (!value.includes("@")) {
                      return Promise.reject("Email không hợp lệ");
                    }

                    if (!value.endsWith("@gmail.com")) {
                      return Promise.reject(
                        "Chỉ chấp nhận email từ @gmail.com"
                      );
                    }

                    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(value)) {
                      return Promise.reject(
                        "Email không được chứa ký tự đặc biệt"
                      );
                    }

                    if (emailExists) {
                      return Promise.reject("Email đã được sử dụng");
                    }

                    return Promise.resolve();
                  },
                },
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input
                ref={emailInputRef}
                style={{ width: "100%", padding: "8px 16px" }}
                placeholder="Email"
                autoComplete="email"
                onKeyDown={(e) => {
                  if (e.target.value.length === 0 && e.key === " ") {
                    e.preventDefault();
                  }
                }}
                suffix={
                  <span
                    className={isCheckingEmail ? "text-gray-400" : "hidden"}
                  >
                    ...
                  </span>
                }
              />
            </Form.Item>

            <Form.Item
              name="phoneNumber"
              validateStatus={phoneExists ? "error" : undefined}
              help={phoneExists ? "Số điện thoại đã được sử dụng" : undefined}
              validateTrigger={["onBlur"]}
              rules={[
                { required: true, message: "Vui lòng nhập số điện thoại" },
                {
                  pattern: /^0\d{9}$/,
                  message:
                    "Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0",
                },
                {
                  validator: async () => {
                    if (phoneExists) {
                      return Promise.reject(
                        new Error("Số điện thoại đã được sử dụng")
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
              onKeyDown={(e) => {
                if (e.target.value.length === 0 && e.key === " ") {
                  e.preventDefault();
                }
              }}
              style={{ marginBottom: 16 }}
            >
              <Input
                style={{ width: "100%", padding: "8px 16px" }}
                placeholder="Số điện thoại"
                autoComplete="tel"
                suffix={
                  <span
                    className={isCheckingPhone ? "text-gray-400" : "hidden"}
                  >
                    ...
                  </span>
                }
              />
            </Form.Item>

            <Form.Item
              name="fullName"
              validateTrigger={["onBlur"]}
              rules={[
                {
                  required: true,
                  message: "Vui lòng nhập họ và tên",
                },
                {
                  pattern: /^[^0-9]*$/,
                  message: "Họ và tên không được chứa số",
                },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();

                    if (value.trim().length === 0) {
                      return Promise.reject(
                        "Họ và tên không được chỉ chứa khoảng trắng"
                      );
                    }
                    return Promise.resolve();
                  },
                },
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input
                style={{ width: "100%", padding: "8px 16px" }}
                placeholder="Họ và tên"
                autoComplete="fullName"
                onKeyDown={(e) => {
                  if (e.target.value.length === 0 && e.key === " ") {
                    e.preventDefault();
                  }
                }}
              />
            </Form.Item>

            <Form.Item
              name="gender"
              label="Giới tính"
              validateTrigger={["onChange"]}
              rules={[
                {
                  required: true,
                  message: "Vui lòng chọn giới tính",
                },
              ]}
              style={{ marginBottom: 16 }}
              className="flex items-center mb-4"
              labelCol={{ style: { marginBottom: 0 } }}
            >
              <Radio.Group>
                <Radio value="Nam">Nam</Radio>
                <Radio value="Nữ">Nữ</Radio>
                <Radio value="Khác">Khác</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item
              name="dateOfBirth"
              validateTrigger={["onChange", "onBlur"]}
              rules={[
                {
                  required: true,
                  message: "Vui lòng chọn ngày sinh",
                },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();

                    const today = new Date();
                    const birthDate = value.toDate();

                    if (birthDate > today) {
                      return Promise.reject(
                        "Ngày sinh không được lớn hơn ngày hiện tại"
                      );
                    }

                    let age = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    if (
                      monthDiff < 0 ||
                      (monthDiff === 0 && today.getDate() < birthDate.getDate())
                    ) {
                      age--;
                    }

                    if (age < 14) {
                      return Promise.reject(
                        "Bạn phải đủ 14 tuổi trở lên để đăng ký"
                      );
                    }

                    return Promise.resolve();
                  },
                },
              ]}
              onKeyDown={(e) => {
                if (e.target.value.length === 0 && e.key === " ") {
                  e.preventDefault();
                }
              }}
              style={{ marginBottom: 16 }}
            >
              <DatePicker
                style={{ width: "100%", padding: "8px 16px" }}
                placeholder="Ngày sinh"
                format="DD/MM/YYYY"
              />
            </Form.Item>

            <Form.Item
              name="password"
              validateTrigger={["onBlur"]}
              rules={[
                { required: true, message: "Vui lòng nhập mật khẩu" },
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
                placeholder="Mật khẩu"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              dependencies={["password"]}
              validateTrigger={["onBlur"]}
              rules={[
                { required: true, message: "Vui lòng xác nhận mật khẩu" },
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
                placeholder="Xác nhận mật khẩu"
                autoComplete="new-password"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="w-full"
                size="large"
                loading={isSubmit}
                disabled={!formValid}
              >
                Tạo tài khoản
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center mt-8">
            <p className="text-[#282828] font-medium text-sm">
              Đã có tài khoản?{" "}
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

export default RegisterPage;
