const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken");
const CryptoJS = require("crypto-js");
const uuid = require("uuid");
const { createAuthTokens } = require("../utils/createTokens");
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

    if (!requestBody?.REFRESH_TOKEN) {
      const error = new Error("Missing required fields: REFRESH_TOKEN!");
      error.statusCode = 400;
      throw error;
    }

    const { REFRESH_TOKEN } = requestBody;

    const decoded = jwt.verify(REFRESH_TOKEN, process.env.JWT_SECRET_KEY);

    const isRefreshTokenAbsent = await checkRefreshTokenAbsence(
      decoded.user.userId,
      REFRESH_TOKEN
    );

    const encryptedRefreshToken = CryptoJS.AES.encrypt(
      REFRESH_TOKEN,
      process.env.CRYPTO_SECRET_KEY
    ).toString();

    if (isRefreshTokenAbsent) {
      const params = {
        TableName: "RefreshTokenDetails",
        Item: {
          TOKEN_ID: uuid.v4(),
          USER_ID: decoded.user.userId,
          TOKEN_DATA: encryptedRefreshToken,
          CREATION_DATE: new Date(decoded.iat * 1000).toISOString(),
          EXPIRATION_DATE: new Date(decoded.exp * 1000).toISOString(),
        },
      };

      await documentClient.put(params).promise();

      const newTokens = createAuthTokens(decoded.user);

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST",
        },
        body: JSON.stringify({ ...newTokens }),
      };
    } else {
      await clearAllTokens(decoded.user.userId);

      return {
        statusCode: 409,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST",
        },
        body: JSON.stringify({
          message: "The particular refresh token has already been used once.",
        }),
      };
    }
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

async function checkRefreshTokenAbsence(userId, refreshToken) {
  const params = {
    TableName: "RefreshTokenDetails",
    FilterExpression: "USER_ID = :userId",
    ExpressionAttributeValues: {
      ":userId": userId,
    },
  };

  const data = await documentClient.scan(params).promise();

  for (const item of data.Items) {
    const decryptedRefreshToken = CryptoJS.AES.decrypt(
      item.TOKEN_DATA,
      process.env.CRYPTO_SECRET_KEY
    ).toString(CryptoJS.enc.Utf8);

    if (decryptedRefreshToken === refreshToken) {
      return false;
    }
  }

  return true;
}

async function clearAllTokens(userId) {
  const params = {
    TableName: "RefreshTokenDetails",
    FilterExpression: "USER_ID = :userId",
    ExpressionAttributeValues: {
      ":userId": userId,
    },
  };

  const data = await documentClient.scan(params).promise();

  for (const item of data.Items) {
    const deleteParams = {
      TableName: "RefreshTokenDetails",
      Key: {
        TOKEN_ID: item.TOKEN_ID,
      },
    };

    await documentClient.delete(deleteParams).promise();
  }
}
