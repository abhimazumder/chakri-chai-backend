const AWS = require("aws-sdk");
const { verifyToken } = require("../utils/verifyToken");

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

    const params = {
      TableName: "JobDetails",
      FilterExpression: "USER_ID = :userId",
      ExpressionAttributeValues: {
        ":userId": USER_ID,
      },
      ProjectionExpression:
        "JOB_ID, JOB_TITLE, POSTING_DATE, APPLICATION_DEADLINE, ACTIVE_STATUS",
    };

    const { Items } = await documentClient.scan(params).promise();

    for (const Item of Items) {
      const params = {
        TableName: "ApplicationDetails",
        FilterExpression: "JOB_ID = :jobId",
        ExpressionAttributeValues: {
          ":jobId": Item.JOB_ID,
        },
      };

      const { Count } = await documentClient.scan(params).promise();
      Item.TOTAL_APPLICATIONS = Count;
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST",
      },
      body: JSON.stringify({ Items }),
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
