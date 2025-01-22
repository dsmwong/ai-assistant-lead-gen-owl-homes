exports.parseEmailReply = ({ text, html }) => {
    if (!text && !html) {
      return null;
    }
  
    const content = text || html;
    
    return content
      .split(/^--\s*$/m)[0]
      .replace(/^>.*$/gm, '')
      .replace(/^On.*wrote:$/gm, '')
      .trim();
  };
  