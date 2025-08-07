const express = require('express');
const { createWarnings } = require('../../controllers/warnings/createWarning');

const router = express.Router();

router.get('/', createWarnings);

module.exports = router;
