import axios from 'axios';

const API_URL = 'http://localhost:8000';

// Axios instance
const api = axios.create({
  baseURL: API_URL,
});

// Add token to headers except for auth routes
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (
      token &&
      !config.url.includes('/signup') &&
      !config.url.includes('/signin') &&
      !config.url.includes('/forgot-password')
    ) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`[API] Added token to request: ${config.method.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// === AUTH ROUTES ===

export const requestSignupOtp = (email) => api.post('/signup/request-otp', { email });

export const verifySignupOtp = (email, otp) => api.post('/signup/verify-otp', { email, otp });

export const completeSignup = (data) => api.post('/signup/complete', data); // data: { name, handle, email, phone, password }

export const signinUser = (data) => api.post('/signin', data); // data: { login, password }

export const checkAuth = () => api.post('/check-auth');

// === FORGOT PASSWORD ===

export const sendOtpToEmail = (email) => api.post('/forgot-password/request-otp', { email });

export const verifyEmailOtp = (email, otp) => api.post('/forgot-password/verify-otp', { email, otp });

export const resetPassword = (email, newPassword) =>
  api.post('/forgot-password/reset', { email, newPassword });

// === USER PROFILE ===

export const getUserStats = (userId) => api.get(`/users/${userId}/stats`);

export const updateProfilePicture = (userId, formData) =>
  api.post(`/users/${userId}/profile-pic`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// === QUESTIONS ===

// Get all questions
export const getAllQuestions = async () => {
  const response = await api.get('/questions');
  return response.data;  // Return only the array of questions
};

// Get question details
export const getQuestionById = (id) => api.get(`/questions/${id}`);

// Upload a new question
export const addQuestion = (formData) =>
  api.post('/questions', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

// Delete a question by ID
export const deleteQuestion = (id) => api.delete(`/questions/${id}`);


export const submitCodeApi = (data) => api.post('/code/submit', data);

export const runCodeApi = (data) => api.post('/code/run', data); 