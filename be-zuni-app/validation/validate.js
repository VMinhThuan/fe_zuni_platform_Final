const Joi = require("joi");

const registerSchema = Joi.object({
  email: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!value) {
        return helpers.error("any.required");
      }

      if (!value.includes("@")) {
        return helpers.error("string.email");
      }

      if (!value.endsWith("@gmail.com")) {
        return helpers.error("string.domain");
      }

      if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(value)) {
        return helpers.error("string.special");
      }

      return value;
    })
    .messages({
      "string.empty": "Vui lòng nhập email",
      "any.required": "Vui lòng nhập email",
      "string.email": "Email không hợp lệ",
      "string.domain": "Chỉ chấp nhận email từ @gmail.com",
      "string.special": "Email không được chứa ký tự đặc biệt",
    }),
  phoneNumber: Joi.string()
    .pattern(/^0\d{9}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0",
      "string.empty": "Vui lòng nhập số điện thoại",
      "any.required": "Vui lòng nhập số điện thoại",
    }),
  fullName: Joi.string()
    .required()
    .pattern(/^[^0-9]*$/)
    .custom((value, helpers) => {
      if (value.trim().length === 0) {
        return helpers.error("string.empty");
      }
      return value;
    })
    .messages({
      "string.empty": "Họ và tên không được chỉ chứa khoảng trắng",
      "any.required": "Vui lòng nhập họ và tên",
      "string.pattern.base": "Họ và tên không được chứa số",
    }),
  gender: Joi.string().valid("Nam", "Nữ", "Khác").required().messages({
    "any.only": "Giới tính không hợp lệ",
    "any.required": "Vui lòng chọn giới tính",
  }),
  dateOfBirth: Joi.date()
    .required()
    .max("now")
    .custom((value, helpers) => {
      const today = new Date();
      const birthDate = new Date(value);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      if (age < 14) {
        return helpers.error("date.min");
      }
      return value;
    })
    .messages({
      "date.max": "Ngày sinh không được lớn hơn ngày hiện tại",
      "date.min": "Bạn phải đủ 14 tuổi trở lên để đăng ký",
      "any.required": "Vui lòng chọn ngày sinh",
    }),
  password: Joi.string()
    .min(8)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    )
    .required()
    .messages({
      "string.min": "Mật khẩu phải có ít nhất 8 ký tự",
      "string.pattern.base":
        "Mật khẩu phải có ít nhất 1 chữ thường, 1 chữ in hoa, 1 số và 1 ký tự đặc biệt",
      "string.empty": "Vui lòng nhập mật khẩu",
      "any.required": "Vui lòng nhập mật khẩu",
    }),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Mật khẩu không khớp",
    "any.required": "Vui lòng xác nhận mật khẩu",
  }),
});

const validateRegister = (data) => {
  return registerSchema.validate(data, { abortEarly: false });
};

const resetPasswordSchema = Joi.object({
  password: Joi.string()
    .min(8)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    )
    .required()
    .messages({
      "string.min": "Mật khẩu phải có ít nhất 8 ký tự",
      "string.pattern.base":
        "Mật khẩu phải có ít nhất 1 chữ thường, 1 chữ in hoa, 1 số và 1 ký tự đặc biệt",
      "string.empty": "Vui lòng nhập mật khẩu",
      "any.required": "Vui lòng nhập mật khẩu",
    }),
});

const validateResetPassword = (data) => {
  return resetPasswordSchema.validate(data, { abortEarly: false });
};

const updateUserSchema = Joi.object({
  id: Joi.string().required().messages({
    "string.empty": "Thiếu thông tin ID người dùng",
    "any.required": "Thiếu thông tin ID người dùng",
  }),
  fullName: Joi.string()
    .required()
    .pattern(/^[^0-9]*$/)
    .custom((value, helpers) => {
      if (value.trim().length === 0) {
        return helpers.error("string.empty");
      }
      return value;
    })
    .messages({
      "string.empty": "Họ và tên không được chỉ chứa khoảng trắng",
      "any.required": "Vui lòng nhập họ và tên",
      "string.pattern.base": "Họ và tên không được chứa số",
    }),
  gender: Joi.string().valid("Nam", "Nữ", "Khác").required().messages({
    "any.only": "Giới tính không hợp lệ",
    "any.required": "Vui lòng chọn giới tính",
  }),
  dateOfBirth: Joi.date()
    .required()
    .max("now")
    .custom((value, helpers) => {
      const today = new Date();
      const birthDate = new Date(value);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }

      if (age < 14) {
        return helpers.error("date.min");
      }
      return value;
    })
    .messages({
      "date.max": "Ngày sinh không được lớn hơn ngày hiện tại",
      "date.min": "Bạn phải đủ 14 tuổi trở lên",
      "any.required": "Vui lòng chọn ngày sinh",
    }),
});

const validateUpdateUser = (data) => {
  return updateUserSchema.validate(data, { abortEarly: false });
};

const updatePasswordSchema = Joi.object({
  oldPassword: Joi.string().required().messages({
    "string.empty": "Vui lòng nhập mật khẩu cũ",
    "any.required": "Vui lòng nhập mật khẩu cũ",
  }),
  newPassword: Joi.string()
    .min(8)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    )
    .required()
    .messages({
      "string.min": "Mật khẩu mới phải có ít nhất 8 ký tự",
      "string.pattern.base":
        "Mật khẩu mới phải có ít nhất 1 chữ thường, 1 chữ in hoa, 1 số và 1 ký tự đặc biệt",
      "string.empty": "Vui lòng nhập mật khẩu mới",
      "any.required": "Vui lòng nhập mật khẩu mới",
    }),
});

const validateUpdatePassword = (data) => {
  return updatePasswordSchema.validate(data, { abortEarly: false });
};

module.exports = {
  validateRegister,
  validateResetPassword,
  validateUpdateUser,
  validateUpdatePassword,
};
