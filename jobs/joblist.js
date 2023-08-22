const AWS = require("aws-sdk");
const { filterByExperience } = require("../utils/filterByExperience");

const documentClient = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  try {
    if (typeof event.body !== "string") {
      const error = new Error("Invalid request body. Expected JSON string!");
      error.statusCode = 400;
      throw error;
    }

    const requestBody = JSON.parse(event.body);

    const { COUNTRY, CITY, EXPERIENCE } = requestBody;

    const params = {
      TableName: "JobDetails",
      ProjectionExpression:
        "JOB_ID, JOB_TITLE, JOB_LOCATIONS, POSTING_DATE, APPLICATION_DEADLINE, REQUIRED_EXPERIENCE",
    };

    let { Items } = await documentClient.scan(params).promise();

    Items = filterData(Items, COUNTRY, CITY, EXPERIENCE);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST",
      },
      body: JSON.stringify({
        DATA: Items,
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

function filterData(Items, COUNTRY = null, CITY = null, EXPERIENCE = null) {
  if (EXPERIENCE !== "") {
    Items = filterByExperience(Items, EXPERIENCE);
  }
  return Items;
}
