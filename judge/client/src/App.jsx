import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Signup from './pages/signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Signin from './pages/signin.jsx';
import Profile from './pages/profile.jsx'; // new profile page
import './App.css'; // CSS import

function Home() {
  return (
    <div className="home-container">
      <div className="top-right-buttons">
        <Link to="/signup" className="btn-link small-btn">
          Sign Up
        </Link>
        <Link to="/signin" className="btn-link small-btn" style={{ marginLeft: '10px' }}>
          Sign In
        </Link>
      </div>

      <div className="welcome-text">
        <h2>Welcome!</h2>
        <p>Please sign up or sign in to continue.</p>
      </div>
    </div>
  );
}


function App() {
  return (
    <Router>
      <Routes>
  <Route path="/" element={<Home />} />
  <Route path="/signup" element={<Signup />} />
  <Route path="/signin" element={<Signin />} />
  <Route path="/profile" element={<Profile />} />
  <Route path="/forgot-password" element={<ForgotPassword />} />
</Routes>
    </Router>
  );
}

export default App;
