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

    if (!requestBody?.DATA) {
      const error = new Error("Missing required fields: DATA!");
      error.statusCode = 400;
      throw error;
    }

    const { DATA } = requestBody;

    const {
      "User ID": USER_ID,
      "Active Status": ACTIVE_STATUS,
      "Job ID": JOB_ID,
      "Job Title": JOB_TITLE,
      "Job Locations": UNFORMATTED_JOB_LOCATIONS,
      "Posting Date": POSTING_DATE,
      "Application Deadline": APPLICATION_DEADLINE,
      "Employment Type": EMPLOYMENT_TYPE,
      "Work Mode": WORK_MODE,
      "Required Experience": REQUIRED_EXPERIENCE,
      "Opennings": OPENNINGS,
      "Compensation": COMPENSATION,
      "Description": DESCRIPTION,
    } = DATA;

    if (!USER_ID || !ACTIVE_STATUS.toString() || !JOB_ID || !JOB_TITLE || !POSTING_DATE) {
      const error = new Error(
        "Missing required fields: User ID, Job ID, Job Title or Posting Date!"
      );
      error.statusCode = 400;
      throw error;
    }

    const JOB_LOCATIONS = formatJobLocations(UNFORMATTED_JOB_LOCATIONS);

    const ITEM = {
      USER_ID,
      ACTIVE_STATUS,
      JOB_ID,
      JOB_TITLE,
      JOB_LOCATIONS,
      POSTING_DATE,
      APPLICATION_DEADLINE,
      EMPLOYMENT_TYPE,
      WORK_MODE,
      REQUIRED_EXPERIENCE,
      OPENNINGS,
      COMPENSATION,
      DESCRIPTION,
      TOTAL_APPLICATIONS: 0,
    };

    const params = {
      TableName: "JobDetails",
      Item: ITEM,
    };

    await documentClient.put(params).promise();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST",
      },
      body: JSON.stringify({
        message: "Job item created successfully!",
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

const formatJobLocations = (unformattedJobLocations) => {
  const formattedJobLocations = {};
  unformattedJobLocations.forEach((location) => {
    formattedJobLocations[location["Country"]] = [];
  });
  unformattedJobLocations.forEach((location) => {
    formattedJobLocations[location["Country"]].push(location["City"]);
  });
  return formattedJobLocations;
};

// function formatDate(unformattedDate) {
//     const date = new Date(unformattedDate);
//     const day = date.getDate();
//     const month = date.getMonth() + 1;
//     const year = date.getFullYear().toString().slice(-2);

//     const formattedDate = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
//     return formattedDate;
//   }
