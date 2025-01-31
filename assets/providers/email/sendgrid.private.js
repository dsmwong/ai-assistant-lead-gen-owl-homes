const sgMail = require('@sendgrid/mail');

class SendGridProvider {
  constructor(apiKey, senderEmail) {
    if (!apiKey || !senderEmail) {
      throw new Error('SendGrid API key and sender email are required');
    }
    sgMail.setApiKey(apiKey);
    this.senderEmail = senderEmail;
  }

  getEmailFromIdentity(identity) {
    // Handle identity strings in format "email:user@example.com"
    if (typeof identity === 'string' && identity.startsWith('email:')) {
      return identity.substring(6); // Remove 'email:' prefix
    }
    // If it's already just an email address, return as is
    return identity;
  }

  async send(to, body, subject, options = {}) {
    try {
      const recipientEmail = this.getEmailFromIdentity(to);
      const msg = {
        to: recipientEmail,
        from: this.senderEmail,
        subject: subject || 'Exciting New Homes, Just for You',
        text: body,
        html: `<div>${body}</div>`,
        ...options
      };

      // Add threading headers if lastMessageId is provided
      if (options.lastMessageId) {
        if (!msg.subject.toLowerCase().startsWith('re:')) {
          msg.subject = `Re: ${msg.subject}`;
        }

        msg.headers = {
          'In-Reply-To': `<${options.lastMessageId}>`,
          'References': `<${options.lastMessageId}>`
        };
      }

      const response = await sgMail.send(msg);
      return {
        success: true,
        messageId: response[0]?.headers['x-message-id'],
        response: response[0]
      };
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  parseInbound(payload) {
    try {
      // Extract message ID from headers
      const messageId = payload.headers.match(/Message-ID:\s*<([^>]+)>/i)?.[1];
      
      // Extract email address from the 'from' field
      const fromEmail = payload.from.match(/<([^>]+)>/)?.[1] || payload.from;
      
      // Extract thread references if they exist
      const references = payload.headers.match(/References:\s*<([^>]+)>/i)?.[1];
      const inReplyTo = payload.headers.match(/In-Reply-To:\s*<([^>]+)>/i)?.[1];

      // Extract subject
      const subject = payload.subject || '';

      return {
        messageId,
        fromEmail,
        text: payload.text,
        html: payload.html,
        subject,
        headers: payload.headers,
        threadData: {
          references,
          inReplyTo
        }
      };
    } catch (error) {
      console.error('Error parsing inbound email:', error);
      throw new Error(`Failed to parse inbound email: ${error.message}`);
    }
  }

  getThreadId(messageData) {
    // Try to get the thread ID from references or in-reply-to headers
    const { references, inReplyTo } = messageData.threadData;
    return references || inReplyTo || messageData.messageId;
  }
}

module.exports = SendGridProvider;