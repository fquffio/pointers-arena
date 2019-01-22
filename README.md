Pointers Arena
==============

This is a sample application that uses several feature of WebSocket APIs in
Amazon API Gateway.

It is composed of a simple WebSocket that receives updates from clients about
the position of mouse pointer within an element (the "Arena") and notifies all
other connected clients about the new position, so that other pointers can be
shown in the Arena.

Getting started
---------------

0. **Prerequisites**

    The following steps assume you have:

      - AWS CLI installed and configured with credentials for an active AWS account
      - a Route53 Hosted Zone (e.g. `example.com.`)
      - a valid ACM certificate for `*.example.com`

1. **Create WebSocket API**

    Log in into AWS Console, navigate to API Gateway console and create a new
    WebSocket API. Specify `$request.body.action` as route selection expression.

    You will set up routes later, once Lambda functions are ready.

2. **Update config**

    Copy `public/info.sample.json` in `public/info.json` and update the WebSocket URL.

    Change relevant variables in `Makefile` (`AWS_PROFILE`, `AWS_DEFAULT_REGION`,
    `PACKAGE_BUCKET`, `SITE_HOSTNAME` namely) or remember to _always_ pass these
    values when invoking `make` from the command line.

3. **Deploy CloudFormation Stack**

    Run `make` to package the CloudFormation template, then deploy a new Stack from
    the console using the generated `template.yml`. Wait until all resources are
    ready (might take a while).

4. **Configure and deploy WebSocket API**

    Set up routes for your WebSocket API in the Amazon API Gateway console:

      - `$connect` should point to the created `OnConnect` Lambda function.
      - `$disconnect` should point to the created `OnDisconnect` Lambda function.
      - `list` should point to the created `OnList` Lambda function.
        **Set up integration response for this route!**
      - `move` should point to the created `OnMove` Lambda function.

    Create a new deployment for your API.

5. **Deploy HTML+JS application**

    Run `make deploy` to build and deploy client application.

    Assets are uploaded to S3 and served via CloudFront.

Infrastructure overview
-----------------------

Client connections are managed by Amazon API Gateway, that routes WebSocket frames
to the appropriate Lambda function.

When a client opens a new connection, the `OnConnect` Lambda function is invoked.
This function is responsible for adding a new item in a DynamoDB table storing
the connection ID (required to send frames to the client) and a randomly generated
client name and color (used for display purposes and to avoid exposing connection ID).

When a client sends a `{"action": "list"}` frame, the `OnList` Lambda function
is invoked. This function is responsible for fetching all items in the DynamoDB
table and sending a frame to the requesting client containing all pointers in the
Arena. The frame is sent "synchronously" using Integration response: the result
of the Lambda function is streamed to the client.

When a client sends a `{"action": "move", "clientX": 0.1, "clientY": 0.9}` frame,
the `OnMove` Lambda function is invoked. This function is responsible for updating
the item in DynamoDB with the new pointer position.

When a client disconnects, the `OnDisconnect` Lambda function is invoked. This
function is responsible for deleting the relevant item from DynamoDB.

Last but not least, the `TableTriggers` Lambda function is attached to the
DynamoDB Stream for the table that stores client info. This function is responsible
for analyzing changes in data and sending frames to all other connected clients
containing updates.
