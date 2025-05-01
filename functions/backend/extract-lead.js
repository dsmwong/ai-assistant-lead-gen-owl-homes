const FUNCTION_NAME = 'extract-contacts';

exports.handler = async function(context, event, callback) {
    const { createResponse, success, error } = require(Runtime.getAssets()['/utils/response.js'].path);
    const { parseEmailReply } = require(Runtime.getAssets()['/utils/email.js'].path);
    const ProviderFactory = require(Runtime.getAssets()['/providers/factory.js'].path);
    
    // Initialize providers
    // const db = ProviderFactory.getDatabase(context);
    const emailProvider = ProviderFactory.getEmailProvider(context);
    console.log('[log-inbound-email] Event body:', event.body);
    console.log(`[log-inbound-email] Event raw body: ${JSON.stringify(event)}`);

    try {

        console.log(`[${FUNCTION_NAME}] Event:`, event);
        
        let client;
        if( context.FUNCTIONS_DOMAIN === "dawong.au.ngrok.io" || context.FUNCTIONS_DOMAIN === "localhost:3000" ) {
            client = require('twilio')(
              context.TWILIO_ACCOUNT_SID,
              context.TWILIO_AUTH_TOKEN
            );
        } else {
            client = context.getTwilioClient();
        }
    
        // if (!event.email) {
        //     return callback(null, createResponse(400, error('Missing required field: email', 400)));
        // }

        // if (!validateEmail(event.email)) {
        //     return callback(null, createResponse(400, error('Invalid email format', 400)));
        // }

        // Validate configuration
        const missingConfig = ProviderFactory.validateConfig(context);
        if (missingConfig) {
            throw new Error(`Missing configuration: ${JSON.stringify(missingConfig)}`);
        }

        // Parse inbound email using email provider
        const parsedEmail = emailProvider.parseInbound(event);
        
        if (!parsedEmail.messageId) {
            throw new Error('Message-ID not found in email headers');
        }

        // Parse and clean the email reply
        const mostRecentReply = parseEmailReply({
            text: parsedEmail.text,
            html: parsedEmail.html
        });

        const identity = `email:${parsedEmail.fromEmail}`;

        // Pack the message for the lead extraction assistant
        const messageConfig = {
            identity: identity,
            // "session_id": event.sessionId,
            body: mostRecentReply || 'Empty message',
            webhook: `https://${context.FUNCTIONS_DOMAIN}/backend/parse-lead`,
            mode: "email"
        };

        console.log(`[${FUNCTION_NAME}] Message Config`, JSON.stringify(messageConfig, null, 2));

        // Call AI Assistant to extract lead information
        const message = await client.assistants.v1
            .assistants(context.EXTRACT_ASSISTANT_ID)
            .messages
            .create(messageConfig);

        console.log(`[${FUNCTION_NAME}] Assistant response:`, JSON.stringify(message, null, 2));

        return callback(null, createResponse(200, success({
            message_status: message.status,
            session_id: message.sessionId,
            account_sid: message.accountSid,
            body: message.body,
            flagged: message.flagged,
            aborted: message.aborted
        })));

    } catch (err) {
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