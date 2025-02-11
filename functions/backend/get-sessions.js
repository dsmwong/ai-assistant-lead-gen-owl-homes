const ProviderFactory = require(Runtime.getAssets()['/providers/factory.js'].path);

exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  
  // Enable CORS
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'GET');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    // Get database provider
    const database = ProviderFactory.getDatabase(context);
    
    // Get all sessions from Airtable
    const sessions = await database.base('Sessions')
      .select({
        sort: [{ field: 'created_at', direction: 'desc' }]
      })
      .all();
    
    // Format the response
    const formattedSessions = sessions.map(record => ({
      session_id: record.get('session_id'),
      assistant_id: record.get('assistant_id'),
      identity: record.get('identity'),
      subject: record.get('subject'),
      last_message: record.get('last_message'),
      outbound_email_body: record.get('outbound_email_body'),
      recommended_email_body: record.get('recommended_email_body'),
      manager_score: record.get('manager_score'),
      outbound_email_status: record.get('outbound_email_status'),
      updated_at: record.get('updated_at'),
      created_at: record.get('created_at')
    }));

    response.setBody(formattedSessions);
    return callback(null, response);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    response.setStatusCode(500);
    response.setBody({ error: 'Failed to fetch sessions' });
    return callback(null, response);
  }
}; 