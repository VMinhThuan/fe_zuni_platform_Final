require("dotenv").config();
require("aws-sdk/lib/maintenance_mode_message").suppress = true;
const AWS = require("aws-sdk");

// Cấu hình AWS
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Khởi tạo các service AWS
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();
const ses = new AWS.SES();

module.exports = {
  s3,
  dynamodb,
  cognito,
  ses,
};
