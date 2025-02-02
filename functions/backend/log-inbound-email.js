exports.handler = function(context, event, callback) {

    const { createResponse, success, error } = require(Runtime.getAssets()['/utils/response.js'].path);
    const { parseEmailReply } = require(Runtime.getAssets()['/utils/email.js'].path);
    const ProviderFactory = require(Runtime.getAssets()['/providers/factory.js'].path);
    
    // Initialize providers
    const db = ProviderFactory.getDatabase(context);
    const emailProvider = ProviderFactory.getEmailProvider(context);
    console.log('[log-inbound-email] Event body:', event.body);
    
    (async () => {
        try {
            // Validate configuration
            const missingConfig = ProviderFactory.validateConfig(context);
            if (missingConfig) {
                throw new Error(`Missing configuration: ${JSON.stringify(missingConfig)}`);
            }

            // Parse inbound email using email provider
            const parsedEmail = emailProvider.parseInbound(event);
            
            if (!parsedEmail.messageId) {
                throw new Error('Message-ID not found in email headers');
            }

            // Get session for this email identity
            const identity = `email:${parsedEmail.fromEmail}`;
            const session = await db.getSession(identity);
            
            if (!session) {
                throw new Error(`No session found for email: ${parsedEmail.fromEmail}`);
            }

            // Parse and clean the email reply
            const mostRecentReply = parseEmailReply({
                text: parsedEmail.text,
                html: parsedEmail.html
            });

            // Log the inbound email using database provider
            const emailRecord = await db.logInboundEmail({
                message_id: parsedEmail.messageId,
                session_id: session.get('session_id'),
                message: mostRecentReply || 'Empty message',
                identity: identity,
                created_at: new Date().toISOString()
            });

            // Forward to AI Assistant
            try {
                await fetch(`https://${context.FUNCTIONS_DOMAIN}/backend/send-to-assistant`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: parsedEmail.fromEmail,
                        response: mostRecentReply || 'Empty message'
                    })
                });
            } catch (aiError) {
                // Log error but continue execution
                console.error('[log-inbound-email] Error sending to AI assistant:', aiError);
            }

            // Return success response
            return callback(null, createResponse(200, success({
                message: 'Email processed successfully',
                record: emailRecord.getId()
            })));

        } catch (err) {
            console.error('[log-inbound-email] Error processing inbound email:', err);

            // Determine appropriate status code
            const statusCode = err.message.includes('No session found') ? 404 : 500;
            
            return callback(null, createResponse(statusCode, error(
                err.message,
                statusCode,
                process.env.NODE_ENV === 'development' ? err.stack : undefined
            )));
        }
    })();
};