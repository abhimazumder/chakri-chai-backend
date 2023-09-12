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
      ProjectionExpression:
        "JOB_ID, JOB_TITLE, TOTAL_APPLICATIONS, ACTIVE_STATUS, POSTING_DATE",
    };

    let { Items: JobItems } = await documentClient.scan(jobsParam).promise();

    JobItems = JobItems.sort(
      (a, b) => new Date(b.POSTING_DATE) - new Date(a.POSTING_DATE)
    ).slice(0, 3);

    const RecentJobItems = {};

    for (const Item of JobItems) {
      RecentJobItems[Item.JOB_ID] = {
        JOB_ID: Item.JOB_ID,
        JOB_TITLE: Item.JOB_TITLE,
        TOTAL_APPLICATIONS: Item.TOTAL_APPLICATIONS,
        ACTIVE_STATUS: Item.ACTIVE_STATUS,
      };
    }

    /////////////////////////////////////////////////////////////////////////////////

    const applicationsParams = {
      TableName: "ApplicationDetails",
      FilterExpression: "JOB_POSTER_USER_ID = :userId",
      ExpressionAttributeValues: {
        ":userId": USER_ID,
      },
      ProjectionExpression:
        "APPLICATION_ID, FIRST_NAME, LAST_NAME, JOB_TITLE, APPLIED_ON",
    };

    let { Items: ApplicationItems } = await documentClient
      .scan(applicationsParams)
      .promise();

    ApplicationItems = ApplicationItems.sort(
      (a, b) => new Date(b.APPLIED_ON) - new Date(a.APPLIED_ON)
    ).slice(0, 3);

    const RecentApplicationItems = {};

    for (const Item of ApplicationItems) {
      RecentApplicationItems[Item.APPLICATION_ID] = {
        APPLICATION_ID: Item.APPLICATION_ID,
        APPLICANT_NAME: `${Item.FIRST_NAME} ${Item.LAST_NAME}`,
        JOB_TITLE: Item.JOB_TITLE,
        APPLIED_ON: Item.APPLIED_ON,
      };
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
        RECENT_JOB_APPLICATIONS: RecentApplicationItems,
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
