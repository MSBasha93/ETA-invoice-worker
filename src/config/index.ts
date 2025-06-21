import 'dotenv/config';

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
}

export const config = {
  isProduction: process.env.NODE_ENV === 'production',
  eta: {
    clientId: getEnv('ETA_CLIENT_ID'),
    clientSecret: getEnv('ETA_CLIENT_SECRET'),
    identityServerUrl: getEnv('ETA_IDENTITY_SERVER_URL'),
    apiBaseUrl: getEnv('ETA_API_BASE_URL'),
  },
  database: {
    url: getEnv('DATABASE_URL'),
  },
  worker: {
    cronSchedule: getEnv('WORKER_CRON_SCHEDULE'),
    pageSize: 100,
    rateLimitRequests: 2,
    rateLimitInterval: 1000,
    maxRetries: 3,
  },
};