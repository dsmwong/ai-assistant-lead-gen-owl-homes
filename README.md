# AI Assistant Lead Gen Owl Homes

## Overview
This project is a Twilio AI Assistant for lead generation with Owl Homes. It captures lead information, manages email communications via SendGrid, and integrates with Twilio services for conversations and automation.

## Prerequisites
Before deploying the project, ensure you have the following:
- Node.js 18+
- Twilio Account
- SendGrid Account
- Airtable Account (if using Airtable as a database)
- ngrok (for local development)

## Setup
### 1. Clone the Repository
```bash
git clone https://github.com/twilio/nmogil-tw-ai-assistants-lead-gen.git
cd nmogil-tw-ai-assistants-lead-gen
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy the `.env.example` file to `.env` and update it with your Twilio, SendGrid, and Airtable credentials.
```bash
cp .env.example .env
nano .env
```

## Deployment
### Deploying the Script
To deploy the Twilio Serverless Functions:
```bash
npm run deploy
```

### Re-deploying Functions
If you make changes and need to re-deploy:
```bash
npm run redeploy
```

### Running the SendGrid Email Converter
To start the SendGrid inbound email converter:
```bash
npm run start:converter
```

## Connecting Channels

After deploying your functions and assistant, you'll need to connect various Twilio channels. Here's how to set up each channel:

- [Conversations](https://www.twilio.com/docs/alpha/ai-assistants/code-samples/channel-conversations)
- [SMS & Whatsapp](https://www.twilio.com/docs/alpha/ai-assistants/code-samples/channel-messaging)
- [Conversations with React](https://www.twilio.com/docs/alpha/ai-assistants/code-samples/react)
- [Transition to Flex](https://www.twilio.com/docs/alpha/ai-assistants/code-samples/transition-flex)
- [Flex Voice Handoff](https://docs.google.com/document/d/14RuOxt6FUAuc62A7BmeQFZWHr5WcXOoQZluZEF98GJA/edit?usp=sharing)
- [Transition to Sudio](https://www.twilio.com/docs/alpha/ai-assistants/code-samples/transition-studio)
- [Other Examples](https://github.com/twilio-labs/ai-assistants-samples)

### Voice Channel

:warning: **Add your Assistant ID to the incoming-call function**

Configure your Twilio voice number to use the AI Assistant:

**Via Twilio CLI:**

```bash
twilio phone_number <your-twilio-number> \
    --voice-url=https://<your-functions-domain>.twil.io/channels/voice/incoming-call
```

OR If Using Voice Intel.

```bash
twilio phone_number <your-twilio-number> \
    --voice-url=https://<your-functions-domain>.twil.io/channels/voice/incoming-call-voice-intel
```

**Via Twilio Console:**

1. Open your voice-capable phone number
2. Set the "When a call comes in" function to: `https://<your-functions-domain>.twil.io/channels/voice/incoming-call` or `https://<your-functions-domain>.twil.io/channels/voice/incoming-call-voice-intel`

### Messaging Channels

#### SMS

**Via Twilio CLI:**

```bash
twilio phone_number <your-twilio-number> \
    --sms-url=https://<your-functions-domain>.twil.io/channels/messaging/incoming
```

**Via Twilio Console:**

1. Open your SMS-capable phone number or Messaging Service
2. Set the "When a message comes in" webhook to: `https://<your-functions-domain>.twil.io/channels/messaging/incoming`

#### WhatsApp

1. Go to your WhatsApp Sandbox Settings in the Twilio Console
2. Configure the "When a message comes in" function to: `https://<your-functions-domain>.twil.io/channels/messaging/incoming`

**Note:** To use the same webhook for multiple assistants, add the AssistantSid as a parameter:

```
https://<your-functions-domain>.twil.io/channels/messaging/incoming?AssistantSid=AI1234561231237812312
```

### Conversations Channel

Set up Twilio Conversations integration:

1. Create a Conversations Service or use your default service
2. Run this Twilio CLI command to configure the webhook:

```bash
twilio api:conversations:v1:services:configuration:webhooks:update \
    --post-webhook-url=https://<your-functions-domain>.twil.io/channels/conversations/messageAdded \
    --chat-service-sid=<your-conversations-service-sid> \
    --filter=onMessageAdded
```

3. Follow the [Twilio Conversations documentation](https://www.twilio.com/docs/conversations/overview) to connect your preferred channels

## Tool Functions

The assistants use several tool functions that need to be implemented:

1. Customer Lookup (`/tools/customer-lookup`)

   - GET request
   - Looks up customer information
   - Returns customer details

2. Get Listings (`/tools/get-listings`)

   - GET request
   - Retrieves listing information
   - Input schema:
     ```typescript
     {
        city?: string,
        zip_code?: string,
        state?: string,
        price?: number
     }
     ```

3. Outbound Email Grader (`/backend/log-sessions`)

   - POST request
   - Updates the outbound email log with the assistant's response and manager score.
   - If the manager score is below a certain threshold, the email is flagged for review.
   - Input schema:
     ```typescript
     {
        outbound_email_body: string,
        manager_score: number,
        outbound_email_status: string,
        recommended_email_body: string
     }
     ```

## Database Tables
The project interacts with several database tables to manage leads, email logs, and assistant interactions. Ensure your database is correctly configured according to the environment variables set in `.env`.

## Troubleshooting
- Check Twilio Debugger for logs: [Twilio Debugger](https://console.twilio.com/us1/monitor/logs/debugger/errors)
- Ensure all API keys are correctly set in the `.env` file.
- Use `ngrok` to expose local services if needed.

## License
This project is licensed under the MIT License.

