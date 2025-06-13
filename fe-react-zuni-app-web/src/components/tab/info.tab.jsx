import { useState, useEffect } from "react";
import { Form, Input, DatePicker, Radio, Button } from "antd";
import dayjs from "dayjs";
import { useCurrentApp } from "../../contexts/app.context";
import { updateUserApi } from "../../services/api";

const UpdateInfoTab = ({ form, onClose, dataUpdate, setDataUpdate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const { messageApi, setUser } = useCurrentApp();

  const fullName = Form.useWatch("fullName", form);
  const gender = Form.useWatch("gender", form);
  const dateOfBirth = Form.useWatch("dateOfBirth", form);
  useEffect(() => {
    if (dataUpdate) {
      form.setFieldsValue({
        id: dataUpdate.userId,
        fullName: dataUpdate.fullName,
        gender: dataUpdate.gender,
        dateOfBirth: dayjs(dataUpdate.dateOfBirth),
      });
    }
  }, [dataUpdate, form]);

  useEffect(() => {
    const checkFormValid = async () => {
      try {
        const isValid =
          (!fullName ||
            (await form
              .validateFields(["fullName"])
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
              .catch(() => false)));

        const allFieldsFilled = fullName && gender && dateOfBirth;

        setFormValid(isValid && allFieldsFilled);
      } catch (error) {
        console.log("error", error);
        setFormValid(false);
      }
    };

    checkFormValid();
  }, [form, fullName, gender, dateOfBirth]);

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const res = await updateUserApi({
        ...values,
        dateOfBirth: values.dateOfBirth,
      });

      if (res?.data) {
        messageApi.open({
          type: "success",
          content: "Cập nhật thông tin thành công!",
        });
        setDataUpdate(null);
        setUser(res?.data);
        form.resetFields();
        onClose();
      } else {
        messageApi.open({
          type: "error",
          content: res?.message || "Có lỗi xảy ra khi cập nhật thông tin",
        });
      }
    } catch (error) {
      console.error("Update error:", error);
      messageApi.open({
        type: "error",
        content: "Có lỗi xảy ra khi cập nhật thông tin",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      form={form}
      onFinish={handleSubmit}
      validateTrigger={[]}
      layout="vertical"
      className="mt-4"
    >
      <Form.Item labelCol={{ span: 24 }} label="id" name="id" hidden>
        <Input />
      </Form.Item>

      <Form.Item
        name="fullName"
        label="Tên hiển thị"
        validateTrigger={["onBlur"]}
        rules={[
          {
            required: true,
            message: "Vui lòng nhập tên hiển thị",
          },
          {
            pattern: /^[^0-9]*$/,
            message: "Tên hiển thị không được chứa số",
          },
          {
            validator: (_, value) => {
              if (!value) return Promise.resolve();

              if (value.trim().length === 0) {
                return Promise.reject(
                  "Tên hiển thị không được chỉ chứa khoảng trắng"
                );
              }
              return Promise.resolve();
            },
          },
        ]}
        className="select-none"
      >
        <Input
          placeholder="Nhập tên hiển thị"
          style={{ width: "100%", padding: "8px 16px" }}
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
        className="select-none"
      >
        <Radio.Group>
          <Radio value="Nam">Nam</Radio>
          <Radio value="Nữ">Nữ</Radio>
          <Radio value="Khác">Khác</Radio>
        </Radio.Group>
      </Form.Item>

      <Form.Item
        name="dateOfBirth"
        label="Ngày sinh"
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
                return Promise.reject("Bạn phải đủ 14 tuổi trở lên");
              }

              return Promise.resolve();
            },
          },
        ]}
        className="select-none"
      >
        <DatePicker
          style={{ width: "100%", padding: "8px 16px" }}
          format="DD/MM/YYYY"
          placeholder="Chọn ngày sinh"
        />
      </Form.Item>

      <Form.Item className="mb-0">
        <Button
          type="primary"
          htmlType="submit"
          className="w-full"
          size="large"
          loading={isSubmitting}
          disabled={!formValid}
        >
          Cập nhật
        </Button>
      </Form.Item>
    </Form>
  );
};

export default UpdateInfoTab;
