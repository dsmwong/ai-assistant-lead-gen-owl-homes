const Airtable = require('airtable');
const BaseDatabase = require('./base');

class AirtableProvider extends BaseDatabase {
  constructor(apiKey, baseId) {
    super();
    this.base = new Airtable({apiKey}).base(baseId);
  }

  async createLead(data) {
    const records = await this.base('Leads').create([{
      fields: {
        'first_name': data.first_name,
        'last_name': data.last_name,
        'email': data.email,
        'phone': data.phone,
        'area_code': data.area_code,
        'status': 'New'
      }
    }]);
    return records[0].id;
  }

  async getLeadByEmail(email) {
    const records = await this.base('Leads')
      .select({
        filterByFormula: `{email} = '${email}'`,
        maxRecords: 1
      })
      .firstPage();
    return records.length > 0 ? records[0] : null;
  }

  async getSession(identity) {
    const records = await this.base('Sessions')
      .select({
        filterByFormula: `{identity} = '${identity}'`,
        maxRecords: 1,
        sort: [{ field: 'created_at', direction: 'desc' }]
      })
      .firstPage();
    return records.length > 0 ? records[0] : null;
  }

  async createSession(data) {
    const records = await this.base('Sessions').create([{
      fields: {
        session_id: data.session_id,
        assistant_id: data.assistant_id,
        identity: data.identity,
        last_message: data.last_message,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }]);
    return records[0];
  }

  async updateSession(id, data) {
    return await this.base('Sessions').update(id, {
      ...data,
      updated_at: new Date().toISOString()
    });
  }

  async logInboundEmail(data) {
    const records = await this.base('Inbound Emails').create([{
      fields: {
        message_id: data.message_id,
        session_id: data.session_id,
        message: data.message,
        identity: data.identity,
        created_at: new Date().toISOString()
      }
    }]);
    return records[0];
  }
}

module.exports = AirtableProvider;