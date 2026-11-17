import express from 'express';
import { createGoogleAuthCallbackRouter } from './googleAuth';
import { createApiRouter } from './routes';

export function createExpressApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  // Basic security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use('/auth/google', createGoogleAuthCallbackRouter());
  app.use('/api', createApiRouter());

  // Payload error handler (e.g. body > 1MB or malformed JSON)
  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: 'Format data JSON tidak valid.' });
    }
    if (err && typeof err === 'object' && 'type' in err && (err as { type?: string }).type === 'entity.too.large') {
      return res.status(413).json({ error: 'Ukuran data melebihi batas maksimal 1 MB.' });
    }
    return next(err);
  });

  return app;
}
