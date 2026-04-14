const express = require('express');
const router = express.Router();
const { chatWithBot } = require('../controllers/chatController');

// Chat endpoint
router.post('/', chatWithBot);

module.exports = router;
