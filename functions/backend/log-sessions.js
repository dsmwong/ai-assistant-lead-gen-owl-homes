const Airtable = require('airtable');

exports.handler = async function(context, event, callback) {
  // Initialize Twilio and Airtable clients
  const twilio = require('twilio');
  const client = twilio(context.TWILIO_ACCOUNT_SID, context.TWILIO_AUTH_TOKEN);
  const base = new Airtable({apiKey: context.AIRTABLE_API_KEY})
    .base(context.AIRTABLE_BASE_ID);
  
  const sessionTable = base('Sessions');
  
  try {
    // Extract relevant data from the event
    const sessionData = {
      session_id: event.SessionId,
      assistant_id: event.AssistantSid,
      identity: event.Identity,
      last_message: event.Body,
      updated_at: new Date().toISOString(),
    };
    
    // Check if session already exists
    const existingRecords = await sessionTable.select({
      filterByFormula: `{session_id} = '${sessionData.session_id}'`,
      maxRecords: 1
    }).firstPage();
    
    let response;
    
    if (existingRecords.length > 0) {
      // Update existing record
      response = await sessionTable.update(existingRecords[0].id, {
        last_message: sessionData.last_message,
        updated_at: sessionData.updated_at
      });
    } else {
      // Create new record
      response = await sessionTable.create({
        session_id: sessionData.session_id,
        assistant_id: sessionData.assistant_id,
        identity: sessionData.identity,
        last_message: sessionData.last_message,
        updated_at: sessionData.updated_at,
        created_at: sessionData.updated_at
      });
    }

    // Create message configuration for AI Assistant Sales Manager
    const messageConfig = {
      identity: sessionData.identity,
      body: `Please use the "Outbound Email Grader" tool for the following email body: ${sessionData.last_message}`,
      mode: "email"
    };

    // Send message to AI Assistant
    const assistantMessage = await client.assistants.v1
      .assistants(context.ASSISTANT_ID_MANAGER)
      .messages
      .create(messageConfig);
    
    // Return combined response
    callback(null, {
      status: 'success',
      session_data: response,
      assistant_response: {
        message_status: assistantMessage.status,
        session_id: assistantMessage.session_id,
        account_sid: assistantMessage.account_sid,
        body: assistantMessage.body,
        flagged: assistantMessage.flagged,
        aborted: assistantMessage.aborted
      }
    });
    
  } catch (error) {
    // Return detailed error response
    callback(error, {
      status: 'error',
      message: error.message,
      details: {
        code: error.code,
        status: error.status,
        more_info: error.more_info
      }
    });
  }
};