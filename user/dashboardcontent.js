const AWS = require("aws-sdk");
const { verifyToken } = require("../utils/verifyToken");
const CryptoJS = require("crypto-js");

const documentClient = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  try {
    // const verifiedToken = verifyToken(event.headers.Authorization);

    // if (!verifiedToken) {
    //   const error = new Error("Unauthorized.");
    //   error.statusCode = 401;
    //   throw error;
    // }

    if (typeof event.body !== "string") {
      const error = new Error("Invalid request body. Expected JSON string!");
      error.statusCode = 400;
      throw error;
    }

    const requestBody = JSON.parse(event.body);

    if (!requestBody?.EMAIL_ID) {
      const error = new Error("Missing required fields: EMAIL_ID!");
      error.statusCode = 400;
      throw error;
    }

    const { EMAIL_ID } = requestBody;

    const decryptedEmailID = CryptoJS.AES.decrypt(
      EMAIL_ID,
      process.env.CRYPTO_SECRET_KEY
    ).toString(CryptoJS.enc.Utf8);

    const userParams = {
      TableName: "UserDetails",
      Key: {
        EMAIL_ID: decryptedEmailID,
      },
    };

    const data = await documentClient.get(userParams).promise();

    if (!data?.Item) {
      const error = new Error("Email address is not registered.");
      error.statusCode = 404;
      throw error;
    }

    const { USER_ID, FIRST_NAME, LAST_NAME } = data.Item;

    /////////////////////////////////////////////////////////////////////////////////

    const jobsParam = {
      TableName: "JobDetails",
      FilterExpression: "USER_ID = :userId",
      ExpressionAttributeValues: {
        ":userId": USER_ID,
      },
      ProjectionExpression: "JOB_ID, JOB_TITLE, ACTIVE_STATUS, POSTING_DATE",
    };

    let { Items: JobItems } = await documentClient.scan(jobsParam).promise();

    JobItems = JobItems.sort((a, b) => new Date(b.POSTING_DATE) - new Date(a.POSTING_DATE)).slice(0, 3);

    const RecentJobItems = {};

    for (const Item of JobItems) {
      const params = {
        TableName: "ApplicationDetails",
        FilterExpression: "JOB_ID = :jobId",
        ExpressionAttributeValues: {
          ":jobId": Item.JOB_ID,
        },
      };

      const { Count } = await documentClient.scan(params).promise();

      RecentJobItems[Item.JOB_ID] = {
        JOB_ID : Item.JOB_ID,
        JOB_TITLE: Item.JOB_TITLE,
        TOTAL_APPLICATIONS : Count,
        ACTIVE_STATUS: Item.ACTIVE_STATUS
      }
    }

    /////////////////////////////////////////////////////////////////////////////////

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST",
      },
      body: JSON.stringify({
        RECENT_JOB_POSTINGS: RecentJobItems,
        RECENT_JOB_APPLICATIONS: {},
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
