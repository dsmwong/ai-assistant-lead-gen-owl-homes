const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const uploadKnowledgeBase = async (assistantId) => {
  const uploadUrl = `https://assistants-upload.twilio.com/v1/Knowledge/Upload`;
  const form = new FormData();

  form.append('name', 'Owl Homes FAQ');
  form.append('description', 'Use this to answer questions about Owl Homes services, consultations, property valuations, and general real estate inquiries.');
  form.append('type', 'File');
  form.append('assistant_id', assistantId);
  form.append('file_0', fs.createReadStream('knowledge/faq.txt'), {
    contentType: 'text/plain',
  });

  try {
    const response = await axios.post(uploadUrl, form, {
      auth: {
        username: process.env.TWILIO_API_KEY,
        password: process.env.TWILIO_API_SECRET,
      },
      headers: form.getHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading knowledge base:', error.message);
    throw error;
  }
};

module.exports = {
  faqs: {
    name: "Owl Homes FAQ",
    type: "File",
    description: "Use this to answer questions about Owl Homes services, consultations, property valuations, and general real estate inquiries.",
    uploadFunction: uploadKnowledgeBase
  }
};