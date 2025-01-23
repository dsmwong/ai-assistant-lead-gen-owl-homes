exports.handler = function(context, event, callback) {
    // Get all utility functions and providers
    const { validateEmail, validatePhone, validateRequiredFields } = require(Runtime.getAssets()['/utils/validation.js'].path);
    const { createResponse, success, error } = require(Runtime.getAssets()['/utils/response.js'].path);
    const ProviderFactory = require(Runtime.getAssets()['/providers/factory.js'].path);
    
    // Initialize providers
    const db = ProviderFactory.getDatabase(context);
    
    (async () => {
        try {
            // Check for missing configuration
            const missingConfig = ProviderFactory.validateConfig(context);
            if (missingConfig) {
                throw new Error(`Missing configuration: ${JSON.stringify(missingConfig)}`);
            }

            // Validate required fields
            const requiredFields = ['first_name', 'last_name', 'email', 'phone', 'area_code'];
            const missingFields = validateRequiredFields(event, requiredFields);
            
            if (missingFields) {
                return callback(null, createResponse(400, error(
                    `Missing required fields: ${missingFields.join(', ')}`,
                    400
                )));
            }
            
            // Validate email format
            if (!validateEmail(event.email)) {
                return callback(null, createResponse(400, error(
                    'Invalid email format',
                    400
                )));
            }
            
            // Validate phone number format
            if (!validatePhone(event.phone)) {
                return callback(null, createResponse(400, error(
                    'Invalid phone number format. Must be in E.164 format',
                    400
                )));
            }
            
            // Create lead using database provider
            const leadId = await db.createLead({
                first_name: event.first_name,
                last_name: event.last_name,
                email: event.email,
                phone: event.phone,
                area_code: event.area_code,
                status: 'New'
            });

            // Send to AI Assistant (fire and forget)
            const assistantPayload = {
                email: event.email,
                first_name: event.first_name,
                area_code: event.area_code
            };

            fetch(`https://${context.FUNCTIONS_DOMAIN}/backend/send-to-assistant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assistantPayload)
            }).catch(error => {
                console.error('Error sending to assistant:', error);
            });
            
            // Return success response
            return callback(null, createResponse(200, success({
                message: 'Lead created successfully',
                id: leadId
            })));
            
        } catch (err) {
            console.error('Error processing form submission:', err);
            
            return callback(null, createResponse(500, error(
                'Internal server error processing form submission',
                500,
                process.env.NODE_ENV === 'development' ? err.stack : undefined
            )));
        }
    })();
};