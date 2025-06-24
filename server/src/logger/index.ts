import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Absolute path for centralized log used by PiDeck
const centralizedLogFile = '/home/zk/logs/markdownmate.log';

// Ensure the target log directory exists
const centralizedLogDir = path.dirname(centralizedLogFile);
if (!fs.existsSync(centralizedLogDir)) {
  fs.mkdirSync(centralizedLogDir, { recursive: true });
}

const { combine, timestamp, json, errors, colorize, printf } = winston.format;

const logger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'markdownmate' },
  transports: [
    new winston.transports.File({
      filename: centralizedLogFile,
    }),
  ],
});

// Console output in development mode
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        printf(({ level, message, timestamp, stack, service }) => {
          let logMessage = `${timestamp} ${level} [${service}]: ${message}`;
          if (stack) {
            logMessage += `\n${stack}`;
          }
          return logMessage;
        })
      ),
    })
  );
}

export default logger;
