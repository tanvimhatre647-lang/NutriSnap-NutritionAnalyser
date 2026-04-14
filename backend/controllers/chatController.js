const axios = require('axios');

const chatWithBot = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo', // You can choose an appropriate model supported by OpenRouter
        messages: [
          {
            role: 'system',
            content: 'You are NutriBot, a helpful AI nutrition assistant. Give concise and accurate answers related to food, nutrition, diets, or healthy habits. Be friendly and supportive.'
          },
          {
            role: 'user',
            content: message
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://nutrisnap-demo.com', // Optional but recommended by OpenRouter
          'X-Title': 'NutriSnap'
        }
      }
    );

    const botMessage = response.data.choices[0].message.content;
    return res.status(200).json({ reply: botMessage });
  } catch (error) {
    console.error('Chat API Error:', error.response ? error.response.data : error.message);
    return res.status(500).json({ message: 'Error processing chat request' });
  }
};

module.exports = { chatWithBot };
