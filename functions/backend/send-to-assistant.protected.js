/**
 * Handles sending messages to the AI Assistant with session management
 * 
 * @param {Object} context - Twilio Function context
 * @param {Object} event - Request payload
 * @param {Function} callback - Callback function
 */
exports.handler = async function(context, event, callback) {
    // Get all utility functions and providers
    const { createResponse, success, error } = require(Runtime.getAssets()['/utils/response.js'].path);
    const { validateEmail } = require(Runtime.getAssets()['/utils/validation.js'].path);
    const ProviderFactory = require(Runtime.getAssets()['/providers/factory.js'].path);

    // Initialize providers
    const db = ProviderFactory.getDatabase(context);
    
    try {
        // Initialize Twilio client
        const twilio = require('twilio');
        const client = twilio(context.TWILIO_ACCOUNT_SID, context.TWILIO_AUTH_TOKEN);

        // Validate configuration
        const missingConfig = ProviderFactory.validateConfig(context);
        if (missingConfig) {
            throw new Error(`Missing configuration: ${JSON.stringify(missingConfig)}`);
        }

        // Validate required fields
        if (!event.email) {
            throw new Error('Missing required field: email');
        }

        if (!validateEmail(event.email)) {
            throw new Error('Invalid email format');
        }

        // Prepare identity
        const identity = `email:${event.email}`;

        // Check for existing session
        const existingSession = await db.getSession(identity);

        // Prepare message configuration
        let messageConfig;
        if (existingSession) {
            // Clean up session ID if needed
            const sessionId = existingSession.get('session_id').replace('webhook:', '');

            messageConfig = {
                identity: identity,
                body: event.response,
                webhook: `https://${context.FUNCTIONS_DOMAIN}/backend/log-sessions`,
                session_id: sessionId,
                mode: "email"
            };
        } else {
            // Create new session with initial message
            if (!event.first_name || !event.area_code) {
                throw new Error('Missing required fields for new lead: first_name and area_code');
            }

            messageConfig = {
                identity: identity,
                body: `A new lead, named ${event.first_name}, was submitted and they are interested in properties in ${event.area_code}. Write an email to them with some property recommendations and ask if they are interested in scheduling time with a Owl Home Agent.`,
                webhook: `https://${context.FUNCTIONS_DOMAIN}/backend/log-sessions`,
                mode: "email"
            };
        }

        // Send message to AI Assistant
        const message = await client.assistants.v1
            .assistants(context.ASSISTANT_ID)
            .messages
            .create(messageConfig);

        // Return success response
        return callback(null, createResponse(200, success({
            message_status: message.status,
            session_id: message.session_id,
            account_sid: message.account_sid,
            body: message.body,
            flagged: message.flagged,
            aborted: message.aborted
        })));

    } catch (err) {
        console.error('Error sending to assistant:', err);

        // Determine appropriate status code
        const statusCode = err.message.includes('Missing required') || 
                          err.message.includes('Invalid email') ? 400 : 500;

        return callback(null, createResponse(statusCode, error(
            err.message,
            statusCode,
            process.env.NODE_ENV === 'development' ? {
                stack: err.stack,
                details: err.code ? {
                    code: err.code,
                    status: err.status,
                    more_info: err.more_info
                } : undefined
            } : undefined
        )));
    }
};