const { createResponse, success, error } = require('../utils/response');
const { validateSessionId } = require('../utils/validation');
const ProviderFactory = require('../providers/factory');

exports.handler = async function(context, event, callback) {
    try {
        // Initialize Twilio client and providers
        const twilio = require('twilio');
        const client = twilio(context.TWILIO_ACCOUNT_SID, context.TWILIO_AUTH_TOKEN);
        const db = ProviderFactory.getDatabase(context);

        // Validate configuration
        const missingConfig = ProviderFactory.validateConfig(context);
        if (missingConfig) {
            throw new Error(`Missing configuration: ${JSON.stringify(missingConfig)}`);
        }

        // Validate session data
        if (!event.SessionId || !event.Identity || !event.Body) {
            throw new Error('Missing required session data');
        }

        if (!validateSessionId(event.SessionId)) {
            throw new Error('Invalid session ID format');
        }

        // Prepare session data
        const sessionData = {
            session_id: event.SessionId,
            assistant_id: event.AssistantSid,
            identity: event.Identity,
            last_message: event.Body,
            updated_at: new Date().toISOString()
        };

        // Get existing session or create new one
        const existingSession = await db.getSession(sessionData.identity);
        let sessionRecord;

        if (existingSession) {
            // Update existing session
            sessionRecord = await db.updateSession(existingSession.id, {
                last_message: sessionData.last_message,
                updated_at: sessionData.updated_at
            });
        } else {
            // Create new session
            sessionData.created_at = sessionData.updated_at;
            sessionRecord = await db.createSession(sessionData);
        }

        // Prepare message for AI Assistant Manager
        const messageConfig = {
            identity: sessionData.identity,
            body: `Please use the "Outbound Email Grader" tool for the following email body: ${sessionData.last_message}`,
            mode: "email"
        };

        // Send to AI Assistant Manager
        const assistantMessage = await client.assistants.v1
            .assistants(context.ASSISTANT_ID_MANAGER)
            .messages
            .create(messageConfig);

        // Return combined success response
        return callback(null, createResponse(200, success({
            session_data: sessionRecord,
            assistant_response: {
                message_status: assistantMessage.status,
                session_id: assistantMessage.session_id,
                account_sid: assistantMessage.account_sid,
                body: assistantMessage.body,
                flagged: assistantMessage.flagged,
                aborted: assistantMessage.aborted
            }
        })));

    } catch (err) {
        console.error('Error processing session:', err);

        // Determine appropriate status code
        const statusCode = err.message.includes('Missing required') ? 400 : 500;

        return callback(null, createResponse(statusCode, error(
            err.message,
            statusCode,
            {
                code: err.code,
                status: err.status,
                more_info: err.more_info
            }
        )));
    }
};