const os = require('os');
const { execSync } = require('child_process');
const crypto = require('crypto');
const { version: softwareVersion } = require('../../package.json'); // adjust relative path if needed

function safeExec(cmd, fallback = 'unknown') {
  try {
    return execSync(cmd).toString().trim() || fallback;
  } catch {
    return fallback;
  }
}

function getHardwareInfo() {
  const hostname = os.hostname();
  const mac = safeExec("ip link | awk '/ether/ {print $2; exit}'");
  const diskUUID = safeExec(
    'findmnt -no SOURCE / | xargs blkid -s UUID -o value'
  );

  const combined = `${hostname}-${mac}-${diskUUID}`;
  const deviceUUID = crypto.createHash('sha256').update(combined).digest('hex');

  return {
    hostname,
    mac,
    diskUUID,
    deviceUUID,
    softwareVersion, // 👈 add this
  };
}

module.exports = getHardwareInfo;
