const AWS = require("aws-sdk");
const CryptoJS = require("crypto-js");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcryptjs");
const shortid = require("shortid");
const dotenv = require("dotenv");

dotenv.config();

const documentClient = new AWS.DynamoDB.DocumentClient();
const AWS_SES = new AWS.SES();

module.exports.handler = async (event) => {
  try {
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

    const UserParams = {
      TableName: "UserDetails",
      Key: {
        EMAIL_ID: decryptedEmailID,
      },
    };

    const data = await documentClient.get(UserParams).promise();

    if (!data?.Item) {
      const error = new Error("Email address is not registered.");
      error.statusCode = 404;
      throw error;
    }

    const OTP = otpGenerator.generate(4, {
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });
    const encryptedOTP = await bcrypt.hash(OTP, 10);

    const sessionToken = shortid.generate();
    const encryptedSessionToken = CryptoJS.AES.encrypt(
      sessionToken,
      process.env.CRYPTO_SECRET_KEY
    ).toString();
    const OTPParams = {
      TableName: "OTPDetails",
      Item: {
        SESSION_TOKEN: sessionToken,
        EMAIL_ID: decryptedEmailID,
        OTP_DATA: encryptedOTP,
        CREATED_AT: new Date().toISOString(),
        EXPIRE_AT: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      },
    };

    await documentClient.put(OTPParams).promise();

    let emailParams = {
      Source: process.env.AWS_SES_SENDER,
      Destination: {
        ToAddresses: [decryptedEmailID],
      },
      ReplyToAddresses: [],
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: `<p>Hi ${data.Item.FIRST_NAME},</p><br><p>Here is the One-Time Password (OTP) you requested to access your Chakri Chai account:</p><p><strong>One-Time Password (OTP): ${OTP}</strong></p><p>This OTP is valid for the next 5 minutes. After this period, it will expire, and a new OTP will be required.</p><p>If you have any concerns about the security of your account or suspect unauthorized activity, please reach out to our support team immediately at <a href='mailto:${process.env.AWS_SES_SENDER}'>${process.env.AWS_SES_SENDER}</a>. We take these issues seriously and will provide swift assistance.</p><p>Remember, this OTP is meant for your use only. Keep it confidential and avoid sharing it with others to ensure the security of your Chakri Chai account.</p><p>Thank you for trusting Chakri Chai with your account. Your confidence in our platform is valued.</p><p>Best regards,<br>Chakri Chai<br>${process.env.AWS_SES_SENDER}</p>`,
          },
          Text: {
            Charset: "UTF-8",
            Data: `Hi ${data.Item.FIRST_NAME},\nHere is the One-Time Password (OTP) you requested to access your Chakri Chai account:\n\nOne-Time Password (OTP): ${OTP}\n\nThis OTP is valid for the next 5 minutes. After this period, it will expire, and a new OTP will be required.\n\nIf you have any concerns about the security of your account or suspect unauthorized activity, please reach out to our support team immediately at ${process.env.AWS_SES_SENDER}. We take these issues seriously and will provide swift assistance.\n\nRemember, this OTP is meant for your use only. Keep it confidential and avoid sharing it with others to ensure the security of your Chakri Chai account.\n\nThank you for trusting Chakri Chai with your account. Your confidence in our platform is valued.\n\nBest regards,\nChakri Chai\n${process.env.AWS_SES_SENDER}`,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "One-Time Password (OTP) Login Request - Action Required",
        },
      },
    };

    const res = await AWS_SES.sendEmail(emailParams).promise();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST",
      },
      body: JSON.stringify({ SESSION_TOKEN: encryptedSessionToken }),
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
