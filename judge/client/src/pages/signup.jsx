import { useState, useEffect } from 'react';
import { signupUser } from '../service/api';
import { Link, useNavigate } from 'react-router-dom';
import '../App.css';

function Signup() {
  const navigate = useNavigate(); // <-- Add this line

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    handle: '',
  });

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitTrigger, setSubmitTrigger] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitTrigger(true);
  };

  useEffect(() => {
    const sendData = async () => {
      if (!submitTrigger) return;

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match!');
        setSuccessMessage('');
        setSubmitTrigger(false);
        return;
      }

      try {
        const res = await signupUser(formData);
        setSuccessMessage(res.message); // show "User registered successfully!"
        setError('');
        setFormData({
          name: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: '',
          handle: '',
        });

        // Redirect to signin page after 1.5 seconds
        setTimeout(() => {
          navigate('/signin');
        }, 1500);

      } catch (err) {
        setError(err.response?.data?.message || 'Signup failed');
        setSuccessMessage('');
      } finally {
        setSubmitTrigger(false);
      }
    };

    sendData();
  }, [submitTrigger, formData, navigate]);

  return (
    <div className="form-container">
      <form className="form-box" onSubmit={handleSubmit}>
        <h2>Create Account</h2>

        <input
          type="text"
          name="name"
          placeholder="Name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="handle"
          placeholder="Handle"
          value={formData.handle}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="tel"
          name="phone"
          placeholder="Phone"
          value={formData.phone}
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
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
        />

        <button type="submit">Sign Up</button>

        {error && <p className="error">{error}</p>}
        {successMessage && <p className="success">{successMessage}</p>}

        <p style={{ marginTop: '15px', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to="/signin" style={{ color: '#3498db', textDecoration: 'none' }}>
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Signup;
