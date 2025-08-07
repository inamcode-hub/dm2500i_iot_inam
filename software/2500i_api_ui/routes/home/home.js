const express = require('express');
const { UpdateMode } = require('../../controllers/modeUpdateController');
const { HomePage } = require('../../controllers/home/homePageController');
const {
  keyPadUpdates,
} = require('../../controllers/keypadUpdate/keyPadUpdateController');
const {
  HomePageChart,
} = require('../../controllers/home/homePageChartController');
const {
  InletCalibrationButton,

  InletCalibrationCancel,
  OutletCalibrationButton,

  OutletCalibrationCancel,
  InletDoneCalibration,
  OutletDoneCalibration,
} = require('../../controllers/home/calibrations');
const { UpdateAlarms } = require('../../controllers/home/alarms/updateAlarms');
const router = express.Router();

// mode_controller
router.get('/', HomePage);
// key_pad_updates
router.post('/keypad_updates/:name', keyPadUpdates);
// mode update

router.post('/mode_controller', UpdateMode);

// chart data
router.get('/chart', HomePageChart);
// calibration button
router.get('/inlet_calibration_button', InletCalibrationButton);
router.get('/inlet_calibration_cancel', InletCalibrationCancel);
router.get('/inlet_calibration_done', InletDoneCalibration);
router.get('/outlet_calibration_button', OutletCalibrationButton);
router.get('/outlet_calibration_cancel', OutletCalibrationCancel);
router.get('/outlet_calibration_done', OutletDoneCalibration);

// alarms

router.post('/alarms', UpdateAlarms);

module.exports = router;
