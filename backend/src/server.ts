import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler } from './middleware/error';
import authRoutes from './routes/auth';
import categoryRoutes from './routes/categories';
import linkRoutes from './routes/links';
import userRoutes from './routes/users';

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
app.use('/api/users', userRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`LinkPortal backend running on http://localhost:${config.port}`);
});
