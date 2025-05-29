import axios from 'axios';

const API_URL = 'http://localhost:8000';

// Create Axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
});

// Add token to headers for requests except auth routes
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

// Request OTP for signup
export const requestSignupOtp = (email) => api.post('/signup/request-otp', { email });

// Verify OTP for signup
export const verifySignupOtp = (email, otp) => api.post('/signup/verify-otp', { email, otp });

// Complete signup with user details
export const completeSignup = (data) => api.post('/signup/complete', data); 
// data: { name, handle, email, phone, password }

// Signin user with login and password
export const signinUser = (data) => api.post('/signin', data); 
// data: { login, password }

// Check if token is valid / user is authenticated
export const checkAuth = () => api.post('/check-auth');

// === FORGOT PASSWORD ===

// Request OTP to email for password reset
export const sendOtpToEmail = (email) => api.post('/forgot-password/request-otp', { email });

// Verify OTP for forgot password
export const verifyEmailOtp = (email, otp) => api.post('/forgot-password/verify-otp', { email, otp });

// Reset password after OTP verification
export const resetPassword = (email, newPassword) =>
  api.post('/forgot-password/reset', { email, newPassword });

// === USER PROFILE ===

// Get user stats by userId
export const getUserStats = (userId) => api.get(`/users/${userId}/stats`);

// Update user profile picture
export const updateProfilePicture = (userId, formData) =>
  api.post(`/users/${userId}/profile-pic`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// === QUESTIONS ===

// Get all questions
export const getAllQuestions = async () => {
  const response = await api.get('/questions');
  return response.data;  // Return only array of questions
};

// Get question details by ID
export const getQuestionById = (id) => api.get(`/questions/${id}`);

// Upload a new question with formData (includes files)
export const addQuestion = (formData) =>
  api.post('/questions', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

// Delete a question by ID
export const deleteQuestion = (id) => api.delete(`/questions/${id}`);

// Get questions uploaded by the authenticated user
export const getUserQuestions = () =>
  api.get('/questions/my-questions').then((res) => res.data);

// === CODE EXECUTION ===

// Submit code for evaluation
export const submitCodeApi = (data) => api.post('/code/submit', data);

// Run code without submission (for quick check)
export const runCodeApi = (data) => api.post('/code/run', data);

