const sgMail = require('@sendgrid/mail');
const BaseEmailProvider = require('./base');

class SendGridProvider extends BaseEmailProvider {
  constructor(apiKey, senderEmail) {
    super();
    sgMail.setApiKey(apiKey);
    this.senderEmail = senderEmail;
  }

  async send(to, body, subject, options = {}) {
    const msg = {
      to: to.replace('email:', ''),
      from: this.senderEmail,
      subject: subject || 'Exciting New Homes, Just for You',
      text: body,
      html: `<div>${body}</div>`,
      ...options
    };

    if (options.lastMessageId) {
      msg.headers = {
        'In-Reply-To': `<${options.lastMessageId}>`,
        'References': `<${options.lastMessageId}>`
      };
    }

    return sgMail.send(msg);
  }

  parseInbound(payload) {
    const messageId = payload.headers.match(/Message-ID:\s*<([^>]+)>/i)?.[1];
    const fromEmail = payload.from.match(/<([^>]+)>/)?.[1] || payload.from;
    
    return {
      messageId,
      fromEmail,
      text: payload.text,
      html: payload.html,
      headers: payload.headers
    };
  }
}

module.exports = SendGridProvider;