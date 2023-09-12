const AWS = require("aws-sdk");

const documentClient = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
  try {
    if (typeof event.body !== "string") {
      const error = new Error("Invalid request body. Expected JSON string!");
      error.statusCode = 400;
      throw error;
    }

    const requestBody = JSON.parse(event.body);

    if (!requestBody?.APPLICATION_ID) {
      const error = new Error("Missing required fields: APPLICATION_ID");
      error.statusCode = 400;
      throw error;
    }

    const { APPLICATION_ID } = requestBody;

    const params = {
      TableName: "ApplicationDetails",
      Key: {
        APPLICATION_ID,
      },
    };

    let { Item } = await documentClient.get(params).promise();

    if (Item.APPLICATION_STATUS && Item.APPLICATION_STATUS !== "VIEWED") {
      const updateParams = {
        TableName: "ApplicationDetails",
        Key: {
          APPLICATION_ID,
        },
        UpdateExpression: `SET APPLICATION_STATUS = :value`,
        ExpressionAttributeValues: {
          ":value": "VIEWED",
        },
        ReturnValues: "UPDATED_NEW",
      };

      const data = await documentClient.update(updateParams).promise();
      Item = data.Item;
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST",
      },
      body: JSON.stringify({
        Item,
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
