const express = require('express');
const {
  SettingsPage,
} = require('../../controllers/settings/settingsPageController');

const router = express.Router();

// mode_controller

router.get('/', SettingsPage);

module.exports = router;
