const db = require('../../lib/db/pool');
const data = require('./data');

const createWarnings = async (req, res, next) => {
  const channumArray = data.map((item) => item.channum);
  for (const item of data) {
    const text = `SELECT * FROM ${item.table} WHERE channum = ANY($1::integer[])`;
    const result = await db.query(text, [channumArray]);
    const matchingRow = result.rows.find((row) => row.channum === item.channum);
    item.value = matchingRow[item.column];
    item.sztag = matchingRow.sztag;
    item.lwl = matchingRow.lwl > matchingRow[item.column] ? true : false;
    item.hwl = matchingRow.hwl < matchingRow[item.column] ? true : false;
    item.lal = matchingRow.lal > matchingRow[item.column] ? true : false;
    item.hal = matchingRow.hal < matchingRow[item.column] ? true : false;
    // test if item.name has any of them warning true values return the the item.name and value is true
    const warningStatus = Object.keys(item).filter((key) => item[key] === true);
    console.log(warningStatus);
  }
  res.status(200).json(data);
};

module.exports = {
  createWarnings,
};
