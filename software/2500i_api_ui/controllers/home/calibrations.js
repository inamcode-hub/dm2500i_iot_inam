const db = require('../../lib/db/pool');

// =========================================Inlet=========================================
// =====Calibration button start=====

const InletCalibrationButton = async (req, res) => {
  try {
    const updateQuery = `UPDATE io_table SET pv = $1 WHERE channum = 203`;
    const result = await db.query(updateQuery, [1]);

    res
      .status(200)
      .json({ message: 'Calibration updated successfully', result });
  } catch (error) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error', result: err });
  }
};

//========Cancel Calibration Start========
const InletCalibrationCancel = async (req, res) => {
  try {
    const updateQuery = `UPDATE io_table SET pv = $1 WHERE channum = 91`;
    await db.query(updateQuery, [1]);

    res.status(200).json({ message: 'Calibration cancel !' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', result: err });
  }
};
//=========Done Calibration Start========
const InletDoneCalibration = async (req, res) => {
  try {
    const updateQuery = `UPDATE io_table SET pv = $1 WHERE channum = 90`;
    await db.query(updateQuery, [1]);

    res.status(200).json({ message: 'Calibration cancel !' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', result: err });
  }
};

// =========================================Outlet=========================================
// =======Calibration button start=======

const OutletCalibrationButton = async (req, res) => {
  try {
    const updateQuery = `UPDATE io_table SET pv = $1 WHERE channum = 204`;
    const result = await db.query(updateQuery, [1]);
    res
      .status(200)
      .json({ message: 'Calibration updated successfully', result });
  } catch (error) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error', result: err });
  }
};

// ======Cancel Calibration Start=======
const OutletCalibrationCancel = async (req, res) => {
  try {
    const updateQuery = `UPDATE io_table SET pv = $1 WHERE channum = 93`;
    await db.query(updateQuery, [1]);

    res.status(200).json({ message: 'Calibration cancel !' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', result: err });
  }
};
// ======Done Calibration Start=======
const OutletDoneCalibration = async (req, res) => {
  try {
    const updateQuery = `UPDATE io_table SET pv = $1 WHERE channum = 92`;
    await db.query(updateQuery, [1]);

    res.status(200).json({ message: 'Calibration cancel !' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', result: err });
  }
};

// =========================================Outlet End=========================================

module.exports = {
  InletCalibrationButton,
  InletCalibrationCancel,
  InletDoneCalibration,
  OutletCalibrationButton,
  OutletCalibrationCancel,
  OutletDoneCalibration,
};
