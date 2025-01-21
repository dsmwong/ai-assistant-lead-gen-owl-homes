const Airtable = require('airtable');

// Email parsing function to get most recent reply
function parseEmailReply(emailData) {
    // Get the text content, fallback to HTML if no text
    const text = emailData.text || '';
    const html = emailData.html || '';
    
    // First try to get content from text
    if (text) {
        // Split by Gmail reply delimiter
        const parts = text.split(/On .+wrote:/);
        // Get first part and clean it
        let mostRecentReply = parts[0].trim();
        // Remove any trailing empty lines and '>' quote characters
        mostRecentReply = mostRecentReply.replace(/^\s*>?\s*|\s+$/gm, '');
        if (mostRecentReply) {
            return mostRecentReply;
        }
    }
    
    // Fallback to HTML content if text parsing yields empty result
    if (html) {
        // Get content of first div (most recent reply in Gmail)
        const firstHtmlPart = html.match(/<div dir="ltr">(.*?)<\/div>/)?.[1] || '';
        // Remove any HTML tags
        return firstHtmlPart.replace(/<[^>]+>/g, '').trim();
    }
    
    return ''; // Return empty string if no content found
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
            if (!context.AIRTABLE_API_KEY || !context.AIRTABLE_BASE_ID) {
                throw new Error('Missing required environment variables');
            }

            // Extract message_id from headers
            const headers = event.headers;
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
                message: mostRecentReply || 'Empty message', // Use parsed reply with fallback
                identity: identity
            };

            // Create record in Inbound Emails table
            const createdRecord = await base('Inbound Emails').create([
                { fields: emailRecord }
            ]);

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
                error: error.message
            });

            return callback(null, response);
        }
    })();
};