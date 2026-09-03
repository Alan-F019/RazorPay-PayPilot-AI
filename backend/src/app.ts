import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config/env';
import apiRouter from './routes/api';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp(): Express {
  const app = express();

  // Explicit allowed development origins
  const defaultDevOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    config.frontendUrl,
    ...config.allowedOrigins,
  ];

  const allowedOriginsSet = new Set(defaultDevOrigins.map((o) => o.replace(/\/$/, '')));

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server, webhook tests)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, '');

      if (allowedOriginsSet.has(normalizedOrigin)) {
        return callback(null, true);
      }

      // In development mode, allow local network IP addresses on standard dev ports
      // (e.g. 192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      if (
        config.nodeEnv === 'development' &&
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
          normalizedOrigin
        )
      ) {
        return callback(null, true);
      }

      console.warn(`[CORS] Rejected request from unauthorized origin: ${origin}`);
      callback(new Error(`CORS origin '${origin}' not allowed by PayPilot policy.`));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-razorpay-signature',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Content-Length', 'x-razorpay-signature'],
    optionsSuccessStatus: 200,
  };

  // 1. Register CORS Middleware globally BEFORE any route or parser
  app.use(cors(corsOptions));

  // 2. Explicitly handle all OPTIONS preflight requests
  app.options('*', cors(corsOptions));

  // 3. Request Parsers with raw body buffer preservation for webhook signature verification
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // 4. Basic request logger in development
  if (config.nodeEnv !== 'test') {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[API] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
      });
      next();
    });
  }

  // 5. Mount API Routes
  app.use('/api', apiRouter);

  // 6. Error & Not Found Handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
