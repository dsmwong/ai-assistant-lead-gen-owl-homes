const Airtable = require('airtable');

exports.handler = function(context, event, callback) {
    const response = new Twilio.Response();
    response.appendHeader('Content-Type', 'application/json');

    // Wrap async operations in a Promise
    (async () => {
        try {
            // Validate Airtable configuration
            if (!context.AIRTABLE_API_KEY || !context.AIRTABLE_BASE_ID) {
                response.setStatusCode(500);
                response.setBody({ 
                    success: false,
                    error: 'Airtable configuration error. Please check environment variables.' 
                });
                return callback(null, response);
            }

            const base = new Airtable({apiKey: context.AIRTABLE_API_KEY}).base(context.AIRTABLE_BASE_ID);
            
            // Validate required fields
            const requiredFields = ['first_name', 'last_name', 'email', 'phone', 'area_code'];
            const missingFields = requiredFields.filter(field => !event[field]);
            
            if (missingFields.length > 0) {
                response.setStatusCode(400);
                response.setBody({
                    success: false,
                    error: `Missing required fields: ${missingFields.join(', ')}`
                });
                return callback(null, response);
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(event.email)) {
                response.setStatusCode(400);
                response.setBody({
                    success: false,
                    error: 'Invalid email format'
                });
                return callback(null, response);
            }
            
            // Validate phone number format (E.164 format)
            const phoneRegex = /^\+[1-9]\d{10,14}$/;
            if (!phoneRegex.test(event.phone)) {
                response.setStatusCode(400);
                response.setBody({
                    success: false,
                    error: 'Invalid phone number format. Must be in E.164 format'
                });
                return callback(null, response);
            }
            
            // Create new lead record
            const newLead = await base('Leads').create([
                {
                    fields: {
                        'first_name': event.first_name,
                        'last_name': event.last_name,
                        'email': event.email,
                        'phone': event.phone,
                        'area_code': event.area_code,
                        'status': 'New'
                    }
                }
            ]);

            if (!newLead || newLead.length === 0) {
                response.setStatusCode(500);
                response.setBody({ 
                    success: false,
                    error: 'Failed to create lead record' 
                });
                return callback(null, response);
            }
            
            // Return success response with the auto-generated id field
            response.setStatusCode(200);
            response.setBody({
                success: true,
                message: 'Lead created successfully',
                id: newLead[0].fields.id
            });
            
            return callback(null, response);
            
        } catch (error) {
            console.error('Error:', error);
            
            response.setStatusCode(500);
            response.setBody({
                success: false,
                error: 'Internal server error'
            });
            
            return callback(null, response);
        }
    })().catch(err => {
        console.error('Unhandled Promise Rejection:', err);
        response.setStatusCode(500);
        response.setBody({
            success: false,
            error: 'Internal server error'
        });
        return callback(null, response);
    });
};