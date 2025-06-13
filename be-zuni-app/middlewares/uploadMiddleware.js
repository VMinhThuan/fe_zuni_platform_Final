const multer = require("multer");

// Ánh xạ giữa đuôi file và MIME type
const FILE_TYPE_MAP = {
  // Hình ảnh
  png: ["image/png"],
  jpg: ["image/jpeg", "image/jpg"],
  jpeg: ["image/jpeg", "image/jpg"],
  gif: ["image/gif"],

  // Video/Audio
  mp3: ["audio/mpeg", "video/mp3"],
  mp4: ["video/mp4"],

  // Document
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ppt: ["application/vnd.ms-powerpoint"],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],

  // Archive
  rar: [
    "application/vnd.rar",
    "application/x-rar-compressed",
    "application/octet-stream",
  ],
  zip: [
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream",
  ],

  // Code, File
  js: ["application/javascript", "text/javascript", "text/x-javascript"],
  ts: ["application/typescript", "text/typescript"],
  jsx: ["text/jsx", "application/javascript"],
  tsx: ["text/tsx", "application/typescript"],
  html: ["text/html"],
  css: ["text/css"],
  json: ["application/json", "text/json"],
  txt: ["text/plain"],
  csv: ["text/csv"],
};

// Danh sách đuôi file cho phép
const ALLOWED_EXTENSIONS = Object.keys(FILE_TYPE_MAP);

// Danh sách MIME type cho phép (tự động tạo từ FILE_TYPE_MAP)
const FILE_TYPE_MATCH = Object.values(FILE_TYPE_MAP).flat();

// Sử dụng memoryStorage để xử lý file trước khi lưu
const storage = multer.memoryStorage({
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB
  },
});

// Kiểm tra file type
const fileFilter = (req, file, cb) => {
  console.log("File upload attempt:", {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  });

  // Kiểm tra kích thước file
  if (file.size > 30 * 1024 * 1024) {
    console.log(`File too large: ${file.size} bytes`);
    return cb(new Error("File size exceeds 30MB limit"), false);
  }

  // Kiểm tra đuôi file
  const fileExtension = file.originalname.split(".").pop().toLowerCase();

  // Nếu đuôi file nằm trong danh sách cho phép, chấp nhận
  if (ALLOWED_EXTENSIONS.includes(fileExtension)) {
    console.log(`Accepted file with extension: ${fileExtension}`);
    return cb(null, true);
  }

  // Nếu MIME type nằm trong danh sách cho phép, chấp nhận
  if (FILE_TYPE_MATCH.includes(file.mimetype)) {
    console.log(`Accepted file with MIME type: ${file.mimetype}`);
    return cb(null, true);
  }

  // Từ chối các file không thuộc danh sách trên
  console.log(
    `Rejected file: ${file.originalname} with mimetype: ${file.mimetype}`
  );
  return cb(new Error(`Invalid file type: ${file.mimetype}`), false);
};

// Tạo middleware upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 30 * 1024 * 1024,
  },
  fileFilter: fileFilter,
});

module.exports = upload;
