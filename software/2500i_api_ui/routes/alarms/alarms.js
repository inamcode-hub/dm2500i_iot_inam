const express = require('express');
const { alarm } = require('../../controllers/alarms/alarms');

const router = express.Router();

router.post('/', alarm);

module.exports = router;
