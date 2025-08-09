import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_CONFIG } from '../api.config';

// Create an Axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for sending cookies with cross-origin requests
});

// Request interceptor for adding auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token'); // Update this based on your auth implementation
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API Error Request:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const fetchUserConfig = async () => {
  try {
    const response = await api.get(API_CONFIG.ENDPOINTS.USER_CONFIG);
    return response.data;
  } catch (error) {
    console.error('Error fetching user config:', error);
    throw error;
  }
};

export const fetchNotes = async () => {
  try {
    const response = await api.get(API_CONFIG.ENDPOINTS.NOTES);
    return response.data;
  } catch (error) {
    console.error('Error fetching notes:', error);
    throw error;
  }
};

export const updateUserTheme = async (theme: string) => {
  try {
    const response = await api.post(API_CONFIG.ENDPOINTS.THEME, { theme });
    return response.data;
  } catch (error) {
    console.error('Error updating theme:', error);
    throw error;
  }
};

export default api;
