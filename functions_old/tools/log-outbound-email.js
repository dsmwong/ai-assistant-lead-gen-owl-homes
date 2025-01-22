// Twilio Function to update Airtable Sessions table
const Airtable = require('airtable');
const axios = require('axios');

// Helper function to send email event
async function sendEmailEvent(domain, emailData) {
  try {
    const response = await axios.post(`https://${domain}/backend/send-email`, emailData);
    return response.data;
  } catch (error) {
    console.error('Error sending email event:', error);
    throw error;
  }
}

exports.handler = async function(context, event, callback) {
  // Initialize response object
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  
  try {
    // Get identity from headers
    const identity = event.request.headers['x-identity'];
    if (!identity) {
      throw new Error('X-Identity is required in headers');
    }

    // Initialize Airtable
    const base = new Airtable({ apiKey: context.AIRTABLE_API_KEY }).base(context.AIRTABLE_BASE_ID);
    const table = base('Sessions');

    // Find record with matching identity
    const records = await table.select({
      filterByFormula: `{identity} = "${identity}"`,
      maxRecords: 1
    }).firstPage();

    if (!records || records.length === 0) {
      throw new Error('identity not found');
    }

    const managerScore = parseFloat(event.manager_score);
    
    // Update the record
    const updatedRecord = await table.update(records[0].id, {
      'outbound_email_body': event.outbound_email_body,
      'manager_score': managerScore,
      'outbound_email_status': event.outbound_email_status,
      'recommended_email_body': event.recommended_email_body
    });

    // Check if manager_score meets threshold
    if (managerScore >= 0.085) {
      
      // Prepare email payload
      const emailPayload = {
        to: identity,
        body: event.outbound_email_body || event.recommended_email_body,
        // Optional subject can be added here if provided in the event
        subject: event.subject || "Exciting New Homes, Just for You"
      };

      // Send email event
      await sendEmailEvent(context.FUNCTIONS_DOMAIN, emailPayload);
    }

    // Return success response
    response.setStatusCode(200);
    response.setBody({ 
      success: true, 
      message: 'Session updated successfully',
      updatedFields: {
        outbound_email_body: updatedRecord.get('outbound_email_body'),
        manager_score: updatedRecord.get('manager_score'),
        outbound_email_status: updatedRecord.get('outbound_email_status')
      }
    });
    
  } catch (error) {
    console.error('Error updating session:', error);
    
    response.setStatusCode(error.statusCode || 500);
    response.setBody({
      success: false,
      error: error.message || 'Internal server error',
      details: error.error || {}
    });
  }
  
  callback(null, response);
};