const AWS = require("aws-sdk");
const shortid = require("shortid");

const documentClient = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

module.exports.handler = async (event) => {
  try {
    if (typeof event.body !== "string") {
      const error = new Error("Invalid request body. Expected JSON string!");
      error.statusCode = 400;
      throw error;
    }

    const requestBody = JSON.parse(event.body);

    if (!requestBody?.JOB_ID || !requestBody?.DATA) {
      const error = new Error("Missing required fields: JOB_ID or DATA!");
      error.statusCode = 400;
      throw error;
    }

    const { JOB_ID, DATA } = requestBody;

    const {
      "First Name": FIRST_NAME,
      "Last Name": LAST_NAME,
      Gender: GENDER,
      "Date of Birth": DATE_OF_BIRTH,
      Email: EMAIL_ID,
      "Phone Number": PHONE_NUMBER,
      Address: ADDRESS,
      Experience: EDUCATION,
      Education: EXPEREINCE,
      "Question 1": QUESTION_1,
      "Question 2": QUESTION_2,
      "Question 3": QUESTION_3,
      "Question 4": QUESTION_4,
      Resume: RESUME,
    } = DATA;

    if (
      !FIRST_NAME ||
      !LAST_NAME ||
      !GENDER ||
      !DATE_OF_BIRTH ||
      !EMAIL_ID ||
      !PHONE_NUMBER ||
      !ADDRESS ||
      !QUESTION_1 ||
      !QUESTION_2 ||
      !QUESTION_3 ||
      !QUESTION_4 ||
      !RESUME
    ) {
      const error = new Error(
        "Missing required fields: FIRST_NAME, LAST_NAME, GENDER, DATE_OF_BIRTH, EMAIL_ID, PHONE_NUMBER, ADDRESS, QUESTION_1, QUESTION_2, QUESTION_3, QUESTION_4 or RESUME!"
      );
      error.statusCode = 400;
      throw error;
    }

    if (
      typeof RESUME !== "object" ||
      !RESUME.BASE64_DATA ||
      !RESUME.FILE_NAME
    ) {
      const error = new Error("Something is wrong in Resume/CV field!");
      error.statusCode = 400;
      throw error;
    }

    if (EXPEREINCE) {
      Object.values(EXPEREINCE).forEach((experience) => {
        const {
          "Job Title/Role": JOB_TITLE_ROLE,
          "Company Name": COMPANY_NAME,
          "Current Job": CURRENT_JOB,
          "Start Date": START_DATE,
          "End Date": END_DATE,
        } = experience;
        if (
          !JOB_TITLE_ROLE ||
          !COMPANY_NAME ||
          !START_DATE ||
          (CURRENT_JOB === true && END_DATE === "")
        ) {
          const error = new Error("Something is wrong in Experience field!");
          error.statusCode = 400;
          throw error;
        }
      });
    }

    if (EDUCATION) {
      Object.values(EDUCATION).forEach((education) => {
        const {
          Degree: DEGREE,
          Specialization: SPECIALIZATION,
          "College/Universisty": COLLEGE_UNIVERSITY,
          From: FROM,
          To: TO,
          "CGPA/Percentage": CGPA_PERCENTAGE,
        } = education;
        if (
          !DEGREE ||
          !SPECIALIZATION ||
          !COLLEGE_UNIVERSITY ||
          !FROM ||
          !TO ||
          !CGPA_PERCENTAGE
        ) {
          const error = new Error("Something is wrong in Education field!");
          error.statusCode = 400;
          throw error;
        }
      });
    }

    const APPLICATION_ID = shortid.generate();

    const { BASE64_DATA, FILE_NAME } = RESUME;

    const objectKey = `${APPLICATION_ID}/${FILE_NAME}`;

    const extensionToMimetype = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    const fileExtension = FILE_NAME.split(".").pop().toLowerCase();
    const contentType =
      extensionToMimetype[fileExtension] || "application/octet-stream";

    const resumeObject = {
      Bucket: "chakri-chai-backend-dev-resumebucket-u9y8kwv5j2hm",
      Key: objectKey,
      Body: Buffer.from(BASE64_DATA, "base64"),
      ContentType: contentType,
    };

    await s3.putObject(resumeObject).promise();

    const jobParams = {
      TableName: "JobDetails",
      Key: {
        JOB_ID: JOB_ID,
      },
    };

    const data = await documentClient.get(jobParams).promise();

    const { JOB_TITLE, USER_ID } = data.Item;

    const ITEM = {
      APPLICATION_ID,
      JOB_ID,
      JOB_TITLE,
      FIRST_NAME,
      LAST_NAME,
      DATE_OF_BIRTH,
      GENDER,
      EMAIL_ID,
      PHONE_NUMBER,
      ADDRESS,
      EXPEREINCE,
      EDUCATION,
      QUESTION_1,
      QUESTION_2,
      QUESTION_3,
      QUESTION_4,
      RESUME: objectKey,
      APPLIED_ON: new Date().toISOString(),
      JOB_POSTER_USER_ID: USER_ID,
      APPLICATION_STATUS: "APPLIED",
    };

    const createParams = {
      TableName: "ApplicationDetails",
      Item: ITEM,
    };

    await documentClient.put(createParams).promise();

    const incrementParams = {
      TableName: "JobDetails",
      Key: {
        JOB_ID,
      },
      UpdateExpression: "SET #fieldName = #fieldName + :incrementValue",
      ExpressionAttributeNames: {
        "#fieldName": "TOTAL_APPLICATIONS",
      },
      ExpressionAttributeValues: {
        ":incrementValue": 1,
      },
      ReturnValues: "NONE",
    };

    await documentClient.update(incrementParams).promise();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST",
      },
      body: JSON.stringify({
        APPLICATION_ID,
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
