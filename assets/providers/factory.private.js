class ProviderFactory {
  static getDatabase(context) {
    if (!context.AIRTABLE_API_KEY || !context.AIRTABLE_BASE_ID) {
      throw new Error('Missing required Airtable configuration. Please check AIRTABLE_API_KEY and AIRTABLE_BASE_ID in your environment variables.');
    }

    try {
      const AirtableProvider = require(Runtime.getAssets()['/providers/database/airtable.js'].path);
      return new AirtableProvider(context.AIRTABLE_API_KEY, context.AIRTABLE_BASE_ID);
    } catch (error) {
      console.error('Error initializing database provider:', error);
      throw new Error(`Failed to initialize database provider: ${error.message}`);
    }
  }

  static getEmailProvider(context) {
    if (!context.SENDGRID_API_KEY || !context.SENDER_EMAIL) {
      throw new Error('Missing required SendGrid configuration. Please check SENDGRID_API_KEY and SENDER_EMAIL in your environment variables.');
    }

    try {
      const SendGridProvider = require(Runtime.getAssets()['/providers/email/sendgrid.js'].path);
      return new SendGridProvider(context.SENDGRID_API_KEY, context.SENDER_EMAIL);
    } catch (error) {
      console.error('Error initializing email provider:', error);
      throw new Error(`Failed to initialize email provider: ${error.message}`);
    }
  }

  static getAllProviders(context) {
    return {
      database: this.getDatabase(context),
      email: this.getEmailProvider(context)
    };
  }

  static validateConfig(context) {
    const required = {
      database: ['AIRTABLE_API_KEY', 'AIRTABLE_BASE_ID'],
      email: ['SENDGRID_API_KEY', 'SENDER_EMAIL']
    };

    const missing = {};

    for (const [provider, vars] of Object.entries(required)) {
      const missingVars = vars.filter(varName => !context[varName]);
      if (missingVars.length > 0) {
        missing[provider] = missingVars;
      }
    }

    return Object.keys(missing).length > 0 ? missing : null;
  }
}

module.exports = ProviderFactory;