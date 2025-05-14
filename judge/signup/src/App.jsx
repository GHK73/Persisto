import { useState, useEffect } from 'react';
import { signupUser } from './service/api'; // adjust path as needed
import './App.css';

function App() {
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
        await signupUser(formData);
        setSuccessMessage('Signup successful!');
        setError('');
        setFormData({
          name: '',
          email: '',
          phone: '',
          password: '',
          confirmPassword: '',
          handle: '',
        });
      } catch (err) {
        setError(err.message);
        setSuccessMessage('');
      } finally {
        setSubmitTrigger(false);
      }
    };

    sendData();
  }, [submitTrigger]);

  return (
    <div className="signup-container">
      <form className="signup-form" onSubmit={handleSubmit}>
        <h2>Create Account</h2>

        <div className="form-group">
          <label>Name:</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Handle:</label>
          <input type="text" name="handle" value={formData.handle} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Email:</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Phone:</label>
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Password:</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Confirm:</label>
          <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
        </div>

        <button type="submit" className="submit-btn">Sign Up</button>

        {error && <p className="error-message">{error}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}
      </form>
    </div>
  );
}

export default App;
