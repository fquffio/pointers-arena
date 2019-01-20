const AWS = require('aws-sdk');
const DDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

require('aws-apigatewaymanagement-client/clients/apigatewaymanagementapi'); // Add client to namespace.

exports.handler = async (event) => {
  try {
    // List connected clients position set.
    const result = await DDB.scan({
      TableName: process.env.TABLE_NAME,
      FilterExpression: 'attribute_exists(ClientX) and attribute_exists(ClientY) and ConnectionId <> :connectionId',
      ExpressionAttributeValues: {
        ':connectionId': event.requestContext.connectionId,
      },
    }).promise();

    const data = result.Items.map(({ ClientName, ClientX, ClientY }) => ({ clientName: ClientName, clientX: ClientX, clientY: ClientY }));
    const APIGW = new AWS.ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: `${event.requestContext.domainName}/${event.requestContext.stage}`,
    });

    // Send data to current client.
    await APIGW.postToConnection({
      ConnectionId: event.requestContext.connectionId,
      Data: JSON.stringify(data),
    }).promise();
  } catch (error) {
    console.error(`Unable to list connected clients: ${error}`);

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
