// api.js
import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const signinUser = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/signin`, data);
    return response.data;
  } catch (error) {
    console.error('Error during signin:', error.message);
    throw error;
  }
};

export const signupUser = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/signup`, data);
    return response.data;
  } catch (error) {
    console.error('Error during signup:', error.message);
    throw error;
  }
};
