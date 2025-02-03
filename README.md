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
To start the SendGrid email content converter:
```bash
npm run start:converter
```

For development, run both the main script and converter together:
```bash
npm run dev
```

## Database Tables
The project interacts with several database tables to manage leads, email logs, and assistant interactions. Ensure your database is correctly configured according to the environment variables set in `.env`.

## Troubleshooting
- Check Twilio Debugger for logs: [Twilio Debugger](https://console.twilio.com/us1/monitor/logs/debugger/errors)
- Ensure all API keys are correctly set in the `.env` file.
- Use `ngrok` to expose local services if needed.

## License
This project is licensed under the MIT License.

