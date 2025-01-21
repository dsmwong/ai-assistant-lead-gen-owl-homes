const sgMail = require('@sendgrid/mail');
const { v4: uuidv4 } = require('uuid');
const Airtable = require('airtable');

/**
 * Twilio Function to send emails via SendGrid with threading support
 * 
 * Required Environment Variables:
 * - SENDGRID_API_KEY: Your SendGrid API key
 * - SENDER_EMAIL: Your verified sender email address in SendGrid
 * - AIRTABLE_API_KEY: Your Airtable API key
 * - AIRTABLE_BASE_ID: Your Airtable base ID
 * 
 * Expected Event Payload:
 * {
 *   "to": "email:recipient@example.com", // The recipient's email with 'email:' prefix
 *   "body": "Email content", // The email body content
 *   "subject": "Subject line", // Optional - defaults to "New Message"
 * }
 */
exports.handler = async function(context, event, callback) {
    const response = new Twilio.Response();
    response.appendHeader('Content-Type', 'application/json');
    
    try {
        // Validate required environment variables
        if (!context.SENDGRID_API_KEY || !context.SENDER_EMAIL || 
            !context.AIRTABLE_API_KEY || !context.AIRTABLE_BASE_ID) {
            throw new Error('Missing required environment variables');
        }

        // Validate required event parameters
        if (!event.to || !event.body) {
            throw new Error('Missing required parameters');
        }

        // Initialize Airtable
        const base = new Airtable({apiKey: context.AIRTABLE_API_KEY})
                    .base(context.AIRTABLE_BASE_ID);

        // Format the email address and get identity
        const identity = event.to; // Keep original identity format (email:user@example.com)
        const recipientEmail = event.to.replace('email:', '');
        
        // Look up the last message ID from Inbound Emails table
        let lastMessageId = null;
        try {
            const records = await base('Inbound Emails')
                .select({
                    filterByFormula: `{identity} = '${identity}'`,
                    maxRecords: 1,
                    fields: ['message_id']
                })
                .firstPage();

            if (records.length > 0 && records[0].fields.message_id) {
                lastMessageId = records[0].fields.message_id;
            }
        } catch (airtableError) {
            console.error('Airtable lookup error:', airtableError);
            // Continue without lastMessageId if lookup fails
        }

        // Initialize SendGrid
        sgMail.setApiKey(context.SENDGRID_API_KEY);

        // Construct email message
        const msg = {
            to: recipientEmail,
            from: context.SENDER_EMAIL,
            subject: event.subject || 'New Message',
            text: event.body,
            html: `<div>${event.body}</div>`
        };

        // If we found a last message ID, add threading headers
        if (lastMessageId) {
            if (!msg.subject.toLowerCase().startsWith('re:')) {
                msg.subject = `Re: ${msg.subject}`;
            }

            msg.headers = {
                ...msg.headers,
                'In-Reply-To': `<${lastMessageId}>`,
                'References': `<${lastMessageId}>`
            };
        }

        // Send email
        await sgMail.send(msg);

        // Return success response
        response.setStatusCode(200);
        response.setBody({
            success: true,
            message: 'Email sent successfully'
        });

        callback(null, response);
    } catch (error) {
        console.error('Error sending email:', error);
        response.setStatusCode(400);
        response.setBody({
            success: false,
            error: error.message
        });

        callback(error, response);
    }
};