import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler } from './middleware/error';
import authRoutes from './routes/auth';
import categoryRoutes from './routes/categories';
import linkRoutes from './routes/links';
import tagRoutes from './routes/tags';
import userRoutes from './routes/users';
import settingsRoutes from './routes/settings';
import { startScheduler } from './services/scheduler';

const app = express();

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

app.listen(config.port, () => {
  console.log(`LinkPortal backend running on http://localhost:${config.port}`);
  startScheduler();
});
