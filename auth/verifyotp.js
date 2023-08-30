const AWS = require("aws-sdk");
const CryptoJS = require("crypto-js");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const { createAuthTokens } = require("../utils/createTokens");

dotenv.config();

const documentClient = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  try {
    if (typeof event.body !== "string") {
      const error = new Error("Invalid request body. Expected JSON string!");
      error.statusCode = 400;
      throw error;
    }

    const requestBody = JSON.parse(event.body);

    if (!requestBody?.SESSION_TOKEN && !requestBody?.OTP) {
      const error = new Error("Missing required fields: SESSION_TOKEN or OTP!");
      error.statusCode = 400;
      throw error;
    }

    const { SESSION_TOKEN, OTP } = requestBody;

    const decryptedSessionToken = CryptoJS.AES.decrypt(
      SESSION_TOKEN,
      process.env.CRYPTO_SECRET_KEY
    ).toString(CryptoJS.enc.Utf8);

    const decryptedOTP = CryptoJS.AES.decrypt(
      OTP,
      process.env.CRYPTO_SECRET_KEY
    ).toString(CryptoJS.enc.Utf8);

    const params = {
      TableName: "OTPDetails",
      Key: {
        SESSION_TOKEN: decryptedSessionToken,
      },
    };

    const data = await documentClient.get(params).promise();

    const result = await bcrypt.compare(decryptedOTP, data?.Item?.OTP_DATA);

    if (!result) {
      const error = new Error("Invalid OTP entered");
      error.statusCode = 401;
      throw error;
    }

    if (new Date() > new Date(data?.Item?.EXPIRE_AT)) {
      const error = new Error("OTP has expired");
      error.statusCode = 401;
      throw error;
    }

    const userParams = {
      TableName: "UserDetails",
      Key: {
        EMAIL_ID: data?.Item?.EMAIL_ID,
      },
    };

    const userData = await documentClient.get(userParams).promise();

    const tokens = createAuthTokens({
      emailId: userData.Item.EMAIL_ID,
      userId: userData.Item.USER_ID,
    });

    const USER = {};

    Object.entries(userData?.Item).forEach(([key, value]) => {
      if (key !== "PASSWORD")
        USER[key] = CryptoJS.AES.encrypt(
          value,
          process.env.CRYPTO_SECRET_KEY
        ).toString();
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST",
      },
      body: JSON.stringify({ ...tokens, USER }),
    };
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST",
      },
      body: JSON.stringify({
        message: error.message,
      }),
    };
  }
};
