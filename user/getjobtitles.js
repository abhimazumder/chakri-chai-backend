const AWS = require("aws-sdk");
const { verifyToken } = require("../utils/verifyToken");
const CryptoJS = require("crypto-js");

const documentClient = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  try {
    const verifiedToken = verifyToken(event.headers.Authorization);

    if (!verifiedToken) {
      const error = new Error("Unauthorized.");
      error.statusCode = 401;
      throw error;
    }

    if (typeof event.body !== "string") {
      const error = new Error("Invalid request body. Expected JSON string!");
      error.statusCode = 400;
      throw error;
    }

    const requestBody = JSON.parse(event.body);

    if (!requestBody?.USER_ID) {
      const error = new Error("Missing required fields: USER_ID!");
      error.statusCode = 400;
      throw error;
    }

    const { USER_ID } = requestBody;

    const decryptedUserID = CryptoJS.AES.decrypt(
      USER_ID,
      process.env.CRYPTO_SECRET_KEY
    ).toString(CryptoJS.enc.Utf8);

    const params = {
      TableName: "JobDetails",
      FilterExpression: "USER_ID = :userId",
      ExpressionAttributeValues: {
        ":userId": decryptedUserID,
      },
      ProjectionExpression: "JOB_TITLE, JOB_ID",
    };

    const {Items} = await documentClient.scan(params).promise();

    const jobTitles = [];

    for(const Item of Items){
        jobTitles.push({
            VALUE: Item.JOB_TITLE,
            ID: Item.JOB_ID,
            DISABLED: false
        })
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST",
      },
      body: JSON.stringify({
        Items: jobTitles,
      }),
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
