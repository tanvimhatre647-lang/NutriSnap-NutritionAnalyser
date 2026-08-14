const express = require('express');
const router = express.Router();
const { analyzeFood, getScanHistory } = require('../controllers/foodController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/analyze', optionalProtect, upload.single('file'), analyzeFood);
router.get('/history', protect, getScanHistory);

module.exports = router;

