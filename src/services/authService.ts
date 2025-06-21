import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

interface IToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: IToken | null = null;

async function fetchNewToken(): Promise<IToken> {
  logger.info('Requesting new ETA access token...');
  const credentials = Buffer.from(
    `${config.eta.clientId}:${config.eta.clientSecret}`
  ).toString('base64');

  const response = await axios.post(
    `${config.eta.identityServerUrl}/connect/token`,
    new URLSearchParams({ grant_type: 'client_credentials' }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
    }
  );

  const { access_token, expires_in } = response.data;
  const expiresAt = Date.now() + (expires_in - 300) * 1000; // Refresh 5 mins early
  
  logger.info('Successfully fetched new token.');
  return { accessToken: access_token, expiresAt };
}

export async function getValidToken(): Promise<string> {
  if (!cachedToken || cachedToken.expiresAt <= Date.now()) {
    cachedToken = await fetchNewToken();
  }
  return cachedToken.accessToken;
}