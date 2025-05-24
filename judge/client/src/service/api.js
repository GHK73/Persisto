import axios from 'axios';

const API_URL = 'http://localhost:8000';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
});

// Interceptor to add Authorization header with token for all requests except signup/signin
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && !config.url.includes('/signup') && !config.url.includes('/signin')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Signup APIs
export const requestSignupOtp = (email) => {
  return api.post('/signup/request-otp', { email });
};

export const verifySignupOtp = (email, otp) => {
  return api.post('/signup/verify-otp', { email, otp });
};

export const completeSignup = (data) => {
  // data: { name, handle, email, phone, password }
  return api.post('/signup/complete', data);
};

// Signin API
export const signinUser = (data) => {
  // data: { login, password }
  return api.post('/signin', data);
};

// Auth check
export const checkAuth = () => {
  return api.post('/check-auth');
};

// Forgot Password APIs
export const sendOtpToEmail = (email) => {
  return api.post('/forgot-password/request-otp', { email });
};

export const verifyEmailOtp = (email, otp) => {
  return api.post('/forgot-password/verify-otp', { email, otp });
};

export const resetPassword = (email, newPassword) => {
  return api.post('/forgot-password/reset', { email, newPassword });
};

// Fetch user stats (number of questions done)
export const getUserStats = (userId) => {
  return api.get(`/users/${userId}/stats`);
};

// Update profile picture
export const updateProfilePicture = (userId, formData) => {
  return api.post(`/users/${userId}/profile-pic`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
