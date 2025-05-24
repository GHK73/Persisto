import { useState } from 'react';
import { useNavigate } from 'react-router-dom';  // import navigate
import {
  sendOtpToEmail,
  verifyEmailOtp,
  resetPassword,
} from '../service/api';
import '../App.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [stage, setStage] = useState('email');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate(); // initialize navigate

  const sendOtp = async () => {
    try {
      await sendOtpToEmail(email);
      setStage('otp');
      setMessage('OTP sent to email.');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
      setMessage('');
    }
  };

  const verifyOtp = async () => {
    try {
      await verifyEmailOtp(email, otp);
      setStage('reset');
      setMessage('OTP verified. You can now reset your password.');
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
      setMessage('');
    }
  };

  const changePassword = async () => {
    try {
      await resetPassword(email, newPassword);
      setMessage('Password reset successful. Redirecting to signin...');
      setError('');
      setStage('done');
      setTimeout(() => {
        navigate('/signin');  // redirect to signin page
      }, 2000); // delay to show message before redirect
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
      setMessage('');
    }
  };

  return (
    <div className="form-container">
      <div className="form-box">
        <h2>Forgot Password</h2>
        {stage === 'email' && (
          <>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button onClick={sendOtp}>Send OTP</button>
          </>
        )}
        {stage === 'otp' && (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button onClick={verifyOtp}>Verify OTP</button>
          </>
        )}
        {stage === 'reset' && (
          <>
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button onClick={changePassword}>Reset Password</button>
          </>
        )}
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}

export default ForgotPassword;
