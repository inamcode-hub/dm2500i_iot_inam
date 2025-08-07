// home.js
const deviceState = require('../../../../device/state');
const logger = require('../../../../utils/logger');
const homeApi = require('../../../../api/home');

let dataInterval = null;
let chartInterval = null;
let chartData = null;

function startHomeStream(socket, streamType) {
  if (dataInterval) {
    logger.warn(`[Home Stream] Already connected`);
    return;
  }

  const fetchChartData = async () => {
    try {
      chartData = await homeApi.getChartData();
      logger.info('[Home Chart] ✅ Updated chart data');
    } catch (err) {
      logger.error('[Home Chart] ❌ Failed to fetch chart:', err.message);
      chartData = null;
    }
  };

  fetchChartData(); // Initial call
  chartInterval = setInterval(fetchChartData, 60_000);

  const sendLiveData = async () => {
    try {
      const liveData = await homeApi.getLiveHomeData();
      
      const payload = {
        type: 'streamData',
        streamType,
        serial: deviceState.get().serial,
        data: {
          live: liveData.sensorData,
          chart: chartData || null,
          deviceInfo: liveData.deviceInfo,
        },
        timestamp: Date.now(),
      };

      if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify(payload));
        // logger.info('[Home Stream] ✅ Data sent successfully');
      } else {
        logger.warn('[Home Stream] ⚠️ Socket not ready, readyState:', socket?.readyState);
      }
    } catch (err) {
      logger.error('[Home Stream] ❌ Failed to get live data:', err.message);
    }
  };

  // Database connection is handled by centralized service at startup
  // Send initial data
  sendLiveData();
  
  // Start sending data every 1 second
  dataInterval = setInterval(sendLiveData, 1000);
  
  logger.info('[Home Stream] ✅ Home stream started (database managed by centralized service)');
}

function stopHomeStream() {
  if (dataInterval) {
    clearInterval(dataInterval);
    dataInterval = null;
    logger.info('[Home Stream] 🔌 Data stream stopped.');
  }

  if (chartInterval) {
    clearInterval(chartInterval);
    chartInterval = null;
  }

  chartData = null;
}

module.exports = startHomeStream;
module.exports.stop = stopHomeStream;
