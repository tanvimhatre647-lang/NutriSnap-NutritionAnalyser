const axios = require('axios');
const FormData = require('form-data');
const ScanHistory = require('../models/ScanHistory');

const analyzeFood = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }

    let foodName = 'Unknown Food';
    let confidence = 80;
    let nutritionData = {};

    // Base64 encode the image
    const base64Image = req.file.buffer.toString('base64');
    const imageMime = req.file.mimetype;

    let nutrition = {};

    try {
      const openRouterResponse = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this image. If it contains food, identify the main dish, guess its standard nutritional values, and set "isFood" to true. If it does not contain food, set "isFood" to false. Respond strictly with a JSON object in this format: { "foodName": "Name", "confidence": 85, "isFood": true, "nutrition": { "calories": 250, "protein": 12, "carbs": 35, "fat": 8, "fiber": 5, "sugar": 7, "sodium": 300, "vitamins": { "Vitamin A": 12, "Vitamin C": 8, "Vitamin B6": 6 }, "minerals": { "Calcium": 150, "Iron": 8, "Magnesium": 40, "Potassium": 300 } } }'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${imageMime};base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
          }
        }
      );

      const responseContent = openRouterResponse.data.choices[0].message.content;
      const parsedData = JSON.parse(responseContent);

      if (!parsedData.isFood || parsedData.confidence < 40 || parsedData.foodName === 'Unknown Food') {
        return res.status(400).json({ message: 'please upload a valid food image' });
      }

      foodName = parsedData.foodName;
      confidence = parsedData.confidence;
      
      // Merge with default nutrition to ensure no missing keys
      nutrition = {
        calories: parsedData.nutrition?.calories || 250,
        protein:  parsedData.nutrition?.protein  || 12,
        carbs:    parsedData.nutrition?.carbs    || 35,
        fat:      parsedData.nutrition?.fat      || 8,
        fiber:    parsedData.nutrition?.fiber    || 5,
        sugar:    parsedData.nutrition?.sugar    || 7,
        sodium:   parsedData.nutrition?.sodium   || 300,
        vitamins: parsedData.nutrition?.vitamins || { 'Vitamin A': 12, 'Vitamin C': 8, 'Vitamin B6': 6 },
        minerals: parsedData.nutrition?.minerals || { 'Calcium': 150, 'Iron': 8, 'Magnesium': 40, 'Potassium': 300 }
      };

    } catch (apiErr) {
      console.error('OpenRouter analyze error:', apiErr.response ? (apiErr.response.data || apiErr.response.statusText) : apiErr.message);
      console.log('Initiating HuggingFace Fallback for food identification...');
      
      try {
        const hfResponse = await axios.post(
          'https://api-inference.huggingface.co/models/nateraw/food',
          req.file.buffer,
          {
            headers: {
              'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              'Content-Type': req.file.mimetype
            }
          }
        );

        const hfData = hfResponse.data;
        if (Array.isArray(hfData) && hfData.length > 0) {
          // Some HF classification models return array of arrays: [[{label: 'a', score: 0.9}]] or just [{label: 'a', score: 0.9}]
          // nateraw/food returns an array of objects
          const topResult = Array.isArray(hfData[0]) ? hfData[0][0] : hfData[0];
          foodName = topResult.label || 'Unknown Food';
          confidence = Math.round((topResult.score || 0) * 100);
          
          if (confidence < 40 || foodName === 'Unknown Food') {
             return res.status(400).json({ message: 'please upload a valid food image' });
          }

          // Use default base nutrition
          nutrition = {
            calories: 250,
            protein: 12,
            carbs: 35,
            fat: 8,
            fiber: 5,
            sugar: 7,
            sodium: 300,
            vitamins: { 'Vitamin A': 12, 'Vitamin C': 8, 'Vitamin B6': 6 },
            minerals: { 'Calcium': 150, 'Iron': 8, 'Magnesium': 40, 'Potassium': 300 }
          };
        } else {
          throw new Error('Invalid prediction format from HuggingFace');
        }

      } catch (hfErr) {
        console.error('HuggingFace fallback error:', hfErr.response ? (hfErr.response.data || hfErr.response.statusText) : hfErr.message);
        return res.status(500).json({ message: 'Server error during AI vision analysis on both APIs' });
      }
    }

    const scanRecord = await ScanHistory.create({
      user: req.user.id,
      foodName,
      confidence,
      nutrition
    });

    return res.status(200).json({
      scanId: scanRecord._id,
      foodName,
      confidence,
      nutrition
    });

  } catch (error) {
    console.error('analyzeFood error:', error.message);
    return res.status(500).json({ message: 'Server error during analysis' });
  }
};

const getScanHistory = async (req, res) => {
  try {
    const history = await ScanHistory.find({ user: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json(history);
  } catch (error) {
    console.error('getScanHistory error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { analyzeFood, getScanHistory };
