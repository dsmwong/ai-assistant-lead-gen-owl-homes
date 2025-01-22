class BaseDatabase {
    async createLead(data) {
      throw new Error('Must implement createLead');
    }
    
    async updateLead(id, data) {
      throw new Error('Must implement updateLead');
    }
    
    async getLead(id) {
      throw new Error('Must implement getLead');
    }
  
    async getLeadByEmail(email) {
      throw new Error('Must implement getLeadByEmail');
    }
  
    async getSession(identity) {
      throw new Error('Must implement getSession');
    }
  
    async createSession(data) {
      throw new Error('Must implement createSession');
    }
  
    async updateSession(id, data) {
      throw new Error('Must implement updateSession');
    }
  
    async logInboundEmail(data) {
      throw new Error('Must implement logInboundEmail');
    }
  }
  
  module.exports = BaseDatabase;
  
  // functions/providers/email/base.js
  class BaseEmailProvider {
    async send(to, body, subject, options = {}) {
      throw new Error('Must implement send');
    }
    
    async parseInbound(payload) {
      throw new Error('Must implement parseInbound');
    }
  }
  
  module.exports = BaseEmailProvider;