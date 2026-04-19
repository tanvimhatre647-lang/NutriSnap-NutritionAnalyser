const axios = require('axios');

const chatWithBot = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const prompt = `You are NutriBot, a helpful AI nutrition assistant. Give concise and accurate answers related to food, nutrition, diets, or healthy habits. Be friendly and supportive.\n\nUser: ${message}\nNutriBot:`;
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const botMessage = response.data.candidates[0].content.parts[0].text;
    return res.status(200).json({ reply: botMessage });
  } catch (error) {
    console.error('Chat API Error:', error.response ? JSON.stringify(error.response.data) : error.message);
    return res.status(500).json({ message: 'Error processing chat request' });
  }
};

module.exports = { chatWithBot };
