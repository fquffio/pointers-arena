const AWS = require('aws-sdk');
const DDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

exports.handler = async (event) => {
  console.log(`Received message with body: ${event.body}`);

  // Validate data.
  const body = JSON.parse(event.body);
  const clientX = body.clientX;
  const clientY = body.clientY;
  if (typeof clientX !== 'number' || isNaN(clientX) || clientX < 0 || clientX > 1) {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: 'clientX must be in range [0, 1]' }),
    }
  }
  if (typeof clientY !== 'number' || isNaN(clientY) || clientY < 0 || clientY > 1) {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: 'clientY must be in range [0, 1]' }),
    }
  }

  try {
    // Update client info in DynamoDB.
    await DDB.update({
      TableName: process.env.TABLE_NAME,
      Key: {
        ConnectionId: event.requestContext.connectionId,
      },
      UpdateExpression: 'set ClientX = :clientX, ClientY = :clientY',
      ExpressionAttributeValues: {
        ':clientX': clientX,
        ':clientY': clientY,
      },
    }).promise();
  } catch (error) {
    console.error(`Unable to update position: ${error}`);

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
