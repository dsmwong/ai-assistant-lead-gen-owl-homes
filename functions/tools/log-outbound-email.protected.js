exports.handler = async function(context, event, callback) {
    const { createResponse, success, error } = require(Runtime.getAssets()['/utils/response.js'].path);
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

        // Validate headers
        const identity = event.request.headers['x-identity'];
        if (!identity) {
            throw new Error('X-Identity is required in headers');
        }

        // Validate manager score
        const managerScore = parseFloat(event.manager_score);
        if (isNaN(managerScore) || managerScore < 0 || managerScore > 1) {
            throw new Error('Invalid manager score - must be between 0 and 1');
        }

        // Get session record
        const session = await db.getSession(identity);
        if (!session) {
            throw new Error('Session not found for given identity');
        }

        // Update session record
        const updatedRecord = await db.updateSession(session.id, {
            outbound_email_body: event.outbound_email_body,
            manager_score: managerScore,
            outbound_email_status: event.outbound_email_status,
            recommended_email_body: event.recommended_email_body
        });

        // Send email if score meets threshold
        if (managerScore >= 0.085) {
            await emailProvider.send(
                identity,
                event.outbound_email_body || event.recommended_email_body,
                event.subject || "Exciting New Homes, Just for You"
            );
        }

        // Return success response
        return callback(null, createResponse(200, success({
            message: 'Session updated successfully',
            updatedFields: {
                outbound_email_body: updatedRecord.get('outbound_email_body'),
                manager_score: updatedRecord.get('manager_score'),
                outbound_email_status: updatedRecord.get('outbound_email_status')
            }
        })));

    } catch (err) {
        console.error('Error updating session:', err);

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