exports.handler = async function(context, event, callback) {
    const ProviderFactory = require(Runtime.getAssets()['/providers/factory.js'].path);
    const { createResponse, success, error } = require(Runtime.getAssets()['/utils/response.js'].path);
    const { validateSessionId } = require(Runtime.getAssets()['/utils/validation.js'].path);

    console.log('[log-sessions] Received webhook request:', {
        method: event.request?.method,
        headers: event.request?.headers,
        body: event
    });

    try {
        let client;
        if( context.FUNCTIONS_DOMAIN === "dawong.au.ngrok.io" || context.FUNCTIONS_DOMAIN === "localhost:3000" ) {
          client = require('twilio')(
            context.TWILIO_ACCOUNT_SID,
            context.TWILIO_AUTH_TOKEN
          );
        } else {
          client = context.getTwilioClient();
        }

        const db = ProviderFactory.getDatabase(context);

        if (!event.SessionId || !event.Identity || !event.Body) {
            console.error('[log-sessions] Missing required data:', { 
                SessionId: !!event.SessionId, 
                Identity: !!event.Identity, 
                Body: !!event.Body 
            });
            throw new Error('Missing required session data');
        }

        console.log('[log-sessions] Processing session with data:', {
            SessionId: event.SessionId,
            Identity: event.Identity,
            AssistantSid: event.AssistantSid
        });

        if (!validateSessionId(event.SessionId)) {
            throw new Error('Invalid session ID format');
        }

        const sessionData = {
            session_id: event.SessionId,
            assistant_id: event.AssistantSid,
            identity: event.Identity,
            last_message: event.Body,
            updated_at: new Date().toISOString()
        };

        const existingSession = await db.getSession(sessionData.identity);
        let sessionRecord;

        if (existingSession) {
            console.log('[log-sessions] Updating existing session:', existingSession.id);
            sessionRecord = await db.updateSession(existingSession.id, {
                last_message: sessionData.last_message,
                updated_at: sessionData.updated_at
            });
        } else {
            console.log('[log-sessions] Creating new session');
            sessionData.created_at = sessionData.updated_at;
            sessionRecord = await db.createSession(sessionData);
        }

        console.log('[log-sessions] Session record processed:', sessionRecord.id);

        const messageConfig = {
            identity: sessionData.identity,
            body: `Please use the "Outbound Email Grader" tool for the following email body: ${sessionData.last_message}`,
            mode: "email"
        };

        console.log('[log-sessions] Sending to AI Assistant Manager:', messageConfig);

        const assistantMessage = await client.assistants.v1
            .assistants(context.MANAGER_ASSISTANT_ID)
            .messages
            .create(messageConfig);

        console.log('[log-sessions] AI Assistant Manager response:', assistantMessage);

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
        console.error('[log-sessions] Error processing session:', err);
        
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