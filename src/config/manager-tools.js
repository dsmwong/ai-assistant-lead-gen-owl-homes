/**
 * List of tools to be attached to the assistant
 * @param {string} domain
 * @returns
 */
module.exports = (domain) => ({
  customerLookup: {
    name: 'Outbound Email Grader',
    description:
      'Use this tool after you receive a message from a user, your direct reports, to grade and improve their original email body. You are the one to fill out all of these properties, you do not need to be told them.',
    type: 'WEBHOOK',
    method: 'POST',
    url: `https://${domain}/tools/log-outbound-email`,
    schema: {
      outbound_email_body: "string", //the body of the email the user sent
      manager_score: "number", //grade of orginal users message from 0 to 1 (ex: .85)
      outbound_email_status: "string", //set it to "Sent" if the grade is above 0.85, set it to "Draft" if its not
      recommended_email_body: "string" //if you set the status to draft, provided the recommend email body
    },
  },
});
