import * as dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv,
  // Bind address. In production bind to loopback only (reachable solely via the
  // reverse proxy); in development leave empty to listen on all interfaces so the
  // Vite dev proxy can connect. Override with the HOST env variable if needed.
  host: process.env.HOST || (nodeEnv === 'production' ? '127.0.0.1' : ''),
  // Number of reverse-proxy hops in front of the app, used by express-rate-limit
  // to resolve the real client IP. 1 = a single nginx; 2 = Tailscale Serve + nginx
  // (the skzdev02 setup). Override with the TRUST_PROXY env variable.
  trustProxy: parseInt(process.env.TRUST_PROXY || '1', 10),
  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

export const isProd = config.nodeEnv === 'production';
