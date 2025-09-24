// logger.ts
import winston from 'winston';
import { trace } from '@opentelemetry/api';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf((info) => {
      // Add OpenTelemetry trace context
      const span = trace.getActiveSpan();
      if (span) {
        const context = span.spanContext();
        info.traceId = context.traceId;
        info.spanId = context.spanId;
      }
      return JSON.stringify(info);
    })
  ),
  defaultMeta: {
    service: process.env.OTEL_SERVICE_NAME || 'flrts',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

// Express.js middleware for request logging
export function requestLogger(req: any, res: any, next: any) {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();

  req.requestId = requestId;

  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
    });
  });

  next();
}
