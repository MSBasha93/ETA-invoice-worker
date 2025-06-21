// src/utils/httpClient.ts
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

// This interceptor automatically adds the valid auth token to every request.
etaApiClient.interceptors.request.use(async (axiosConfig) => {
  const token = await getValidToken();
  axiosConfig.headers.Authorization = `Bearer ${token}`;
  return axiosConfig;
});

// The old reactive rate-limit retry interceptor has been removed,
// as this is now handled proactively by dedicated queues in etaApiService.
// This simplifies our error handling.
etaApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // We still want to log errors that occur.
    logger.error({
        err: {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url,
        }
    }, 'An API request failed');

    return Promise.reject(error);
  }
);


export default etaApiClient;