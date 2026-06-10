import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config, isProd } from './config';
import { errorHandler } from './middleware/error';
import authRoutes from './routes/auth';
import categoryRoutes from './routes/categories';
import linkRoutes from './routes/links';
import tagRoutes from './routes/tags';
import userRoutes from './routes/users';
import settingsRoutes from './routes/settings';
import { startScheduler } from './services/scheduler';

const app = express();

// Behind nginx (reverse proxy) in production: trust the first proxy hop so that
// express-rate-limit sees the real client IP and Secure cookies behave correctly.
if (isProd) {
  app.set('trust proxy', 1);
}

app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'linkportal-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/links', linkRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);

app.use(errorHandler);

const onListening = () => {
  console.log(`LinkPortal backend running on http://${config.host || 'localhost'}:${config.port}`);
  startScheduler();
};

// In production config.host is '127.0.0.1' (loopback only, reached via nginx);
// in development it is empty, so fall back to the default listen on all interfaces.
if (config.host) {
  app.listen(config.port, config.host, onListening);
} else {
  app.listen(config.port, onListening);
}
