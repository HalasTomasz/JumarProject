import axios from 'axios';
import { createMockAdapter } from './mockApi';

let unauthorizedHandler = null;

export function clearStoredAuthToken() {
  localStorage.removeItem('auth_token');
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || (
    process.env.NODE_ENV === 'production' ? '/api/' : 'http://localhost:8000/api/'
  ),
});

// Mock mode must be explicitly enabled so deployment defaults to the real API.
const useMockApi = String(process.env.REACT_APP_USE_MOCK_API ?? 'false').toLowerCase() === 'true';

if (useMockApi) {
  apiClient.defaults.adapter = createMockAdapter();
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearStoredAuthToken();
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
