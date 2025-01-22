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