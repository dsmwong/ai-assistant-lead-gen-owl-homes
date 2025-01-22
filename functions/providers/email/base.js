class BaseEmailProvider {
    async send(to, body, subject, options = {}) {
      throw new Error('Must implement send');
    }
    
    parseInbound(payload) {
      throw new Error('Must implement parseInbound');
    }
  
    getEmailFromIdentity(identity) {
      return identity.replace('email:', '');
    }
  }
  
  module.exports = BaseEmailProvider;