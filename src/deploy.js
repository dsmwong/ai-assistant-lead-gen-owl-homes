// src/deploy.js
require('dotenv').config();
const twilio = require('twilio');
const { TwilioServerlessApiClient } = require('@twilio-labs/serverless-api');
const readline = require('readline');
const fs = require('fs');
const knowledgeConfig = require('./config/rep-knowledge');
const createAssistant = require('./lib/createAssistant');
const createTools = require('./lib/createTools');
const createKnowledge = require('./lib/createKnowledge');
const createVoiceIntel = require('./lib/createVoiceIntel');
const deployFunctions = require('./lib/deployFunctions');
const managerAssistantConfig = require('./config/manager-assistant');
const repAssistantConfig = require('./config/rep-assistant');
const managerToolsConfig = require('./config/manager-tools');
const repToolsConfig = require('./config/rep-tools');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify readline question
const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

// Helper function to update .env file
const updateEnvFile = (key, value) => {
  const envFilePath = '.env';
  const envContent = fs.readFileSync(envFilePath, 'utf8');
  const envLines = envContent.split('\n');

  // Check if key already exists
  const keyIndex = envLines.findIndex((line) => line.startsWith(`${key}=`));

  if (keyIndex !== -1) {
    // Update existing key
    envLines[keyIndex] = `${key}=${value}`;
  } else {
    // Add new key
    envLines.push(`${key}=${value}`);
  }

  fs.writeFileSync(envFilePath, envLines.join('\n'));
  console.log(`✓ Updated .env file with ${key}`);
};

/**
 * Main deployment script that orchestrates the creation of the assistant,
 * its tools, knowledge bases, and optionally Voice Intelligence Service
 */
async function deploy() {
  // Validate environment variables
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error(
      'Missing required environment variables. Please check .env file.'
    );
  }

  console.log('Starting AI Assistants deployment...\n');

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const serverlessClient = new TwilioServerlessApiClient({
    username: process.env.TWILIO_ACCOUNT_SID,
    password: process.env.TWILIO_AUTH_TOKEN,
  });

  try {
    // Step 1: Deploy Twilio Functions backend
    console.log('Step 1: Deploying Twilio Functions backend...');
    const result = await deployFunctions(serverlessClient);
    console.log('✓ Twilio Functions backend deployed successfully\n');

    // Save Functions domain to .env
    updateEnvFile('FUNCTIONS_DOMAIN', result.domain);

    // Step 2: Create the manager assistant
    console.log('Step 2: Creating Manager AI Assistant...');
    const managerAssistant = await createAssistant(client, managerAssistantConfig);
    console.log('✓ Manager Assistant created successfully');
    console.log('Manager Assistant SID:', managerAssistant.id);

    // Save Manager Assistant SID to .env
    updateEnvFile('MANAGER_ASSISTANT_ID', managerAssistant.id);

    // Step 3: Create and attach manager tools
    console.log('\nStep 3: Creating and attaching manager tools...');
    const managerTools = await createTools(
      client,
      managerAssistant.id,
      managerToolsConfig(result.domain)
    );
    console.log(`✓ Successfully created and attached ${managerTools.length} manager tools`);

    // Step 4: Create the rep assistant
    console.log('\nStep 4: Creating Rep AI Assistant...');
    const repAssistant = await createAssistant(client, repAssistantConfig);
    console.log('✓ Rep Assistant created successfully');
    console.log('Rep Assistant SID:', repAssistant.id);

    // Save Rep Assistant SID to .env
    updateEnvFile('REP_ASSISTANT_ID', repAssistant.id);

    // Step 5: Create and attach rep tools
    console.log('\nStep 5: Creating and attaching rep tools...');
    const repTools = await createTools(
      client,
      repAssistant.id,
      repToolsConfig(result.domain)
    );
    console.log(`✓ Successfully created and attached ${repTools.length} rep tools`);

    // Step 6: Create and attach knowledge bases (if needed for rep assistant)
    console.log('\nStep 6: Creating and attaching knowledge bases...');
    const knowledge = await createKnowledge(
      client,
      repAssistant.id,
      knowledgeConfig
    );
    console.log(`✓ Successfully created and attached ${knowledge.length} knowledge bases`);

    // Step 7: Finishing deployment configuration
    console.log('\nStep 7: Finishing deployment configuration...');
    const variables = {
      MANAGER_ASSISTANT_ID: managerAssistant.id,
      REP_ASSISTANT_ID: repAssistant.id,
    };

    await serverlessClient.setEnvironmentVariables({
      serviceSid: result.serviceSid,
      environment: result.environmentSid,
      env: variables,
      append: true,
    });
    console.log('✓ Deployment configuration completed successfully');

    // Deployment summary
    console.log('\n=== Deployment Summary ===');
    console.log('Manager Assistant SID:', managerAssistant.id);
    console.log('Manager Tools created:', managerTools.length);
    console.log('Rep Assistant SID:', repAssistant.id);
    console.log('Rep Tools created:', repTools.length);
    console.log('Knowledge bases created:', knowledge.length);
    console.log('\nDeployment completed successfully! 🎉');
    console.log('\nNext steps:');
    console.log('1. Visit the Twilio Console to view your assistants');
    console.log('2. Test both assistant functionalities');
    console.log('3. Update webhook URLs if needed');
    console.log('4. Run ngrok on Port 3000');
    console.log('5. Add the ngrok URL to SendGrid Inbound Parse');
    console.log('6. Fill out the Lead Gen Form', `https://${result.domain}/lead-form.html`);
    // Close readline interface
    rl.close();

    return {
      managerAssistant,
      repAssistant,
      managerTools,
      repTools,
      knowledge,
    };
  } catch (error) {
    console.error('\n❌ Deployment failed:');
    console.error('Error:', error.message);

    if (error.code) {
      console.error('Error Code:', error.code);
    }
    if (error.status) {
      console.error('Status Code:', error.status);
    }

    console.log('\nTroubleshooting suggestions:');
    console.log('1. Check your Twilio credentials');
    console.log('2. Verify your account has AI Assistant access');
    console.log('3. Ensure all webhook URLs are valid');
    console.log('4. Check for any duplicate resource names');

    // Close readline interface
    rl.close();
    throw error;
  }
}

// Add cleanup function for handling interruptions
process.on('SIGINT', async () => {
  console.log('\n\nReceived interrupt signal. Cleaning up...');
  rl.close();
  process.exit(0);
});

// Run the deployment if this script is executed directly
if (require.main === module) {
  deploy()
    .then((result) => {
      console.log('\nYou can now find your assistants in the Twilio Console:');
      console.log(
        `https://console.twilio.com/us1/develop/ai-assistants/assistants/${result.managerAssistant.id}`
      );
      console.log(
        `https://console.twilio.com/us1/develop/ai-assistants/assistants/${result.repAssistant.id}`
      );
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nDeployment failed. See error details above.');
      process.exit(1);
    });
}

module.exports = deploy;
