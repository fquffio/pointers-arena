const AWS = require('aws-sdk');
const DDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

exports.handler = async (event) => {
  try {
    // Remove client from DynamoDB.
    await DDB.delete({
      TableName: process.env.TABLE_NAME,
      Key: {
        ConnectionId: event.requestContext.connectionId,
      },
    }).promise();
  } catch (error) {
    console.error(`Unable to delete connection: ${error}`);

    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true }),
  };
};
