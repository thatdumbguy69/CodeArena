const express = require('express');
const router = express.Router();
const { handleContactSubmit } = require('../controllers/contactController');

router.post('/submit', handleContactSubmit);

module.exports = router;
