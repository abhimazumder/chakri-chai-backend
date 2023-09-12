const AWS = require("aws-sdk");
const { verifyToken } = require("../utils/verifyToken");
const CryptoJS = require("crypto-js");

const s3 = new AWS.S3();

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

    if (!requestBody?.OBJ_KEY) {
      const error = new Error("Missing required fields: OBJ_KEY!");
      error.statusCode = 400;
      throw error;
    }

    const { OBJ_KEY } = requestBody;

    const decryptedObjKey = CryptoJS.AES.decrypt(
      OBJ_KEY,
      process.env.CRYPTO_SECRET_KEY
    ).toString(CryptoJS.enc.Utf8);

    const extensionToMimetype = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    const fileExtension = decryptedObjKey.split(".").pop().toLowerCase();
    const mimeType =
      extensionToMimetype[fileExtension] || "application/octet-stream";

    const params = {
      Bucket: "chakri-chai-backend-dev-resumebucket-u9y8kwv5j2hm",
      Key: decryptedObjKey,
      Expires: 3600,
      ResponseContentDisposition: "inline",
      ResponseContentType: mimeType,
    };

    const preSignedURL = s3.getSignedUrl("getObject", params);

    const encryptedPreSignedURL = CryptoJS.AES.encrypt(
      preSignedURL,
      process.env.CRYPTO_SECRET_KEY
    ).toString();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST",
      },
      body: JSON.stringify({
        URL: encryptedPreSignedURL,
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
