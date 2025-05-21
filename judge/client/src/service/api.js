import axios from 'axios';

const API_URL = 'http://localhost:8000';

// Signup APIs
export const requestSignupOtp = async (email) => {
  return await axios.post(`${API_URL}/signup/request-otp`, { email });
};

export const verifySignupOtp = async (email, otp) => {
  return await axios.post(`${API_URL}/signup/verify-otp`, { email, otp });
};

export const completeSignup = async (data) => {
  return await axios.post(`${API_URL}/signup/complete`, data);
};

// Signin API
export const signinUser = async (data) => {
  return await axios.post(`${API_URL}/signin`, data);
};

// Auth check
export const checkAuth = async (token) => {
  return await axios.post(`${API_URL}/check-auth`, null, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

// Forgot Password APIs
export const sendOtpToEmail = async (email) => {
  return await axios.post(`${API_URL}/reset/request-otp`, { email });
};

export const verifyEmailOtp = async (email, otp) => {
  return await axios.post(`${API_URL}/reset/verify-otp`, { email, otp });
};

export const resetPassword = async (email, newPassword) => {
  return await axios.post(`${API_URL}/reset-password`, { email, newPassword });
};
