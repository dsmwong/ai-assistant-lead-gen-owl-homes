exports.handler = async function(context, event, callback) {
    try {
        // Step 1: Initialize Twilio client
        const twilio = require('twilio');
        const client = twilio(context.TWILIO_ACCOUNT_SID, context.TWILIO_AUTH_TOKEN);

        // Step 2: Validate incoming payload
        if (!event.email || !event.first_name || !event.area_code) {
            throw new Error('Missing required fields: email, first_name, or area_code');
        }

        // Step 3: Sanitize and prepare the message body
        const messageBody = `A new lead, named ${event.first_name}, was submitted and they are interested in properties in ${event.area_code}. Write an email to them with some property recommendations and ask if they are interested in scheduling time with a Owl Home Agent.`;

        // Step 4: Create message configuration
        const messageConfig = {
            identity: `email:${event.email}`,
            body: messageBody,
            webhook: `https://${conext.FUNCTIONS_DOMAIN}/backend/log-sessions`,
            mode: "email"
        };

        // Step 5: Send message to AI Assistant
        const message = await client.assistants.v1
            .assistants(context.ASSISTANT_ID)
            .messages
            .create(messageConfig);

        // Step 6: Prepare success response
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

        // Step 7: Return success response
        return callback(null, response);

    } catch (error) {
        // Step 8: Handle errors
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