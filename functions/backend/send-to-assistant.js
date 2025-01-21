exports.handler = async function(context, event, callback) {
    try {
        // Initialize Twilio and Airtable clients
        const twilio = require('twilio');
        const client = twilio(context.TWILIO_ACCOUNT_SID, context.TWILIO_AUTH_TOKEN);
        const Airtable = require('airtable');
        const base = new Airtable({apiKey: context.AIRTABLE_API_KEY}).base(context.AIRTABLE_BASE_ID);

        // Validate incoming payload
        if (!event.email) {
            throw new Error('Missing required fields: email');
        }

        // Check for existing identity in Airtable Sessions table
        const existingSession = await base('Sessions')
            .select({
                filterByFormula: `{identity} = 'email:${event.email}'`,
                maxRecords: 1
            })
            .firstPage();

        // Prepare message configuration based on existing session
        let messageConfig;
        if (existingSession && existingSession.length > 0) {
            // Use existing session
            const rawSessionId = existingSession[0].fields.session_id;
            const cleanSessionId = rawSessionId.replace('webhook:', '');

            messageConfig = {
                identity: `email:${event.email}`,
                body: event.response,
                webhook: `https://${context.FUNCTIONS_DOMAIN}/backend/log-sessions`,
                session_id: cleanSessionId,
                mode: "email"
            };
        } else {
            // Create new session with full message body
            const messageBody = `A new lead, named ${event.first_name}, was submitted and they are interested in properties in ${event.area_code}. Write an email to them with some property recommendations and ask if they are interested in scheduling time with a Owl Home Agent.`;
            
            messageConfig = {
                identity: `email:${event.email}`,
                body: messageBody,
                webhook: `https://${context.FUNCTIONS_DOMAIN}/backend/log-sessions`,
                mode: "email"
            };
        }

        // Send message to AI Assistant
        const message = await client.assistants.v1
            .assistants(context.ASSISTANT_ID)
            .messages
            .create(messageConfig);

        // Prepare success response
        const response = {
            success: true,
            message_status: message.status,
            session_id: message.session_id,
            account_sid: message.account_sid,
            body: message.body,
            flagged: message.flagged,
            aborted: message.aborted,
            error: null
        };

        // Return success response
        return callback(null, response);

    } catch (error) {
        // Handle errors
        const errorResponse = {
            success: false,
            message_status: 'failed',
            error: error.message,
            aborted: true,
            flagged: false
        };
        
        return callback(error, errorResponse);
    }
};