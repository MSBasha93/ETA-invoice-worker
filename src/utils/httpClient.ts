import axios from 'axios';
import axiosRetry from 'axios-retry';
import { getValidToken } from '../services/authService';
import { config } from '../config';
import { logger } from './logger';

const etaApiClient = axios.create({
  baseURL: config.eta.apiBaseUrl,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// This interceptor automatically adds the valid auth token to every request.
etaApiClient.interceptors.request.use(async (axiosConfig) => {
  const token = await getValidToken();
  axiosConfig.headers.Authorization = `Bearer ${token}`;
  return axiosConfig;
});

// Use axios-retry to automatically handle transient errors, especially rate limiting.
axiosRetry(etaApiClient, {
  retries: 3, // Number of retries
  retryDelay: (retryCount, error) => {
    // For 429 errors, respect the 'Retry-After' header if available.
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        const delay = parseInt(retryAfter, 10) * 1000;
        logger.warn(`Rate limited. Retrying after ${delay}ms...`);
        return delay;
      }
    }
    // For other errors, use exponential backoff.
    logger.warn(`Request failed. Retrying in ${retryCount * 1000}ms...`);
    return axiosRetry.exponentialDelay(retryCount);
  },
  retryCondition: (error) => {
    // Only retry on network errors or 5xx server errors and 429 rate limit errors.
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      error.response?.status === 429
    );
  },
});

export default etaApiClient;