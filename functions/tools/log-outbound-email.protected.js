exports.handler = async function(context, event, callback) {
    const { createResponse, success, error } = require(Runtime.getAssets()['/utils/response.js'].path);
    const ProviderFactory = require(Runtime.getAssets()['/providers/factory.js'].path);

    console.log('[log-outbound-email] Starting execution with event:', {
        headers: event.request?.headers,
        manager_score: event.manager_score,
        outbound_email_status: event.outbound_email_status,
        // Omit full body content for readability
        outbound_email_body_length: event.outbound_email_body?.length,
        recommended_email_body_length: event.recommended_email_body?.length
    });

    try {
        // Initialize providers
        console.log('[log-outbound-email] Initializing providers...');
        const db = ProviderFactory.getDatabase(context);
        const emailProvider = ProviderFactory.getEmailProvider(context);
        console.log('[log-outbound-email] Providers initialized successfully');

        // Validate configuration
        console.log('[log-outbound-email] Validating configuration...');
        const missingConfig = ProviderFactory.validateConfig(context);
        if (missingConfig) {
            console.error('[log-outbound-email] Missing configuration:', missingConfig);
            throw new Error(`Missing configuration: ${JSON.stringify(missingConfig)}`);
        }
        console.log('[log-outbound-email] Configuration validated successfully');

        // Validate headers
        const identity = event.request.headers['x-identity'];
        console.log('[log-outbound-email] Checking identity header:', { identity });
        if (!identity) {
            console.error('[log-outbound-email] Missing x-identity header');
            throw new Error('X-Identity is required in headers');
        }

        // Validate manager score
        const managerScore = parseFloat(event.manager_score);
        console.log('[log-outbound-email] Validating manager score:', { 
            rawScore: event.manager_score, 
            parsedScore: managerScore 
        });
        if (isNaN(managerScore) || managerScore < 0 || managerScore > 1) {
            console.error('[log-outbound-email] Invalid manager score:', { managerScore });
            throw new Error('Invalid manager score - must be between 0 and 1');
        }

        // Get session record
        console.log('[log-outbound-email] Fetching session for identity:', identity);
        const session = await db.getSession(identity);
        if (!session) {
            console.error('[log-outbound-email] Session not found for identity:', identity);
            throw new Error('Session not found for given identity');
        }
        console.log('[log-outbound-email] Session found:', { 
            sessionId: session.id,
            // Add other relevant session fields here
        });

        // Update session record
        console.log('[log-outbound-email] Updating session record...');
        const updatedRecord = await db.updateSession(session.id, {
            outbound_email_body: event.outbound_email_body,
            manager_score: managerScore,
            outbound_email_status: event.outbound_email_status,
            recommended_email_body: event.recommended_email_body
        });
        console.log('[log-outbound-email] Session updated successfully');

        // Send email if score meets threshold
        console.log('[log-outbound-email] Checking manager score threshold:', { 
            managerScore, 
            threshold: 0.085,
            willSendEmail: managerScore >= 0.085 
        });
        if (managerScore >= 0.085) {
            console.log('[log-outbound-email] Sending email...');
            
            // Get most recent inbound email for threading
            const inboundEmails = await db.getInboundEmails(identity, 1);
            const threadOptions = {};
            
            if (inboundEmails && inboundEmails.length > 0) {
                const messageId = inboundEmails[0].get('message_id');
                if (messageId) {
                    threadOptions.lastMessageId = messageId;
                }
            }

            await emailProvider.send(
                identity,
                event.outbound_email_body || event.recommended_email_body,
                event.subject || "Exciting New Homes, Just for You",
                threadOptions
            );
            console.log('[log-outbound-email] Email sent successfully');
        }

        // Return success response
        console.log('[log-outbound-email] Function completed successfully');
        return callback(null, createResponse(200, success({
            message: 'Session updated successfully',
            updatedFields: {
                outbound_email_body: updatedRecord.get('outbound_email_body'),
                manager_score: updatedRecord.get('manager_score'),
                outbound_email_status: updatedRecord.get('outbound_email_status')
            }
        })));

    } catch (err) {
        console.error('[log-outbound-email] Error occurred:', {
            message: err.message,
            stack: err.stack,
            details: err.response?.data
        });

        const statusCode = err.message.includes('not found') ? 404 :
            err.message.includes('required') || err.message.includes('Invalid') ? 400 : 500;

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