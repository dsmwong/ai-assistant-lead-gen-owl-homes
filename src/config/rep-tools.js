/**
 * List of tools to be attached to the assistant
 * @param {string} domain
 * @returns
 */
module.exports = (domain) => ({
  customerLookup: {
    name: 'Customer Lookup',
    description:
      'Use this tool at the beginning of every conversation to learn about the customer.\n\nTool Rules:\n - Mandatory at conversation start\n - Accessible fields: first name, last name, address, email, phone\n - Use to personalize greeting',
    type: 'WEBHOOK',
    method: 'GET',
    url: `https://${domain}/tools/customer-lookup`,
  },
  getListings: {
    name: 'Get Listings',
    description:
      'Use this tool to search for listings on behalf of users. Ensure you include these listings as recommendations or to answer questions on behalf of the end user. \n You are only required to fill out one of the below fields. Do not make any information up or you will be fired.',
    type: 'WEBHOOK',
    method: 'GET',
    url: `https://${domain}/tools/get-listings`,
    schema: {
      city: "string", //the city the user is interested in
      zip_code: "string", //the zip code the user is interested in
      state: "string", //the state the user is interested in
      price: "number" //the maximum about the user will pay
    },
  },
});
