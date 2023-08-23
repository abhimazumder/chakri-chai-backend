const AWS = require("aws-sdk");
const { verifyToken } = require("../utils/verifyToken");

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

    if (!requestBody?.JOB_ID || !requestBody?.ACTIVE_STATUS.toString()) {
      const error = new Error(
        "Missing required fields: JOB_ID or ACTIVE_STATUS!"
      );
      error.statusCode = 400;
      throw error;
    }

    const { JOB_ID, ACTIVE_STATUS } = requestBody;

    const params = {
      TableName: "JobDetails",
      Key: {
        JOB_ID: JOB_ID,
      },
      UpdateExpression: "SET #field = :newValue",
      ExpressionAttributeNames: {
        "#field": "ACTIVE_STATUS",
      },
      ExpressionAttributeValues: {
        ":newValue": ACTIVE_STATUS,
      },
    };

    await documentClient.update(params).promise();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST",
      },
      body: JSON.stringify({ message: `Active Status for JOB_ID: ${JOB_ID} has been changed to ${ACTIVE_STATUS}.` }),
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
