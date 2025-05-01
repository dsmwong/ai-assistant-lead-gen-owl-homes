// assets/providers/database/airtable.private.js
const Airtable = require('airtable');

class AirtableProvider {
  constructor(apiKey, baseId) {
    if (!apiKey || !baseId) {
      throw new Error('Airtable API key and base ID are required');
    }
    this.base = new Airtable({apiKey}).base(baseId);
  }

  async createLead(data) {
    try {
      const records = await this.base('Leads').create([{
        fields: {
          'first_name': data.first_name,
          'last_name': data.last_name,
          'email': data.email,
          'phone': data.phone,
          'area_code': data.area_code,
          'status': data.status || 'New',
          'created_at': new Date().toISOString()
        }
      }]);
      return records[0].id;
    } catch (error) {
      console.error('Error creating lead:', error);
      throw new Error(`Failed to create lead: ${error.message}`);
    }
  }

  async updateLead(id, data) {
    try {
      const records = await this.base('Leads').update([{
        id,
        fields: {
          ...data,
          'updated_at': new Date().toISOString()
        }
      }]);
      return records[0];
    } catch (error) {
      console.error('Error updating lead:', error);
      throw new Error(`Failed to update lead: ${error.message}`);
    }
  }

  async getLead(id) {
    try {
      const record = await this.base('Leads').find(id);
      return record;
    } catch (error) {
      console.error('Error fetching lead:', error);
      throw new Error(`Failed to fetch lead: ${error.message}`);
    }
  }

  async getLeadByEmail(email) {
    try {
      const records = await this.base('Leads')
        .select({
          filterByFormula: `{email} = '${email}'`,
          maxRecords: 1
        })
        .firstPage();
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      console.error('Error fetching lead by email:', error);
      throw new Error(`Failed to fetch lead by email: ${error.message}`);
    }
  }

  async getSession(identity) {
    try {
      const records = await this.base('Sessions')
        .select({
          filterByFormula: `{identity} = '${identity}'`,
          maxRecords: 1,
          sort: [{ field: 'created_at', direction: 'desc' }]
        })
        .firstPage();
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      console.error('Error fetching session:', error);
      throw new Error(`Failed to fetch session: ${error.message}`);
    }
  }

