const AWS = require("aws-sdk");

const documentClient = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  try {
    if (typeof event.body !== "string"){
        const error = new Error("Invalid request body. Expected JSON string!");
        error.statusCode = 400;
        throw error;
    }

    const { DATA } = JSON.parse(event.body);

    if(!DATA){
        const error = new Error("Missing required fields: DATA!");
        error.statusCode = 400;
        throw error;
    }

    const {
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

    if(!JOB_ID || !JOB_TITLE || !UNFORMATTED_JOB_LOCATIONS || !POSTING_DATE || !APPLICATION_DEADLINE){
        const error = new Error("Missing required fields: Job ID, Job Title, Job Locations, Posting Date or Application Deadline!");
        error.statusCode = 400;
        throw error;
    }

    const JOB_LOCATIONS = formatJobLocations(UNFORMATTED_JOB_LOCATIONS);

    const ITEM = {
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
    };

    const params = {
        TableName: "JobDetails",
        Item: ITEM
    }

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
    unformattedJobLocations.forEach(location => {
        formattedJobLocations[location["Country"]] = [];
    })
    unformattedJobLocations.forEach(location => {
        formattedJobLocations[location["Country"]].push(location["City"])
    })
    return formattedJobLocations;
}

// function formatDate(unformattedDate) {
//     const date = new Date(unformattedDate);
//     const day = date.getDate();
//     const month = date.getMonth() + 1;
//     const year = date.getFullYear().toString().slice(-2);
  
//     const formattedDate = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
//     return formattedDate;
//   }
