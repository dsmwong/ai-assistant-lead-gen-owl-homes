/**
 * Twilio Function to send emails with threading support
 * 
 * Required Environment Variables:
 * - SENDGRID_API_KEY: SendGrid API key
 * - SENDER_EMAIL: Verified sender email
 * - AIRTABLE_API_KEY: Airtable API key
 * - AIRTABLE_BASE_ID: Airtable base ID
 * 
 * Expected Event Payload:
 * {
 *   "to": "email:recipient@example.com", // Recipient email with 'email:' prefix
 *   "body": "Email content", // Email body
 *   "subject": "Subject line" // Optional - defaults to "Exciting New Homes, Just for You"
 * }
 */
exports.handler = async function(context, event, callback) {

    const { createResponse, success, error } = require(Runtime.getAssets()['/utils/response.js'].path);
    const { validateEmail } = require(Runtime.getAssets()['/utils/validation.js'].path);
    const { formatReplySubject } = require(Runtime.getAssets()['/utils/email.js'].path);
    const ProviderFactory = require(Runtime.getAssets()['/providers/factory.js'].path);

    // Initialize providers
    const db = ProviderFactory.getDatabase(context);
    const emailProvider = ProviderFactory.getEmailProvider(context);
    
    try {
        // Validate configuration
        const missingConfig = ProviderFactory.validateConfig(context);
        if (missingConfig) {
            throw new Error(`Missing configuration: ${JSON.stringify(missingConfig)}`);
        }

        // Validate required parameters
        if (!event.to || !event.body) {
            throw new Error('Missing required parameters: to and body are required');
        }

        // Extract and validate email
        const recipientEmail = event.to.replace('email:', '');
        if (!validateEmail(recipientEmail)) {
            throw new Error('Invalid email format');
        }

        // Look up the most recent inbound email for threading
        let threadOptions = {};
        try {
            const inboundEmails = await db.getInboundEmails(event.to, 1);
            if (inboundEmails && inboundEmails.length > 0) {
                const messageId = inboundEmails[0].get('message_id');
                if (messageId) {
                    threadOptions = {
                        lastMessageId: messageId,
                        subject: formatReplySubject(event.subject)
                    };
                }
            }
        } catch (lookupError) {
            console.warn('[send-email] Error looking up thread history:', lookupError);
            // Continue without threading if lookup fails
        }

        // Send email using provider
        const sendResult = await emailProvider.send(
            event.to,
            event.body,
            threadOptions.subject || event.subject,
            threadOptions
        );

        // Return success response
        return callback(null, createResponse(200, success({
            message: 'Email sent successfully',
            messageId: sendResult.messageId
        })));

    } catch (err) {
        console.error('[send-email] Error sending email:', err);

        // Determine appropriate status code
        const statusCode = err.message.includes('Missing required') || 
                          err.message.includes('Invalid email') ? 400 : 500;

        return callback(null, createResponse(statusCode, error(
            err.message,
            statusCode,
            process.env.NODE_ENV === 'development' ? {
                stack: err.stack,
                details: err.response?.data
            } : undefined
        )));
    }
};