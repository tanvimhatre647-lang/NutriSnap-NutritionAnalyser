const express = require('express');
const router = express.Router();
const { analyzeFood, getScanHistory } = require('../controllers/foodController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/analyze', protect, upload.single('file'), analyzeFood);
router.get('/history', protect, getScanHistory);

module.exports = router;
