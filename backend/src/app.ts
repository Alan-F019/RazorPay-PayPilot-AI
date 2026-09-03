import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config/env';
import apiRouter from './routes/api';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp(): Express {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        config.frontendUrl,
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Request Parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Basic request logger in development
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

  // Mount API Routes
  app.use('/api', apiRouter);

  // Error & Not Found Handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
