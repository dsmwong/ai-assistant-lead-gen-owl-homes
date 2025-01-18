const fastify = require('fastify')();
const multipart = require('@fastify/multipart');
const axios = require('axios');

// Environment variables
const FORWARD_TO = process.env.FORWARD_TO || 'https://webhook.site/0251787a-9a06-4982-aa42-a964aabea047';
const PORT = process.env.PORT || 3000;

// Register multipart
fastify.register(multipart, { addToBody: true });

// Root route for health check
fastify.all('/', async (_, reply) => {
  reply.send(
    `Content-Type converter service running. Forwarding requests to ${FORWARD_TO}`
  );
});

// Handle all other routes
fastify.all('/:route', async (request, reply) => {
  const verb = request.method.toLowerCase();
  const route = `/${request.params.route}`;

  console.log(`Incoming ${verb}-request to ${route}`);
  console.log('Request body:', request.body);

  try {
    const proxyResponse = await axios({
      method: verb,
      url: `${FORWARD_TO}${route}`,
      data: request.body,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Response status: ${proxyResponse.status}`);
    reply
      .code(proxyResponse.status)
      .headers(proxyResponse.headers)
      .send(proxyResponse.data);
  } catch (error) {
    console.error('Error:', error.message);
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: error.message };
    
    reply
      .code(status)
      .send(data);
  }
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Forwarding requests to: ${FORWARD_TO}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();