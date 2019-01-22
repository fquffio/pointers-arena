const AWS = require('aws-sdk');
const DDB = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

require('aws-apigatewaymanagement-client/clients/apigatewaymanagementapi'); // Add client to namespace.

const APIGW = new AWS.ApiGatewayManagementApi({
  apiVersion: '2018-11-29',
  endpoint: process.env.API_ENDPOINT,
});

exports.handler = async (event) => {
  // Prepare data to be sent to connected clients.
  const data = event.Records.map((record) => {
    const id = record.dynamodb.Keys.ConnectionId.S;

    if (record.eventName === 'INSERT') {
      // Client connected.
      const clientName = record.dynamodb.NewImage.ClientName.S;
      const clientColor = record.dynamodb.NewImage.ClientColor.S;

      return { id, clientName, clientColor };
    }

    const clientName = record.dynamodb.OldImage.ClientName.S;
    const clientColor = record.dynamodb.OldImage.ClientColor.S;
    if (record.eventName === 'REMOVE') {
      // Client disconnected.
      return { id, clientName, clientColor, disconnected: true };
    }

    // Client info updated.
    if (record.dynamodb.NewImage.ClientX && record.dynamodb.NewImage.ClientY) {
      console.log(`New data: ${JSON.stringify(record.dynamodb.NewImage)}`);

      const clientX = parseFloat(record.dynamodb.NewImage.ClientX.N);
      const clientY = parseFloat(record.dynamodb.NewImage.ClientY.N);

      return { id, clientName, clientColor, clientX, clientY };
    }

    return { id, clientName, clientColor };
  });
  console.log(`Sending notification to all connected clients: ${JSON.stringify(data)}`);

  // Get list of connected clients.
  const result = await DDB.scan({
    TableName: process.env.TABLE_NAME,
    ProjectionExpression: 'ConnectionId',
  }).promise();

  const notifiedClients = await Promise.all(
    result.Items.map(async ({ ConnectionId }) => {
      try {
        const clientData = JSON.parse(JSON.stringify(data))
          .filter((datum) => datum.id !== ConnectionId)
          .map((datum) => {
            delete datum.id;

            return datum;
          });

        if (clientData.length === 0) {
          // No data to send.
          return { ConnectionId, connected: null };
        }

        await APIGW.postToConnection({
          ConnectionId,
          Data: JSON.stringify(clientData),
        }).promise();

        return { ConnectionId, connected: true };
      } catch (e) {
        if (e.statusCode === 410) {
          return { ConnectionId, connected: false };
        } else {
          throw e;
        }
      }
    })
  );

  const goneClients = notifiedClients.filter((client) => client.connected === false);
  if (goneClients.length) {
    await DDB.batchWrite({
      RequestItems: {
        [process.env.TABLE_NAME]: goneClients.map(({ ConnectionId }) => ({ DeleteRequest: { Key: { ConnectionId } } })),
      },
    }).promise();
  }
};
