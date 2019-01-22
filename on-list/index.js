const AWS = require('aws-sdk');
const DDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

exports.handler = async (event) => {
  try {
    // List connected clients position set.
    const result = await DDB.scan({
      TableName: process.env.TABLE_NAME,
      FilterExpression: '(attribute_exists(ClientX) and attribute_exists(ClientY)) or ConnectionId = :connectionId',
      ExpressionAttributeValues: {
        ':connectionId': event.requestContext.connectionId,
      },
    }).promise();

    const data = result.Items.map(({ ConnectionId, ClientName, ClientColor, ClientX, ClientY }) => ({ clientName: ClientName, clientColor: ClientColor, clientX: ClientX, clientY: ClientY, me: ConnectionId === event.requestContext.connectionId }));

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    }
  } catch (error) {
    console.error(`Unable to list connected clients: ${error}`);

    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error }),
    };
  }
};
