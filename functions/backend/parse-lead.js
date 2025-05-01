const twilio_version = require('twilio/package.json').version;

const FUNCTION_NAME = 'process-lead';

exports.handler = async function(context, event, callback) {
  const { createResponse, success, error } = require(Runtime.getAssets()['/utils/response.js'].path);

  console.log(`Entered ${context.PATH} node version ${process.version} twilio version ${twilio_version}`);

  try {
    console.log(`[${FUNCTION_NAME}] Event:`, event);

    // remove json markup from event body
    const cleanBody = event.Body.replace(/```json/g, '').replace(/```/g, '');
    console.log(`[${FUNCTION_NAME}] cleanBody:`, cleanBody);
 
    const sessionData = {
      session_id: event.SessionId,
      assistant_id: event.AssistantSid,
      identity: event.Identity,
      lead: JSON.parse(cleanBody),
      flagged: event.Flagged,
      status: event.Status,
      updated_at: new Date().toISOString()
    };
    console.log(`[${FUNCTION_NAME}] Session Data:`, sessionData);

    return callback(null, createResponse(200, success(sessionData)));
  }  catch (err) {
    console.error(`[${FUNCTION_NAME}] Error sending to assistant:`, err);
    
    const statusCode = err.message.includes('Missing required') || 
                      err.message.includes('Invalid email') ? 400 : 500;

    return callback(null, createResponse(statusCode, error(
        err.message,
        statusCode,
        process.env.NODE_ENV === 'development' ? {
            stack: err.stack,
            code: err.code,
            status: err.status,
            more_info: err.more_info
        } : undefined
    )));
  }
};