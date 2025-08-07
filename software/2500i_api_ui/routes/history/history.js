const express = require('express');
const { history } = require('../../controllers/history/historyController');

const router = express.Router();

router.post('/', history);

module.exports = router;
