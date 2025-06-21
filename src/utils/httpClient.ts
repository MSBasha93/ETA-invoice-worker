import axios from 'axios';
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

etaApiClient.interceptors.request.use(async (axiosConfig) => {
  const token = await getValidToken();
  axiosConfig.headers.Authorization = `Bearer ${token}`;
  return axiosConfig;
});

etaApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { status } = error.response || {};
    if (status === 429 || status === 503) {
      const retryAfter = error.response.headers['retry-after'] || 5;
      logger.warn(`Rate limited. Retrying after ${retryAfter} seconds...`);
      await new Promise(res => setTimeout(res, retryAfter * 1000));
      return etaApiClient.request(error.config);
    }
    return Promise.reject(error);
  }
);

export default etaApiClient;