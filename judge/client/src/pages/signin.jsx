import { useState, useEffect } from 'react';
import { signinUser } from '../service/api';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import '../App.css';

function Signin({ onSigninSuccess }) {
  const [formData, setFormData] = useState({ login: '', password: '' });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await signinUser(formData);
      localStorage.setItem('token', res.data.token);

      // Call onSigninSuccess once with the user object
      onSigninSuccess({ handle: res.data.handle, email: res.data.email });

      setSuccessMessage('Login successful!');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Signin failed');
    }
  };

  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError('');
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  return (
    <div className="form-container">
      <form className="form-box" onSubmit={handleSubmit}>
        <h2>Sign In</h2>
        <input
          type="text"
          name="login"
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
        <p style={{ marginTop: '20px', textAlign: 'center' }}>
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: '10px' }}>
          <Link to="/forgot-password">Forgot Password?</Link>
        </p>
      </form>
    </div>
  );
}

export default Signin;
