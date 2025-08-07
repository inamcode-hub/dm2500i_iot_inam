const express = require('express');
const { UpdateTime } = require('../../controllers/system/updateTime');
const { health, ping } = require('../../controllers/system/healthController');

const router = express.Router();

router.post('/update_time', UpdateTime);
router.get('/health', health);
router.get('/ping', ping);

module.exports = router;