  async createSession(data) {
    try {
      const records = await this.base('Sessions').create([{
        fields: {
          'session_id': data.session_id,
          'assistant_id': data.assistant_id,
          'identity': data.identity,
          'last_message': data.last_message,
          'created_at': new Date().toISOString(),
          'updated_at': new Date().toISOString()
        }
      }]);
      return records[0];
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  async updateSession(id, data) {
    try {
      const records = await this.base('Sessions').update([{
        id,
        fields: {
          ...data,
          'updated_at': new Date().toISOString()
        }
      }]);
      return records[0];
    } catch (error) {
      console.error('Error updating session:', error);
      throw new Error(`Failed to update session: ${error.message}`);
    }
  }

  async logInboundEmail(data) {
    try {
      const records = await this.base('Inbound Emails').create([{
        fields: {
          'message_id': data.message_id,
          'session_id': data.session_id,
          'subject': data.subject || 'No Subject',
          'message': data.message,
          'original_msg_ref': data.original_msg_ref,
          'identity': data.identity,
          'created_at': new Date().toISOString()
        }
      }]);
      return records[0];
    } catch (error) {
      console.error('Error logging inbound email:', error);
      throw new Error(`Failed to log inbound email: ${error.message}`);
    }
  }

  async getInboundEmails(identity, limit = 1) {
    try {
      const records = await this.base('Inbound Emails')
        .select({
          filterByFormula: `{identity} = '${identity}'`,
          maxRecords: limit,
          sort: [{ field: 'created_at', direction: 'desc' }]
        })
        .firstPage();
      return records;
    } catch (error) {
      console.error('Error fetching inbound emails:', error);
      throw new Error(`Failed to fetch inbound emails: ${error.message}`);
    }
  }

  async getInboundEmailsBySessionId(session_id, limit = 1) {
    try {
      const records = await this.base('Inbound Emails')
        .select({
          filterByFormula: `{session_id} = '${session_id}'`,
          maxRecords: limit,
          sort: [{ field: 'created_at', direction: 'desc' }]
        })
        .firstPage();
      return records;
    } catch (error) {
      console.error('Error fetching inbound emails:', error);
      throw new Error(`Failed to fetch inbound emails: ${error.message}`);
    }
  }

  async getInboundEmailsByMessageId(message_id, limit = 1) {
    try {
      const records = await this.base('Inbound Emails')
        .select({
          filterByFormula: `{message_id} = '${message_id}'`,
          maxRecords: limit,
          sort: [{ field: 'created_at', direction: 'desc' }]
        })
        .firstPage();
      return records;
    } catch (error) {
      console.error('Error fetching inbound emails:', error);
      throw new Error(`Failed to fetch inbound emails: ${error.message}`);
    }
  }


  async updateInboundEmails(id, data) {
    try {
      const records = await this.base('Inbound Emails').update([{
        id,
        fields: {
          ...data,
          'updated_at': new Date().toISOString()
        }
      }]);
      return records[0];
    } catch (error) {
      console.error('Error updating inbound emails:', error);
      throw new Error(`Failed to update inbound emails: ${error.message}`);
    }
  }

  ///////////////////////////////////////////////////////////////////////
  /// SC DEMO
  ///////////////////////////////////////////////////////////////////////

  // Specificly for SC Leads
  async createSCLead(data) {
    try {
      const records = await this.base('SC Leads').create([{
        fields: {
          'first_name': data.first_name,
          'last_name': data.last_name,
          'email': data.email,
          'phone': data.phone,
          'summary': data.summary,
          'original_body': data.original_body,
          'company': data.company,
          'last_message_id': data.last_message_id,
          'status': data.status || 'New',
          'created_at': new Date().toISOString()
        }
      }]);
      return records[0].id;
    } catch (error) {
      console.error('Error creating lead:', error);
      throw new Error(`Failed to create lead: ${error.message}`);
    }
  }

  async updateSCLead(id, data) {
    try {
      const records = await this.base('SC Leads').update([{
        id,
        fields: {
          ...data,
          'updated_at': new Date().toISOString()
        }
      }]);
      return records[0];
    } catch (error) {
      console.error('Error updating lead:', error);
      throw new Error(`Failed to update lead: ${error.message}`);
    }
  }

  async getSCLead(id) {
    try {
      const record = await this.base('SC Leads').find(id);
      return record;
    } catch (error) {
      console.error('Error fetching lead:', error);
      throw new Error(`Failed to fetch lead: ${error.message}`);
    }
  }

  async getSCLeadByEmail(email) {
    try {
      const records = await this.base('SC Leads')
        .select({
          filterByFormula: `{email} = '${email}'`,
          maxRecords: 1
        })
        .firstPage();
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      console.error('Error fetching lead by email:', error);
      throw new Error(`Failed to fetch lead by email: ${error.message}`);
    }
  }

  async getSCLeadByConversationSession(session_id) {
    try {
      const records = await this.base('SC Leads')
        .select({
          filterByFormula: `{aia_conversation_session} = '${session_id}'`,
          maxRecords: 1
        })
        .firstPage();
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      console.error('Error fetching lead by email:', error);
      throw new Error(`Failed to fetch lead by email: ${error.message}`);
    }
  }

  async getSCLeadByLastMessageId(last_message_id) {
    try {
      const records = await this.base('SC Leads')
        .select({
          filterByFormula: `{last_message_id} = '${last_message_id}'`,
          maxRecords: 1
        })
        .firstPage();
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      console.error('Error fetching lead by email:', error);
      throw new Error(`Failed to fetch lead by email: ${error.message}`);
    }
  }
}

module.exports = AirtableProvider;