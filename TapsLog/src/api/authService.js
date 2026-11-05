/**
 * src/api/authService.js — Authentication & Card Registration API Client
 */
import api from './axiosInstance';

/**
 * Register a new Student or Teacher with hardware NFC card lock
 */
export async function registerUser(registrationData) {
  const response = await api.post('/auth/register', registrationData);
  if (response.data?.token) {
    localStorage.setItem('tapslog_token', response.data.token);
    localStorage.setItem('tapslog_user', JSON.stringify(response.data.user));
  }
  return response.data;
}

/**
 * Log in an existing user
 */
export async function loginUser({ email, password }) {
  const response = await api.post('/auth/login', { email, password });
  if (response.data?.token) {
    localStorage.setItem('tapslog_token', response.data.token);
    localStorage.setItem('tapslog_user', JSON.stringify(response.data.user));
  }
  return response.data;
}

/**
 * Toggle RSO badge visibility on user profile
 */
export async function updateRsoBadgePreference(showPublicly) {
  const response = await api.patch('/auth/preferences/rso-badge', {
    show_rso_badge_publicly: showPublicly,
  });
  return response.data;
}

export default {
  registerUser,
  loginUser,
  updateRsoBadgePreference
};
