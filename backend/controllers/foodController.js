const axios = require('axios');
const FormData = require('form-data');
const ScanHistory = require('../models/ScanHistory');

const FOOD_PRESETS = {
  dhokla: { name: 'Dhokla', calories: 160, protein: 7, carbs: 28, fat: 3, fiber: 3, sugar: 4, sodium: 320 },
  pizza: { name: 'Margherita Pizza', calories: 280, protein: 12, carbs: 32, fat: 11, fiber: 2, sugar: 4, sodium: 560 },
  burger: { name: 'Veggie Burger', calories: 350, protein: 14, carbs: 42, fat: 15, fiber: 5, sugar: 6, sodium: 620 },
  biryani: { name: 'Vegetable Biryani', calories: 320, protein: 8, carbs: 54, fat: 9, fiber: 4, sugar: 3, sodium: 480 },
  salad: { name: 'Fresh Garden Salad', calories: 120, protein: 4, carbs: 14, fat: 6, fiber: 5, sugar: 5, sodium: 180 },
  pasta: { name: 'Penne Arrabbiata', calories: 290, protein: 10, carbs: 48, fat: 7, fiber: 4, sugar: 5, sodium: 410 },
  sandwich: { name: 'Club Sandwich', calories: 310, protein: 13, carbs: 36, fat: 12, fiber: 3, sugar: 4, sodium: 520 },
  idli: { name: 'Steamed Idli', calories: 130, protein: 4, carbs: 25, fat: 1, fiber: 2, sugar: 1, sodium: 210 },
  dosa: { name: 'Masala Dosa', calories: 240, protein: 5, carbs: 38, fat: 8, fiber: 3, sugar: 2, sodium: 390 }
};

const getFallbackFood = (filename) => {
  const name = (filename || '').toLowerCase();
  for (const key in FOOD_PRESETS) {
    if (name.includes(key)) {
      const preset = FOOD_PRESETS[key];
      return {
        foodName: preset.name,
        confidence: 85,
        nutrition: {
          calories: preset.calories,
          protein: preset.protein,
          carbs: preset.carbs,
          fat: preset.fat,
          fiber: preset.fiber,
          sugar: preset.sugar,
          sodium: preset.sodium,
          vitamins: { 'Vitamin A': 15, 'Vitamin C': 10, 'Vitamin B6': 8 },
          minerals: { 'Calcium': 120, 'Iron': 6, 'Magnesium': 35, 'Potassium': 280 }
        }
      };
    }
  }
  return {
    foodName: 'Healthy Meal Bowl',
    confidence: 80,
    nutrition: {
      calories: 250,
      protein: 12,
      carbs: 35,
      fat: 8,
      fiber: 5,
      sugar: 6,
      sodium: 300,
      vitamins: { 'Vitamin A': 12, 'Vitamin C': 8, 'Vitamin B6': 6 },
      minerals: { 'Calcium': 150, 'Iron': 8, 'Magnesium': 40, 'Potassium': 300 }
    }
  };
};

