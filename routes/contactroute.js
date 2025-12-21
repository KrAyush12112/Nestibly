const express = require('express');
const contactController = require('../controller/contactController');
const router = express.Router();

router.get('/', contactController.getContact);
router.post('/', contactController.postContact);

module.exports = { contactroute: router };
