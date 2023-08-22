const AWS = require("aws-sdk");
const CryptoJS = require("crypto-js");
const bcrypt = require("bcryptjs");
const { createTokens } = require("../utils/createTokens");
const dotenv = require("dotenv");

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

    if (!requestBody?.EMAIL_ID || !requestBody?.PASSWORD) {
      const error = new Error("Missing required fields: EMAIL_ID or PASSWORD!");
      error.statusCode = 400;
      throw error;
    }

    const { EMAIL_ID, PASSWORD } = requestBody;

    const decryptedEmailID = CryptoJS.AES.decrypt(
      EMAIL_ID,
      process.env.CRYPTO_SECRET_KEY
    ).toString(CryptoJS.enc.Utf8);

    const decryptedPassword = CryptoJS.AES.decrypt(
      PASSWORD,
      process.env.CRYPTO_SECRET_KEY
    ).toString(CryptoJS.enc.Utf8);

    const params = {
      TableName: "UserInformation",
      Key: {
        EMAIL_ID: decryptedEmailID,
      },
    };

    const data = await documentClient.get(params).promise();

    if (!data?.Item) {
      const error = new Error("Email address is not registered.");
      error.statusCode = 404;
      throw error;
    }

    const result = await bcrypt.compare(
      decryptedPassword,
      data?.Item?.PASSWORD
    );

    if (!result) {
      const error = new Error("Invalid credentials.");
      error.statusCode = 401;
      throw error;
    }

    const tokens = createTokens({emailId: data.Item.EMAIL_ID, userId: data.Item.USER_ID});

    const USER = {};

    Object.entries(data?.Item).forEach(([key, value]) => {
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
