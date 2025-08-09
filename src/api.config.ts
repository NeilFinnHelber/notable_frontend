const isDevelopment = process.env.NODE_ENV === 'development';

export const API_CONFIG = {
  BASE_URL: isDevelopment 
    ? '/api' // Will be proxied to your backend in development
    : 'https://api.wolf0fdev.me/notes/api/v1/', // Replace with your production API URL
  
  ENDPOINTS: {
    USER_CONFIG: '/user/config',
    NOTES: '/notes',
    THEME: '/user/theme'
  },
  
  getUrl: function(endpoint: string): string {
    return `${this.BASE_URL}${endpoint}`;
  }
};

export default API_CONFIG;
