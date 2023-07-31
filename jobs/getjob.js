const AWS = require("aws-sdk");

const documentClient = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  try {
    const requestBody = JSON.parse(event.body);

    if (!requestBody.JOB_ID) {
      const error = new Error("Missing required fields: JOB_ID!");
      error.statusCode = 400;
      throw error;
    }

    const { JOB_ID } = requestBody;

    const params = {
      TableName: "JobDetails",
      Key: {
        JOB_ID,
      },
    };

    const data = await documentClient.get(params).promise();

    if (!data.Item) {
      const error = new Error("Item doesn't exist!");
      error.statusCode = 404;
      throw error;
    }

    const {
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
    } = data.Item;

    const formattedDescription = {};

    DESCRIPTION.forEach((description, index) => {
      const descriptionKey = `section-${index+1}`;
      formattedDescription[descriptionKey] = {
        SECTION_NAME: description["Section Name"],
        SECTION_ID: descriptionKey,
        CONTENT: description["Content"],
      }
    })

    const DATA = {
      META_DATA: {
        JOB_ID,
        JOB_TITLE,
        JOB_LOCATIONS,
        POSTING_DATE,
        APPLICATION_DEADLINE,
        JOB_FEATURES: {
          EMPLOYMENT_TYPE,
          WORK_MODE,
          REQUIRED_EXPERIENCE,
          OPENNINGS,
          COMPENSATION,
        }
      },
      DESCRIPTION: formattedDescription
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST",
      },
      body: JSON.stringify({
        DATA: DATA
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
