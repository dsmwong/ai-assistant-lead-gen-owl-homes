exports.createResponse = (statusCode, body) => {
    const response = new Twilio.Response();
    response.appendHeader('Content-Type', 'application/json');
    response.setStatusCode(statusCode);
    response.setBody(body);
    return response;
  };
  
  exports.success = (data = {}, message = 'Success') => {
    return {
      success: true,
      message,
      ...data
    };
  };
  
  exports.error = (message = 'Internal server error', statusCode = 500, details = null) => {
    const error = {
      success: false,
      error: message
    };
    
    if (details) {
      error.details = details;
    }
    
    return error;
  };