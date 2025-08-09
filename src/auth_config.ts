// Using custom domain
import { CacheLocation } from '@auth0/auth0-spa-js';

export interface AuthConfig {
  domain: string;
  clientId: string;
  authorizationParams: {
    redirect_uri: string;
    audience: string;
    scope: string;
  };
  useRefreshTokens: boolean;
  cacheLocation: CacheLocation;
  useRefreshTokensFallback: boolean;
  enableDebugLogs: boolean;
  httpTimeout: number;
}

export const authConfig: AuthConfig = {
  domain: 'dev-8q5ufmf0yqnkn06v.eu.auth0.com',
  clientId: 'KAt5Dza1A37B1DJOyDOMbWP6aST53zMR',
  authorizationParams: {
    redirect_uri: 'https://app.wolf0fdev.me',
    audience: 'https://notable-api',
    scope: 'openid profile email',
  },
  useRefreshTokens: true,
  cacheLocation: 'localstorage' as CacheLocation,
  useRefreshTokensFallback: false,
  enableDebugLogs: process.env.NODE_ENV === 'development',
  httpTimeout: 10000,
};

  export default authConfig;
  
