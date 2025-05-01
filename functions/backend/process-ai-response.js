const twilio_version = require('twilio/package.json').version;

exports.handler = async function(context, event, callback) {
  const { createResponse, success, error } = require(Runtime.getAssets()['/utils/response.js'].path);
  const ProviderFactory = require(Runtime.getAssets()['/providers/factory.js'].path);

  console.log(`Entered ${context.PATH} node version ${process.version} twilio version ${twilio_version}`);
  const FUNCTION_NAME = context.PATH.split('/').pop();

  const db = ProviderFactory.getDatabase(context); 
  const emailProvider = ProviderFactory.getEmailProvider(context);
  
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
    const cleanBody = event.Body.replace(/```html/g, '').replace(/```/g, '');
    console.log(`[${FUNCTION_NAME}] cleanBody:`, cleanBody);

    const sessionData = {
      session_id: event.SessionId,
      assistant_id: event.AssistantSid,
      identity: event.Identity,
      body: cleanBody,
      flagged: event.Flagged,
      status: event.Status,
      updated_at: new Date().toISOString(),
    };
    console.log(`[${FUNCTION_NAME}] Session Data:`, sessionData);

    const sclead = await db.getSCLeadByConversationSession(sessionData.session_id);
    if (!sclead) {
      throw new Error('SC Lead not found for this session');
    }

    const inboundEmails = await db.getInboundEmailsByMessageId(sclead.get('last_message_id'));
    if (!inboundEmails) {
      throw new Error('Inbound email not found for this session');
    }
    console.log(`[${FUNCTION_NAME}] Inbound Email:`, inboundEmails[0]);

    // Send the email
    const emailSend = await emailProvider.send(event.Identity, cleanBody, 'Re: ' + inboundEmails[0].get('subject'), {lastMessageId: sclead.get('last_message_id')});
    console.log(`[${FUNCTION_NAME}] Email sent successfully:`, emailSend);

    // Create lead using database provider
    // const leadId = await db.createSCLead({
    //   first_name: sessionData.lead.FirstName,
    //   last_name: sessionData.lead.LastName,
    //   email: sessionData.lead.Email,
    //   phone: sessionData.lead.PhoneNumber.replace(/\s/g, ''),
    //   summary: sessionData.lead.Intent,
    //   original_body: sessionData.lead.Body,
    //   company: sessionData.lead.Company,
    //   status: 'New',
    // });
    // console.log(`[${FUNCTION_NAME}] SC Lead created successfully:`, leadId);

    // // Call the AI Assistant to process the lead
    // const identity = `email:${sessionData.lead.Email}`;
    // const messageConfig = {
    //   identity: identity,
    //   // "session_id": event.sessionId,  // no exiting session
    //   body: ( sessionData.lead.Body || 'Empty message') + `Regards ${sessionData.lead.FirstName} ${sessionData.lead.LastName}`,
    //   webhook: `https://${context.FUNCTIONS_DOMAIN}/backend/process-ai-response`,
    //   mode: 'email',
    // };

    // console.log(`[${FUNCTION_NAME}] Message Config with ${context.SC_REP_ASSISTANT_ID}`, JSON.stringify(messageConfig, null, 2));

    // // Call AI Assistant to extract lead information
    // const message = await client.assistants.v1
    //   .assistants(context.SC_REP_ASSISTANT_ID)
    //   .messages.create(messageConfig);

    // console.log(`[${FUNCTION_NAME}] Assistant response:`,   JSON.stringify(message, null, 2)
    // );

    // const updatedLead = await db.updateSCLead(leadId, {
    //   'aia_conversation_session': message.sessionId,
    // });

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