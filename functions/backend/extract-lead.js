const { parse } = require('path');

const twilio_version = require('twilio/package.json').version;

exports.handler = async function(context, event, callback) {
    const { createResponse, success, error } = require(Runtime.getAssets()['/utils/response.js'].path);
    const { parseEmailReply } = require(Runtime.getAssets()['/utils/email.js'].path);
    const ProviderFactory = require(Runtime.getAssets()['/providers/factory.js'].path);

    console.log(`Entered ${context.PATH} node version ${process.version} twilio version ${twilio_version}`);
    const FUNCTION_NAME = context.PATH.split('/').pop();
    
    // Initialize providers
    const db = ProviderFactory.getDatabase(context);
    const emailProvider = ProviderFactory.getEmailProvider(context);
    console.log(`[${FUNCTION_NAME}] Event body:`, event.body);
    console.log(`[${FUNCTION_NAME}] Event raw body: ${JSON.stringify(event)}`);

    try {

        console.log(`[${FUNCTION_NAME}] Event:`, event);
        console.log(`[${FUNCTION_NAME}] Context:`, context);
        
        let client;
        if( context.FUNCTIONS_DOMAIN === "dawong.au.ngrok.io" || context.FUNCTIONS_DOMAIN === "localhost:3000" || context.DOMAIN_NAME === "localhost:3000" || context.DOMAIN_NAME === "dawong.au.ngrok.io" ) {
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

        console.log(`[${FUNCTION_NAME}] Parsed Email:`, parsedEmail);
        
        if (!parsedEmail.messageId) {
            throw new Error('Message-ID not found in email headers');
        }

        const identity = `email:${parsedEmail.fromEmail}`;

        let sessionId, references;
        if( parsedEmail.threadData && parsedEmail.threadData.references ) {
            references = parsedEmail.threadData.references
            console.log(`[${FUNCTION_NAME}] References:`, references);
            const lastInboundEmail = await db.getInboundEmailsByMessageId(references);
            if (!lastInboundEmail) {
                throw new Error('Inbound email not found for this session');
            }
            console.log(`[${FUNCTION_NAME}] Last Inbound Email:`, lastInboundEmail[0]);
            sessionId = lastInboundEmail[0].get('session_id');
        }

        // Parse and clean the email reply
        const mostRecentReply = parseEmailReply({
            text: parsedEmail.text,
            html: parsedEmail.html
        });

        // Log the inbound email using database provider
        const emailRecord = await db.logInboundEmail({
            message_id: parsedEmail.messageId,
            message: mostRecentReply || 'Empty message',
            original_msg_ref: references,
            subject: parsedEmail.subject,
            identity: identity
        });

        console.log(`[${FUNCTION_NAME}] Email Record:`, emailRecord);

        // Pack the message for the lead extraction assistant
        const messageConfig = {
            identity: identity,
            "session_id": sessionId ? sessionId.replace('webhook:', '') : sessionId,
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

        
        const updateInboundEmails = await db.updateInboundEmails(emailRecord.id, {
            // if sessionId starts with 'webhook:', remove it   
            session_id: `webhook:${message.sessionId}`,
        });

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