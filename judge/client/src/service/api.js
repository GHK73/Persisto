// src/service/api.js

import axios from 'axios';

// Automatically use correct base URL from environment
const BASE_URL = process.env.REACT_APP_API_BASE_URL;

// ✅ Debug log to confirm the value during runtime
console.log("🌐 Axios base URL:", BASE_URL);

const api = axios.create({ baseURL: BASE_URL });

// Attach token to headers (except for public routes)
api.interceptors.request.use(
  (config) => {
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

    const isPublic = publicRoutes.some((route) => config.url.includes(route));
    if (token && !isPublic) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ========== AUTH & USER ==========

export const requestSignupOtp = (email) =>
  api.post('/signup/request-otp', { email });

export const verifySignupOtp = (email, otp) =>
  api.post('/signup/verify-otp', { email, otp });

export const completeSignup = (data) => api.post('/signup/complete', data);

export const signinUser = (data) => api.post('/signin', data);

export const checkAuth = () =>
  api.get('/check-auth').then((res) => res.data.user);

export const sendOtpToEmail = (email) =>
  api.post('/forgot-password/request-otp', { email });

export const verifyEmailOtp = (email, otp) =>
  api.post('/forgot-password/verify-otp', { email, otp });

export const resetPassword = (email, newPassword) =>
  api.post('/forgot-password/reset', { email, newPassword });

export const updateProfilePicture = (handle, formData) =>
  api
    .post(`/users/${handle}/profile-pic`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);

export const getUserStats = (handle) =>
  api.get(`/users/${handle}/stats`).then((res) => res.data);

// ========== QUESTIONS ==========

export const getAllQuestions = () =>
  api.get('/questions').then((res) => res.data);

export const getQuestionById = (id) =>
  api.get(`/questions/${id}`).then((res) => res.data);

export const addQuestion = (formData) =>
  api
    .post('/questions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);

export const updateQuestion = (id, formData) =>
  api.put(`/questions/${id}`, formData).then((res) => res.data);

export const deleteQuestion = (id) =>
  api.delete(`/questions/${id}`).then((res) => res.data);

export const getUserQuestions = () =>
  api.get('/questions/my-questions').then((res) => res.data);

// ========== CODE EXECUTION ==========

export const runCodeApi = (data) =>
  api.post('/code/run', data).then((res) => res.data);

export const submitCodeApi = (data) =>
  api.post('/code/submit', data).then((res) => res.data);
