import { useState, useEffect } from 'react';
import { signinUser } from '../service/api';
import { useNavigate, Link } from 'react-router-dom';
import '../App.css';

function Signin() {
  const [formData, setFormData] = useState({
    login: '',  // changed from email to login
    password: '',
  });

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await signinUser(formData);
      setSuccessMessage('Login successful!');
      setError('');
      localStorage.setItem('token', res.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Signin failed');
      setSuccessMessage('');
    }
  };

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError('');
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  return (
    <div className="form-container">
      <form className="form-box" onSubmit={handleSubmit}>
        <h2>Sign In</h2>

        <input
          type="text"       // changed from email to text to allow both email or handle
          name="login"      // changed name from email to login to match backend
          placeholder="Email or Handle"
          value={formData.login}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <button type="submit">Sign In</button>

        {error && <p className="error">{error}</p>}
        {successMessage && <p className="success">{successMessage}</p>}

        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#555' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#6c63ff', fontWeight: '600', textDecoration: 'none' }}>
            Sign Up
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Signin;
