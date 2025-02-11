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
    const client = context.getTwilioClient();

    // Fetch messages for the session
    const messages = await client.assistants.v1
      .sessions(sessionId)
      .messages
      .list({ limit: 50 });

    // Format messages
    const formattedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      timestamp: message.date_created,
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