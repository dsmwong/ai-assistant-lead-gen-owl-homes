const twilio_version = require('twilio/package.json').version;

exports.handler = async function(context, event, callback) {
  const { createResponse, success, error } = require(Runtime.getAssets()['/utils/response.js'].path);
  const ProviderFactory = require(Runtime.getAssets()['/providers/factory.js'].path);

  console.log(`Entered ${context.PATH} node version ${process.version} twilio version ${twilio_version}`);
  const FUNCTION_NAME = context.PATH.split('/').pop();

  const db = ProviderFactory.getDatabase(context); 
  
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

  try {
    console.log(`[${FUNCTION_NAME}] Event:`, event);

    // remove json markup from event body
    const cleanBody = event.Body.replace(/```json/g, '').replace(/```/g, '');
    console.log(`[${FUNCTION_NAME}] cleanBody:`, cleanBody);

    const sessionData = {
      session_id: event.SessionId,
      assistant_id: event.AssistantSid,
      identity: event.Identity,
      lead: JSON.parse(cleanBody),
      flagged: event.Flagged,
      status: event.Status,
      updated_at: new Date().toISOString()
    };
    console.log(`[${FUNCTION_NAME}] Session Data:`, sessionData);

    // Get Inbound Email data by SessionId
    const inboundEmails = await db.getInboundEmailsBySessionId(sessionData.session_id);
    if (!inboundEmails) {
      throw new Error('Inbound email not found for this session');
    }
    console.log(`[${FUNCTION_NAME}] Inbound Email:`, inboundEmails[0]);

    // Check if a lead exist for the email thread. If it does, use the existing lead. 
    const existingLead = await db.getSCLeadByLastMessageId(inboundEmails[0].get('original_msg_ref'));
    let sessionId, leadId;
    if (existingLead) {
      console.log(`[${FUNCTION_NAME}] Existing lead found:`, existingLead);
      sessionId = existingLead.get('aia_conversation_session');
    } else {
      // Create lead using database provider
      leadId = await db.createSCLead({
        first_name: sessionData.lead.FirstName || 'No First Name in Signature',
        last_name: sessionData.lead.LastName || 'No Last Name in Signature',
        email: sessionData.lead.Email || 'No Email in Signature',
        phone: sessionData.lead.PhoneNumber ? sessionData.lead.PhoneNumber.replace(/\s/g, '') : 'No Phone in Signature',
        summary: sessionData.lead.Intent,
        original_body: sessionData.lead.Body,
        company: sessionData.lead.Company || 'No Company in Signature',
        last_message_id: inboundEmails[0].get('message_id'),
        status: 'New',
      });
      console.log(`[${FUNCTION_NAME}] SC Lead created successfully:`, leadId);
    }

    // Call the AI Assistant to process the lead
    const identity = event.Identity;
    const messageConfig = {
      identity: identity,
      "session_id": sessionId ? sessionId.replace('webhook:', '') : sessionId,
      body: ( sessionData.lead.Body || 'Empty message') + `\n\nRegards ${sessionData.lead.FirstName} ${sessionData.lead.LastName}`,
      webhook: `https://${context.FUNCTIONS_DOMAIN}/backend/process-ai-response`,
      mode: 'email',
    };

    console.log(`[${FUNCTION_NAME}] Message Config with ${context.SC_REP_ASSISTANT_ID}`, JSON.stringify(messageConfig, null, 2));

    // Call AI Assistant to extract lead information
    const message = await client.assistants.v1
      .assistants(context.SC_REP_ASSISTANT_ID)
      .messages.create(messageConfig);

    console.log(`[${FUNCTION_NAME}] Assistant response:`,   JSON.stringify(message, null, 2)
    );

    // Update the lead if it was newly created
    if( leadId ) {
      const updatedLead = await db.updateSCLead(leadId, {
        'aia_conversation_session': 'webhook:' + message.sessionId,
      });
    }

    return callback(null, createResponse(200, success(sessionData)));
  }  catch (err) {
    console.error(`[${FUNCTION_NAME}] Error sending to assistant:`, err);
    
    const statusCode = err.message.includes('Missing required') || 
                      err.message.includes('Invalid email') ? 400 : 500;

    return callback(null, createResponse(statusCode, error(
        err.message,
        statusCode,
        process.env.NODE_ENV === 'development' ? {
            stack: err.stack,
            code: err.code,
            status: err.status,
            more_info: err.more_info
        } : undefined
    )));
  }
};