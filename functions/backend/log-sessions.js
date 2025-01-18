const Airtable = require('airtable');

exports.handler = async function(context, event, callback) {
  // Initialize Airtable
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
    
    callback(null, {
      status: 'success',
      data: response
    });
    
  } catch (error) {
    callback(error);
  }
};