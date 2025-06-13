const { s3 } = require("../configs/dbConfig");

const randomString = (numberCharacter) => {
  return `${Math.random()
    .toString(36)
    .substring(2, numberCharacter + 2)}`;
};

const uploadToS3 = async (file, folder = "") => {
  try {
    if (!file || !file.buffer) {
      console.error("Invalid file or missing buffer:", file);
      return {
        status: false,
        error: "Invalid file or missing buffer",
      };
    }

    const fileName = `${randomString(4)}-${new Date().getTime()}-${
      file.originalname
    }`;

    // Thêm prefix folder nếu có
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    const uploadParams = {
      Bucket: process.env.BUCKET_NAME,
      Body: file.buffer,
      Key: filePath,
      ContentType: file.mimetype,
    };

    console.log("Uploading to S3 with params:", {
      Bucket: uploadParams.Bucket,
      Key: uploadParams.Key,
      ContentType: uploadParams.ContentType,
      BodySize: file.buffer.length,
    });

    const data = await s3.upload(uploadParams).promise();
    const fileUrl = `${process.env.CLOUDFRONT_URL}${data.Key}`;

    return fileUrl;
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    return error.message;
  }
};

module.exports = {
  uploadToS3,
};
