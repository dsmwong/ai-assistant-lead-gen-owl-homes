> [!NOTE]
> Twilio AI Assistants is a [Twilio Alpha](https://twilioalpha.com) project that is currently in Developer Preview.

# AI-Powered Lead Generation System

A scalable, multi-channel lead generation system powered by Twilio AI Assistants. This reference implementation demonstrates how to build an AI-driven lead nurturing system that can capture leads through various channels and engage in personalized conversations.

## System Architecture
[Architecture diagram showing system components and flow]

## Key Features

- 🤖 Dual AI Assistant System
  - Rep Assistant: Handles initial customer interactions and generates responses
  - Manager Assistant: Reviews and approves outbound communications
- 📱 Multi-Channel Support
  - Web form lead capture
  - Email communication (via SendGrid)
  - SMS, Voice, and WhatsApp (via Twilio)
  - Web chat integration
- 💾 Automated Data Management
  - Lead information storage
  - Conversation history tracking
  - Email thread management
- 🔄 Intelligent Workflow
  - Automated response generation
  - Quality control through Manager AI review
  - Channel-specific response handling

## Project Structure

```
lead-gen-ai-assistant/
├── README.md
├── package.json
├── .env.example
├── .twilioserverlessrc
├── assets/
│   ├── index.html
│   ├── lead-form.html
│   ├── style.css
│   ├── providers/
│   │   ├── database/
│   │   └── email/
│   └── utils/
├── converter/
│   ├── package.json
│   └── server.js
├── functions/
│   ├── backend/
│   │   ├── form-submitted.js
│   │   ├── log-inbound-email.js
│   │   ├── send-email.js
│   │   └── send-to-assistant.js
│   ├── channels/
│   │   ├── conversations/
│   │   ├── messaging/
│   │   └── voice/
│   └── tools/
├── knowledge/
│   └── faq.txt
├── prompts/
│   ├── manager-assistant-prompt.md
│   └── rep-assistant-prompt.md
└── src/
    ├── deploy.js
    └── config/
```

## Prerequisites

- Node.js 18+
- Twilio account with AI Assistant access
- SendGrid account
- Airtable account
- ngrok installed locally (for webhook testing)

## Setup Instructions

### 1. Clone and Configure

```bash
# Clone repository
git clone https://github.com/your-org/lead-gen-ai-assistant.git
cd lead-gen-ai-assistant

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 2. Configure Services

#### Airtable Setup
1. Copy the Airtable base using [this template](link-to-airtable-template)
2. Find your Base ID in the Airtable URL (appXXXXXXXXXXXXX)
3. Generate an access token:
   - Go to your Airtable account settings
   - Click "Create new token"
   - Select necessary scopes for your base
   - Copy the generated token

The base includes these tables:
- **Leads**: Track lead information (first_name, last_name, status, email, phone, area_code)
- **Sessions**: Manage conversation sessions and email grading
- **Inbound Emails**: Log incoming communications
- **Listings**: Store property listing data

#### SendGrid Inbound Parse Setup
1. Set up your SendGrid account and verify your domain
2. Navigate to Settings > Inbound Parse
3. Start ngrok: `ngrok http 3000`
4. Add a new Inbound Parse webhook:
   - URL: Your ngrok URL
   - Select "Post the raw, full MIME message"
5. Test the webhook using SendGrid's test feature

### 3. Deploy the System

```bash
# Deploy the system
npm run deploy

# Start the content type converter before reciving any inbound emails
npm run start:converter
```

## AI Assistant Tools

### Rep Assistant Tools

1. **Customer Lookup**
   - Purpose: Retrieves customer information at the start of conversations
   - When to use: Mandatory at the beginning of each conversation
   - Available data: First name, last name, address, email, phone
   - Method: GET
   - Usage: Enables personalized greetings and context-aware interactions

2. **Get Listings**
   - Purpose: Searches property listings based on customer criteria
   - Parameters:
     - city (optional): Target city
     - zip_code (optional): Specific ZIP code
     - state (optional): State code
     - price (optional): Maximum price point
   - Method: GET
   - Usage: Provides relevant property recommendations based on customer preferences

### Manager Assistant Tools

1. **Outbound Email Grader**
   - Purpose: Reviews and scores email communications
   - Parameters:
     - outbound_email_body: Original email content
     - manager_score: Quality score (0 to 1, e.g., 0.85)
     - outbound_email_status: "Sent" (score > 0.85) or "Draft"
     - recommended_email_body: Suggested improvements for low-scoring emails
   - Method: POST
   - Usage: Quality control for all outbound email communications

## Connecting Channels

### Voice Channel

Configure your Twilio voice number:

**Via Twilio CLI:**
```bash
twilio phone_number <your-twilio-number> \
    --voice-url=https://<your-functions-domain>.twil.io/channels/voice/incoming-call
```

**Via Twilio Console:**
1. Open your voice-capable phone number
2. Set the "When a call comes in" function to: `https://<your-functions-domain>.twil.io/channels/voice/incoming-call`

### SMS Channel

**Via Twilio CLI:**
```bash
twilio phone_number <your-twilio-number> \
    --sms-url=https://<your-functions-domain>.twil.io/channels/messaging/incoming
```

**Via Console:**
1. Open your SMS-capable number
2. Set "When a message comes in" to: `https://<your-functions-domain>.twil.io/channels/messaging/incoming`

### WhatsApp Channel

1. Go to WhatsApp Sandbox Settings
2. Set "When a message comes in" to: `https://<your-functions-domain>.twil.io/channels/messaging/incoming`

**Note:** Add AssistantSid as parameter for multiple assistants:
```
https://<your-functions-domain>.twil.io/channels/messaging/incoming?AssistantSid=AI1234561231237812312
```

### Conversations Channel

1. Create/use a Conversations Service
2. Configure webhook:
```bash
twilio api:conversations:v1:services:configuration:webhooks:update \
    --post-webhook-url=https://<your-functions-domain>.twil.io/channels/conversations/messageAdded \
    --chat-service-sid=<your-conversations-service-sid> \
    --filter=onMessageAdded
```

## Development

### Local Testing
1. Start ngrok: `ngrok http 3000`
2. Update webhook URLs with ngrok URL
3. Use test credentials in `.env`

### Adding New Functions
1. Create function in `functions/`
3. Redeploy: `npm run redeploy`

## Troubleshooting

Common issues and solutions:

1. **Webhook Issues**
   - Ensure ngrok is running and URL is updated in SendGrid
   - Check Twilio Functions logs for webhook errors
   - Verify all environment variables are set correctly

2. **AI Assistant Configuration**
   - Confirm AI Assistant Terms acceptance
   - Check tool configurations in Assistant settings
   - Verify knowledge base attachments

3. **Database Connectivity**
   - Validate Airtable API key permissions
   - Ensure Base ID is correct
   - Check table names and field mappings

## Resource Links

- [Twilio AI Assistants Documentation](https://www.twilio.com/docs/ai)
- [SendGrid API Documentation](https://docs.sendgrid.com/api-reference)
- [Airtable API Documentation](https://airtable.com/developers/web/api/introduction)
- [Channel Configuration Guides](https://www.twilio.com/docs/channels)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.