const AirtableProvider = require('./database/airtable');
const SendGridProvider = require('./email/sendgrid');

class ProviderFactory {
  static getDatabase(context) {
    return new AirtableProvider(context.AIRTABLE_API_KEY, context.AIRTABLE_BASE_ID);
  }

  static getEmailProvider(context) {
    return new SendGridProvider(context.SENDGRID_API_KEY, context.SENDER_EMAIL);
  }
}

module.exports = ProviderFactory;