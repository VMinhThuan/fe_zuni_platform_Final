const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const getResetPasswordTemplate = (userName, resetURL) => {
  return {
    subject: "Đặt lại mật khẩu",
    html: `
      <h1>Yêu cầu đặt lại mật khẩu</h1>
      <p>Xin chào ${userName},</p>
      <p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng click vào link bên dưới để đặt lại mật khẩu:</p>
      <a href="${resetURL}">Đặt lại mật khẩu</a>
      <p>Link này sẽ hết hạn sau 15 phút.</p>
      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
    `,
  };
};

const getWelcomeTemplate = (userName) => {
  return {
    subject: "Chào mừng bạn đến với Zuni Web 🎉",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f5f7; padding: 5px; border-radius: 8px;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <h1 style="text-align: center; color: #2b6cb0;">👋 Chào mừng đến với Zuni Web</h1>
          
          <p style="font-size: 16px; color: #333;">Xin chào <strong>${userName}</strong>,</p>

          <p style="font-size: 15px; color: #444;">
            Chúc mừng bạn đã tạo tài khoản thành công trên Zuni Web – nền tảng giúp bạn nhắn tin, gọi video, chia sẻ tài liệu và kết nối với bạn bè, đồng nghiệp mọi lúc, mọi nơi.
          </p>

          <div style="background-color: #ebf8ff; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #2b6cb0;">Bạn có thể làm gì với Zuni Web?</h3>
            <ul style="padding-left: 20px; color: #444; line-height: 1.7;">
              <li>💬 Gửi và nhận tin nhắn siêu tốc</li>
              <li>📞 Gọi video chất lượng cao</li>
              <li>📎 Chia sẻ tài liệu lớn đến 1GB</li>
              <li>👥 Kết nối với nhóm, đồng nghiệp, người thân</li>
            </ul>
          </div>

          <p style="font-size: 15px; color: #444;">
            Bắt đầu khám phá các tiện ích tuyệt vời ngay hôm nay!
          </p>

          <div style="text-align: center; margin-top: 30px;">
            <a href="http://localhost:3000" target="_blank" style="background-color: #2b6cb0; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Truy cập Zuni Web
            </a>
          </div>

          <p style="font-size: 14px; color: #999; margin-top: 30px;">
            Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với đội ngũ hỗ trợ của chúng tôi.
          </p>

          <p style="font-size: 15px; color: #333;">
            Trân trọng,<br/>
            <strong>Đội ngũ Zuni App</strong>
          </p>
        </div>
      </div>
    `,
  };
};

const sendResetPasswordEmail = async (to, userName, resetURL) => {
  try {
    const template = getResetPasswordTemplate(userName, resetURL);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: to,
      subject: template.subject,
      html: template.html,
    };

    await transporter.sendMail(mailOptions);
    return {
      status: true,
      message: "Email đã được gửi thành công",
    };
  } catch (error) {
    console.error("Lỗi gửi email:", error);
    return {
      status: false,
      message: "Không thể gửi email: " + error.message,
    };
  }
};

const sendWelcomeEmail = async (to, userName) => {
  try {
    const template = getWelcomeTemplate(userName);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: to,
      subject: template.subject,
      html: template.html,
    };

    await transporter.sendMail(mailOptions);
    return {
      status: true,
      message: "Email chào mừng đã được gửi thành công",
    };
  } catch (error) {
    console.error("Lỗi gửi email:", error);
    return {
      status: false,
      message: "Không thể gửi email: " + error.message,
    };
  }
};

module.exports = {
  sendResetPasswordEmail,
  sendWelcomeEmail,
};
