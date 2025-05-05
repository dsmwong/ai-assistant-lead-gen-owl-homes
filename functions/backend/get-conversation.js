exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  
  // Enable CORS
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'GET');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { sessionId } = event;
    if (!sessionId) {
      response.setStatusCode(400);
      response.setBody({ error: 'Session ID is required' });
      return callback(null, response);
    }

    // Initialize Twilio client
    let client;
    if( context.FUNCTIONS_DOMAIN === "dawong.au.ngrok.io" || context.FUNCTIONS_DOMAIN === "localhost:3000" ) {
      client = require('twilio')(
        context.TWILIO_ACCOUNT_SID,
        context.TWILIO_AUTH_TOKEN
      );
    } else {
      client = context.getTwilioClient();
    }

    console.log('Fetching messages for session:', sessionId);
    console.log('Encode for session:', encodeURIComponent(sessionId));
    // Fetch messages for the session
    const messages = await client.assistants.v1
      .sessions(sessionId)
      .messages
      .list({ limit: 50 });

    // Format messages
    const formattedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      timestamp: message.dateCreated,
      author: {
        role: message.role,
        identity: message.identity
      }
    }));

    // Sort messages by timestamp
    formattedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    response.setBody(formattedMessages);
    return callback(null, response);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    response.setStatusCode(500);
    response.setBody({ error: 'Failed to fetch conversation messages' });
    return callback(null, response);
  }
}; 