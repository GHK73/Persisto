import { useState } from 'react';
import {
  requestSignupOtp,
  verifySignupOtp,
  completeSignup,
} from '../service/api';
import { Link, useNavigate } from 'react-router-dom';
import './Signup.css'; // Import the CSS file for styling

function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    handle: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const sendOtp = async () => {
    try {
      await requestSignupOtp(formData.email);
      setOtpSent(true);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    }
  };

  const verifyOtp = async () => {
    try {
      await verifySignupOtp(formData.email, otp);
      setEmailVerified(true);
      setSuccessMessage('Email verified successfully!');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match!');
      return;
    }
    if (!emailVerified) {
      setError('Please verify your email first');
      return;
    }

    try {
      await completeSignup(formData);
      setSuccessMessage('Signup successful!');
      setTimeout(() => navigate('/signin'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="form-container">
      <form className="form-box" onSubmit={handleSubmit}>
        <h2>Create Account</h2>
        <input type="text" name="name" placeholder="Name" onChange={handleChange} required />
        <input type="text" name="handle" placeholder="Handle" onChange={handleChange} required />
        <input type="email" name="email" placeholder="Email" onChange={handleChange} required disabled={emailVerified} />
        {!otpSent && !emailVerified && <button type="button" className="btn-otp" onClick={sendOtp}>Send OTP</button>}
        {otpSent && !emailVerified && (
          <>
            <input type="text" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
            <button type="button" className="btn-otp" onClick={verifyOtp}>Verify OTP</button>
          </>
        )}
        <input type="tel" name="phone" placeholder="Phone" onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
        <input type="password" name="confirmPassword" placeholder="Confirm Password" onChange={handleChange} required />
        <button type="submit" className="btn-submit">Sign Up</button>
        {error && <p className="error">{error}</p>}
        {successMessage && <p className="success">{successMessage}</p>}
        <p className="form-footer">
          Already have an account? <Link to="/signin">Sign In</Link>
        </p>
      </form>
    </div>
  );
}

export default Signup;
