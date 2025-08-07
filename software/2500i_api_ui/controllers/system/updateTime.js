const { exec } = require('child_process');

const UpdateTime = async (req, res, next) => {
  const password = process.env.PGPASSWORD;
  const { date, time } = req.body;
  try {
    const setTimeScript = `
    echo '${password}' | sudo -S systemctl stop ntp
    echo '${password}' | sudo -S systemctl disable ntp
    echo '${password}' | sudo -S date -s "${date} ${time}"
    echo '${password}' | sudo -S hwclock --systohc
    echo '${password}' | sudo -S systemctl mask systemd-timesyncd
    date
  `;

    exec(setTimeScript, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing script: ${error}`);
        return res.status(500).json({
          success: false,
          message: 'Error executing script',
          error: error.message,
        });
      }

      res
        .status(200)
        .json({ success: true, message: 'Time updated', data: stdout });
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: 'Server error', error: err });
  }
};

module.exports = {
  UpdateTime,
};
