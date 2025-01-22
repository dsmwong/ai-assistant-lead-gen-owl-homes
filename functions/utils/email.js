/**
 * Parses and cleans email reply content
 * @param {Object} params - Email content parameters
 * @param {string} [params.text] - Plain text content
 * @param {string} [params.html] - HTML content
 * @returns {string|null} Cleaned email content or null if no content
 */
exports.parseEmailReply = ({ text, html }) => {
    // Return null if no content is provided
    if (!text && !html) {
      return null;
    }
  
    // Prefer text version if available
    const content = text || html;
    
    return content
      // Remove email signatures (split on first '--' and take first part)
      .split(/^--\s*$/m)[0]
      // Remove quoted replies (lines starting with >)
      .replace(/^>.*$/gm, '')
      // Remove common reply headers
      .replace(/^On.*wrote:$/gm, '')
      // Remove date lines
      .replace(/^On.*at.*$/gm, '')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };
  
  /**
   * Extracts message ID from email headers
   * @param {string} headers - Email headers
   * @returns {string|null} Message ID or null if not found
   */
  exports.extractMessageId = (headers) => {
    const messageIdMatch = headers.match(/Message-ID:\s*<([^>]+)>/i);
    return messageIdMatch ? messageIdMatch[1] : null;
  };
  
  /**
   * Extracts email address from various formats
   * @param {string} from - From field content
   * @returns {string} Clean email address
   */
  exports.extractEmailAddress = (from) => {
    const emailMatch = from.match(/<([^>]+)>/);
    return emailMatch ? emailMatch[1] : from;
  };
  
  /**
   * Formats subject line for replies
   * @param {string} subject - Original subject
   * @returns {string} Formatted subject line
   */
  exports.formatReplySubject = (subject) => {
    if (!subject) return 'Re: No Subject';
    return subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`;
  };
  
  /**
   * Validates email format
   * @param {string} email - Email address to validate
   * @returns {boolean} Whether email is valid
   */
  exports.isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };