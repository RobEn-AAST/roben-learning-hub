// Constants for the application

export const APP_NAME = 'Roben Learning Hub';

export const ROUTES = {
  HOME: '/',
  AUTH: {
    LOGIN: '/auth/login',
    FORGOT_PASSWORD: '/auth/forgot-password',
    UPDATE_PASSWORD: '/auth/update-password',
  },
  PROTECTED: '/protected',
  ADMIN: '/admin',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REGISTER: '/api/auth/register',
  },
  USERS: '/api/users',
} as const;

export const STORAGE_KEYS = {
  USER: 'user',
  THEME: 'theme',
  TOKEN: 'token',
} as const;

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;
