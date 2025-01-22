const Airtable = require('airtable');
const axios = require('axios');

// Helper function to parse email replies
function parseEmailReply({ text, html }) {
    // If there's no content, return null
    if (!text && !html) {
        return null;
    }

    // Prefer text version if available
    const content = text || html;
    
    // Basic cleaning - remove quoted replies and signatures
    let cleanedContent = content
        // Remove email signatures
        .split(/^--\s*$/m)[0]
        // Remove quoted replies (lines starting with >)
        .replace(/^>.*$/gm, '')
        // Remove common reply headers
        .replace(/^On.*wrote:$/gm, '')
        // Clean up extra whitespace
        .trim();

    return cleanedContent || null;
}

exports.handler = function(context, event, callback) {
    const response = new Twilio.Response();
    response.appendHeader('Content-Type', 'application/json');
    
    // Create Airtable base instance
    const base = new Airtable({apiKey: context.AIRTABLE_API_KEY}).base(context.AIRTABLE_BASE_ID);
    
    // Wrap async operations in a Promise
    (async () => {
        try {
            // Validate required environment variables
            if (!context.AIRTABLE_API_KEY || !context.AIRTABLE_BASE_ID || !context.FUNCTIONS_DOMAIN) {
                throw new Error('Missing required environment variables');
            }

            // Extract message_id from headers
            const headers = event.headers || '';
            const messageIdMatch = headers.match(/Message-ID:\s*<([^>]+)>/i);
            const messageId = messageIdMatch ? messageIdMatch[1] : null;

            if (!messageId) {
                throw new Error('Message-ID not found in email headers');
            }

            // Extract email address from the 'from' field
            const fromEmail = event.from.match(/<([^>]+)>/)?.[1] || event.from;

            // Query Sessions table to get session_id and identity
            const sessionsRecords = await base('Sessions')
                .select({
                    filterByFormula: `{identity} = 'email:${fromEmail}'`,
                    maxRecords: 1,
                    sort: [{ field: 'created_at', direction: 'desc' }]
                })
                .firstPage();

            if (!sessionsRecords || sessionsRecords.length === 0) {
                throw new Error(`No session found for email: ${fromEmail}`);
            }

            const sessionRecord = sessionsRecords[0];
            const sessionId = sessionRecord.get('session_id');
            const identity = sessionRecord.get('identity');

            // Parse the most recent reply from the email
            const mostRecentReply = parseEmailReply({
                text: event.text,
                html: event.html
            });

            // Prepare the record for Inbound Emails table
            const emailRecord = {
                message_id: messageId,
                session_id: sessionId,
                message: mostRecentReply || 'Empty message',
                identity: identity,
                created_at: new Date().toISOString() // Adding timestamp
            };

            // Create record in Inbound Emails table
            const createdRecord = await base('Inbound Emails').create([
                { fields: emailRecord }
            ]);

            // Send to AI Assistant
            try {
                await axios.post(`https://${context.FUNCTIONS_DOMAIN}/backend/send-to-assistant`, {
                    email: fromEmail,
                    response: mostRecentReply || 'Empty message'
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000 // 10 second timeout
                });
            } catch (aiError) {
                console.error('Error sending to AI assistant:', aiError);
                // Continue execution even if AI assistant call fails
                // This ensures we don't lose the email record if AI service is temporarily down
            }

            // Return success response
            response.setStatusCode(200);
            response.setBody({
                success: true,
                message: 'Email processed successfully',
                record: createdRecord[0].getId()
            });

            return callback(null, response);

        } catch (error) {
            console.error('Error processing inbound email:', error);

            response.setStatusCode(400);
            response.setBody({
                success: false,
                error: error.message,
                details: error.stack
            });

            return callback(null, response);
        }
    })();
};