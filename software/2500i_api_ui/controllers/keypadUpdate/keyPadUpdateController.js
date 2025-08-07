const { data } = require('../../lib/data/keypadData');
const db = require('../../lib/db/pool');
const { isAlarmParam } = require('./alarmUtils');
const validateAlarmLimits = require('./alarmLimitsTest');

const keyPadUpdates = async (req, res, next) => {
  const value = req.body.value;
  const param = req.params.name;

  const validParam = data.find((item) => item.name === param);
  if (!validParam)
    return res.status(400).json({
      status: 'error',
      message: 'Invalid parameter',
    });

  if (isAlarmParam(param)) {
    const alarmError = await validateAlarmLimits(param, value);
    if (alarmError) {
      return res.status(400).json({
        status: 'warning',
        message: alarmError,
      });
    }
  }

  try {
    const text = `UPDATE ${validParam.table} SET ${validParam.column} = $1 WHERE channum = $2`;
    const values = [value, validParam.channum];
    const result = await db.query(text, values);

    res.status(200).json({
      status: 'success',
      message: 'Value Updated Successfully!',
      detailMessage: {
        name: validParam.name,
        channum: validParam.channum,
        sztag: validParam.sztag,
        column: validParam.column,
        value: value,
        table: validParam.table,
      },
      result: result.rowCount,
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
};

module.exports = {
  keyPadUpdates,
};
