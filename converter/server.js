const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fastify = require('fastify')();
const multipart = require('@fastify/multipart');
const axios = require('axios');

// Routing Configuration
const routes = [
  { recipient: 'sclead@aiaparse.indiveloper.com', url: '/backend/extract-lead' },
  { recipient: 'owlhome@aiaparse.indiveloper.com', url: '/backend/log-inbound-email' }
];

// Setting Environment variables
const FORWARD_TO_BASE = `https://${process.env.FUNCTIONS_DOMAIN}`;
const PORT = process.env.PORT || 3010;

if (!FORWARD_TO_BASE) {
  console.error('ERROR: FUNCTIONS_DOMAIN environment variable is required');
  console.error('Make sure FUNCTIONS_DOMAIN is set in the .env file in the parent directory');
  process.exit(1);
}

fastify.register(multipart, { 
  addToBody: true,
  onFile: (part) => {
    console.log('Received file:', part.filename);
  }
});

// Added Logging
fastify.addHook('preHandler', async (request, reply) => {
  console.log('\n--- Incoming Request ---');
  console.log('Method:', request.method);
  console.log('URL:', request.url);
  console.log('Headers:', request.headers);
  console.log('Body:', request.body);

  // only support Sendgrid User-Agent 'Sendlib/1.0'
  if (request.headers['user-agent'] !== 'Sendlib/1.0') {
    console.log('User-Agent:', request.headers['user-agent'], 'not supported');
    return reply
      .code(400)
      .send({ error: `Unsupported User-Agent ${request.headers['user-agent']}` });
  }
});


fastify.all('*', async (request, reply) => {
  const verb = request.method.toLowerCase();
  const route = request.url;
  const targetUrl = `${FORWARD_TO_BASE}`;

  console.log(`\nForwarding request:`);
  console.log(`- From: ${request.url}`);
  console.log(`- To: ${targetUrl}`);
  console.log(`- Method: ${verb.toUpperCase()}`);

  console.log(`- Headers:`, request.headers);
  console.log(`- To Email:`, request.body.to);
  console.log(`- Body:`, request.body);

  const routePath = routes.find(r => r.recipient === request.body.to).url || '/no-route';
  
  try {
    console.log('Sending request to:', targetUrl + routePath);
    const proxyResponse = await axios({
      method: verb,
      url: targetUrl + routePath,
      data: request.body,
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': request.headers['x-forwarded-for'],
        'user-agent': request.headers['user-agent']
      }
    });

    console.log('\nProxy Response:');
    console.log('Status:', proxyResponse.status);
    console.log('Headers:', proxyResponse.headers);
    console.log('Data:', proxyResponse.data);

    return reply
      .code(proxyResponse.status)
      .headers(proxyResponse.headers)
      .send(proxyResponse.data);
  } catch (error) {
    console.error('\nError forwarding request:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    
    const status = error.response?.status || 500;
    const errorResponse = {
      error: true,
      message: error.message,
      details: error.response?.data
    };

    return reply
      .code(status)
      .send(errorResponse);
  }
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`\nServer Configuration:`);
    console.log(`- Server running at http://localhost:${PORT}`);
    console.log(`- Forwarding requests to: ${FORWARD_TO_BASE}`);
    console.log(`- Content-Type conversion: multipart/form-data → application/json`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();