/**
 * Validates email format
 * @param {string} email - Email address to validate
 * @returns {boolean} Whether email is valid
 */
exports.validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  /**
   * Validates phone number format (E.164)
   * @param {string} phone - Phone number to validate
   * @returns {boolean} Whether phone number is valid
   */
  exports.validatePhone = (phone) => {
    const phoneRegex = /^\+[1-9]\d{10,14}$/;
    return phoneRegex.test(phone);
  };
  
  /**
   * Validates required fields in an object
   * @param {object} data - Object to validate
   * @param {string[]} requiredFields - List of required field names
   * @returns {string[]|null} List of missing fields or null if all present
   */
  exports.validateRequiredFields = (data, requiredFields) => {
    const missingFields = requiredFields.filter(field => !data[field]);
    return missingFields.length > 0 ? missingFields : null;
  };
  
  /**
   * Validates zip code format
   * @param {string} zipCode - Zip code to validate
   * @returns {boolean} Whether zip code is valid
   */
  exports.validateZipCode = (zipCode) => {
    // Supports both 5-digit and 9-digit (ZIP+4) formats
    const zipRegex = /^\d{5}(-\d{4})?$/;
    return zipRegex.test(zipCode);
  };
  
  /**
   * Validates price value
   * @param {number|string} price - Price to validate
   * @returns {boolean} Whether price is valid
   */
  exports.validatePrice = (price) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return !isNaN(numPrice) && numPrice >= 0;
  };
  
  /**
   * Validates state code format
   * @param {string} state - State code to validate
   * @returns {boolean} Whether state code is valid
   */
  exports.validateState = (state) => {
    const stateRegex = /^[A-Z]{2}$/;
    return stateRegex.test(state.toUpperCase());
  };
  
  /**
   * Validates session ID format
   * @param {string} sessionId - Session ID to validate
   * @returns {boolean} Whether session ID is valid
   */
  exports.validateSessionId = (sessionId) => {
    // Supports various session ID formats (webhook:, conversations:, etc.)
    return typeof sessionId === 'string' && sessionId.includes(':');
  };
  
  /**
   * Validates a set of fields against type specifications
   * @param {object} data - Data to validate
   * @param {object} schema - Validation schema
   * @returns {object|null} Validation errors or null if valid
   */
  exports.validateSchema = (data, schema) => {
    const errors = {};
  
    for (const [field, rules] of Object.entries(schema)) {
      if (data[field] !== undefined) {  // Only validate if field exists
        if (rules.type && typeof data[field] !== rules.type) {
          errors[field] = `Must be of type ${rules.type}`;
        }
        if (rules.pattern && !rules.pattern.test(data[field])) {
          errors[field] = rules.message || 'Invalid format';
        }
        if (rules.min !== undefined && data[field] < rules.min) {
          errors[field] = `Must be at least ${rules.min}`;
        }
        if (rules.max !== undefined && data[field] > rules.max) {
          errors[field] = `Must be at most ${rules.max}`;
        }
      }
    }
  
    return Object.keys(errors).length > 0 ? errors : null;
  };