const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const chalk = require('chalk');
require('dotenv').config();

const consoleFormat = format.printf(({ timestamp, level, message }) => {
  const time = chalk.gray(`[${timestamp}]`);
  const lvl =
    {
      info: chalk.blueBright.bold('INFO'),
      warn: chalk.yellow.bold('WARN'),
      error: chalk.red.bold('ERROR'),
      debug: chalk.greenBright.bold('DEBUG'),
    }[level] || chalk.white.bold(level.toUpperCase());

  return `${time} ${lvl}: ${message}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  transports: [
    new transports.Console({
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      ),
    }),
    new transports.DailyRotateFile({
      filename: 'logs/device-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '14d',
      zippedArchive: true,
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(
          ({ timestamp, level, message }) =>
            `[${timestamp}] ${level.toUpperCase()}: ${message}`
        )
      ),
    }),
  ],
});

module.exports = logger;