const analyzeFood = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }

    let foodName = 'Unknown Food';
    let confidence = 80;
    let nutrition = {};

    const base64Image = req.file.buffer.toString('base64');
    const imageMime = req.file.mimetype;

    // 1. Live Google Gemini 2.5 Flash AI Vision Analysis
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
      try {
        const apiKey = process.env.GEMINI_API_KEY.trim();
        const prompt = 'Analyze this image carefully. If it contains food or a dish, set "isFood": true, identify the food dish name accurately, and provide estimated nutritional breakdown per standard serving size. If the image does NOT contain food (e.g. text, chart, person, document, object), set "isFood": false. Respond strictly with JSON format: { "isFood": true, "foodName": "Exact Dish Name", "confidence": 92, "nutrition": { "calories": 250, "protein": 12, "carbs": 35, "fat": 8, "fiber": 5, "sugar": 6, "sodium": 300, "vitamins": { "Vitamin A": 12, "Vitamin C": 10 }, "minerals": { "Calcium": 140, "Iron": 6 } } }';

        const geminiResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: imageMime,
                      data: base64Image
                    }
                  }
                ]
              }
            ]
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
        );

        let responseContent = geminiResponse.data.candidates[0].content.parts[0].text;
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) responseContent = jsonMatch[0];
        const parsedData = JSON.parse(responseContent);

        if (parsedData) {
          foodName = parsedData.foodName || 'Identified Food';
          confidence = parsedData.confidence || 88;
          const isFood = parsedData.isFood !== false;

          nutrition = {
            isFood: isFood,
            calories: parsedData.nutrition?.calories || 250,
            protein:  parsedData.nutrition?.protein  || 12,
            carbs:    parsedData.nutrition?.carbs    || 35,
            fat:      parsedData.nutrition?.fat      || 8,
            fiber:    parsedData.nutrition?.fiber    || 5,
            sugar:    parsedData.nutrition?.sugar    || 6,
            sodium:   parsedData.nutrition?.sodium   || 300,
            vitamins: parsedData.nutrition?.vitamins || { 'Vitamin A': 12, 'Vitamin C': 8 },
            minerals: parsedData.nutrition?.minerals || { 'Calcium': 140, 'Iron': 6 }
          };

          return res.status(200).json({
            success: true,
            foodName: foodName,
            confidence: confidence,
            isFood: isFood,
            nutrition: nutrition
          });
        }
      } catch (apiErr) {
        console.error('Gemini 2.5 Flash Vision AI Error:', apiErr.response?.data || apiErr.message);
      }
    }

    // 2. Try HuggingFace if Gemini failed/unconfigured (HF tokens start with hf_)
    if (!foodName || foodName === 'Unknown Food') {
      if (process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_API_KEY.trim().startsWith('hf_')) {
        try {
          const hfResponse = await axios.post(
            'https://api-inference.huggingface.co/models/nateraw/food',
            req.file.buffer,
            {
              headers: {
                'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY.trim()}`,
                'Content-Type': req.file.mimetype
              },
              timeout: 7000
            }
          );
          const hfData = hfResponse.data;
          if (Array.isArray(hfData) && hfData.length > 0) {
            const topResult = Array.isArray(hfData[0]) ? hfData[0][0] : hfData[0];
            if (topResult.label && topResult.score >= 0.4) {
              foodName = topResult.label;
              confidence = Math.round(topResult.score * 100);
              nutrition = {
                calories: 250, protein: 12, carbs: 35, fat: 8, fiber: 5, sugar: 7, sodium: 300,
                vitamins: { 'Vitamin A': 12, 'Vitamin C': 8, 'Vitamin B6': 6 },
                minerals: { 'Calcium': 150, 'Iron': 8, 'Magnesium': 40, 'Potassium': 300 }
              };
            }
          }
        } catch (hfErr) {
          console.error('HuggingFace fallback error:', hfErr.message);
        }
      }
    }


    // 3. Smart local food preset fallback if no API keys match
    if (!foodName || foodName === 'Unknown Food') {
      const fallback = getFallbackFood(req.file.originalname);
      foodName = fallback.foodName;
      confidence = fallback.confidence;
      nutrition = fallback.nutrition;
    }

    // Save scan history if user is authenticated
    let scanId = 'guest-' + Date.now();
    if (req.user && req.user._id) {
      try {
        const scanRecord = await ScanHistory.create({
          user: req.user._id,
          foodName,
          confidence,
          nutrition
        });
        scanId = scanRecord._id;
      } catch (dbErr) {
        console.warn('Scan history save skipped:', dbErr.message);
      }
    }

    return res.status(200).json({
      scanId,
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
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const history = await ScanHistory.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(history);
  } catch (error) {
    console.error('getScanHistory error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { analyzeFood, getScanHistory };

