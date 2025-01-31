exports.handler = function(context, event, callback) {
    const { validateEmail, validatePhone, validateRequiredFields } = require(Runtime.getAssets()['/utils/validation.js'].path);
    const { createResponse, success, error } = require(Runtime.getAssets()['/utils/response.js'].path);
    const ProviderFactory = require(Runtime.getAssets()['/providers/factory.js'].path);
    
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
                interest: event.interest,
                status: 'New'
            });

            console.log('Lead created successfully:', leadId);

            // Prepare assistant payload
            const assistantPayload = {
                email: event.email,
                first_name: event.first_name,
                area_code: event.area_code,
                interest: event.interest || '',
                is_new_lead: true // Flag to indicate this is a new lead submission
            };

            console.log('Attempting to send to assistant:', assistantPayload);

            try {
                const assistantResponse = await fetch(`https://${context.FUNCTIONS_DOMAIN}/backend/send-to-assistant`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Basic ${Buffer.from(`${context.TWILIO_ACCOUNT_SID}:${context.TWILIO_AUTH_TOKEN}`).toString('base64')}`
                    },
                    body: JSON.stringify(assistantPayload)
                });

                const contentType = assistantResponse.headers.get('content-type');
                let responseData;
                
                if (contentType && contentType.includes('application/json')) {
                    responseData = await assistantResponse.json();
                } else {
                    const textResponse = await assistantResponse.text();
                    console.error('Unexpected response format:', textResponse);
                    throw new Error('Received non-JSON response from assistant');
                }

                if (!assistantResponse.ok) {
                    console.error('Assistant error response:', responseData);
                    throw new Error(`Assistant request failed: ${responseData.error || 'Unknown error'}`);
                }

                console.log('Assistant response:', responseData);
            } catch (fetchError) {
                console.error('Error sending to assistant:', fetchError);
                // We don't throw here because we still want to return success for the lead creation
            }
            
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