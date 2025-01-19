const Airtable = require('airtable');

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

            // Prepare the record for Inbound Emails table
            const emailRecord = {
                message_id: messageId,
                session_id: sessionId,
                message: event.text || event.html || '', // Use text or fallback to HTML
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