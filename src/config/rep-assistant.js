const fs = require('fs');
const path = require('path');

const promptPath = path.join(__dirname, '../../prompts/rep-assistant-prompt.md');
const personalityPrompt = fs.readFileSync(promptPath, 'utf8');

module.exports = {
  name: "Lead Gen Assistant - Owl Homes (Rep)",
  personality_prompt: personalityPrompt
};