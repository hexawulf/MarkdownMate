import winston from 'winston';
import path from 'path';

const { combine, timestamp, json, errors, colorize, printf } = winston.format;

// Ensure the logs directory exists (though typically this should be handled outside the logger)
// For this exercise, we'll assume it's handled by the setup script or deployment process.
// const logsDir = path.join(process.cwd(), 'logs'); // Old path resolution

// New path resolution using __dirname to be robust to CWD changes
// __dirname in this file (server/src/logger/index.ts) points to server/src/logger
// So, ../../logs points to project_root/logs
const logsDir = path.resolve(__dirname, '../../logs');

const logger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }), // Log stack traces for errors
    json() // Output logs in JSON format
  ),
  defaultMeta: { service: 'markdownmate' }, // Add a meta field for service name
  transports: [
    // - Write all logs with level `error` and below to `error.log`
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
    }),
    // - Write all logs with level `info` and below to `combined.log`
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
    }),
  ],
});

// If not in production, add a console transport with colorized output
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
