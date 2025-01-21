const fs = require('fs');
const path = require('path');

const promptPath = path.join(__dirname, '../../prompts/manager-assistant-prompt.md');
const personalityPrompt = fs.readFileSync(promptPath, 'utf8');

module.exports = {
  name: "Lead Gen Assistant - Owl Homes (Manager)",
  personality_prompt: personalityPrompt
};