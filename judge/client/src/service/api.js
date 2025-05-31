import axios from 'axios';

const BASE_URL = 'http://localhost:8000'; // Adjust this if needed

const api = axios.create({ baseURL: BASE_URL });

// Add token to all requests except public ones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const publicRoutes = [
    '/signup/request-otp',
    '/signup/verify-otp',
    '/signup/complete',
    '/signin',
    '/forgot-password/request-otp',
    '/forgot-password/verify-otp',
    '/forgot-password/reset',
  ];
  const isPublic = publicRoutes.some(route => config.url.includes(route));
  if (token && !isPublic) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log(`[API] Authenticated ${config.method.toUpperCase()} ${config.url}`);
  }
  return config;
}, (error) => Promise.reject(error));

// ------------------ Auth ------------------

export const requestSignupOtp = (email) => api.post('/signup/request-otp', { email });

export const verifySignupOtp = (email, otp) => api.post('/signup/verify-otp', { email, otp });

export const completeSignup = (data) => api.post('/signup/complete', data);

export const signinUser = (data) => api.post('/signin', data);

export const checkAuth = () => api.post('/check-auth');

// ------------------ Password Reset ------------------

export const sendOtpToEmail = (email) => api.post('/forgot-password/request-otp', { email });

export const verifyEmailOtp = (email, otp) => api.post('/forgot-password/verify-otp', { email, otp });

export const resetPassword = (email, newPassword) =>
  api.post('/forgot-password/reset', { email, newPassword });

// ------------------ User Profile ------------------

export const updateProfilePicture = (userId, formData) =>
  api.post(`/users/${userId}/profile-pic`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }).then((res) => res.data);

export const getUserStats = (userId) =>
  api.get(`/users/${userId}/stats`).then((res) => res.data);

// ------------------ Questions ------------------

export const getAllQuestions = () => api.get('/questions').then((res) => res.data);

export const getQuestionById = (id) => api.get(`/questions/${id}`).then((res) => res.data);

export const addQuestion = (formData) =>
  api.post('/questions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data);

export const deleteQuestion = (id) => api.delete(`/questions/${id}`).then((res) => res.data);

export const getUserQuestions = () => api.get('/questions/my-questions').then((res) => res.data);

// ------------------ Code Execution ------------------

export const runCodeApi = (data) => api.post('/code/run', data).then((res) => res.data);

export const submitCodeApi = (data) => api.post('/code/submit', data).then((res) => res.data);
