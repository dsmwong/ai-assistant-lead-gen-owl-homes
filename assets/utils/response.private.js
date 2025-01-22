/**
 * Creates a standardized Twilio Response object
 * @param {number} statusCode - HTTP status code
 * @param {object} body - Response body
 * @returns {Response} Twilio Response object
 */
exports.createResponse = (statusCode, body) => {
    const response = new Twilio.Response();
    response.appendHeader('Content-Type', 'application/json');
    response.setStatusCode(statusCode);
    response.setBody(body);
    return response;
  };
  
  /**
   * Creates a success response object
   * @param {object} [data={}] - Success response data
   * @param {string} [message='Success'] - Success message
   * @returns {object} Formatted success response
   */
  exports.success = (data = {}, message = 'Success') => {
    return {
      success: true,
      message,
      ...data
    };
  };
  
  /**
   * Creates an error response object
   * @param {string} [message='Internal server error'] - Error message
   * @param {number} [statusCode=500] - HTTP status code
   * @param {*} [details=null] - Additional error details
   * @returns {object} Formatted error response
   */
  exports.error = (message = 'Internal server error', statusCode = 500, details = null) => {
    const errorResponse = {
      success: false,
      error: message,
      statusCode
    };
  
    if (details) {
      errorResponse.details = process.env.NODE_ENV === 'development' ? details : 'Additional details hidden in production';
    }
  
    return errorResponse;
  };
  
  /**
   * Creates a standardized response with pagination
   * @param {Array} items - List of items
   * @param {object} pagination - Pagination details
   * @returns {object} Formatted paginated response
   */
  exports.paginatedResponse = (items, pagination) => {
    return {
      success: true,
      data: items,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        hasMore: pagination.hasMore
      }
    };
  };
  
  /**
   * Creates a validation error response
   * @param {string|string[]} errors - Validation error(s)
   * @returns {object} Formatted validation error response
   */
  exports.validationError = (errors) => {
    return exports.error(
      'Validation failed',
      400,
      Array.isArray(errors) ? errors : [errors]
    );
  };