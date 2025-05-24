import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Signup from './pages/signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Signin from './pages/signin.jsx';
import Dashboard from './pages/dashboard.jsx'; // user dashboard page
import { checkAuth } from './service/api.js';

function Navbar({ user, logout }) {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-logo">Online Judge</Link>
        <div className="navbar-right">
          {user ? (
            <>
              {/* Clickable user handle navigates to dashboard */}
              <button
                className="plain-link user-email"
                onClick={() => navigate('/dashboard')}
                title="Go to Dashboard"
                style={{
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 'inherit',
                  color: 'inherit'
                }}
              >
                {user.handle || user.email}
              </button>
              <button className="plain-link" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/signup" className="plain-link">Sign Up</Link>
              <Link to="/signin" className="plain-link">Sign In</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [showLinks, setShowLinks] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await checkAuth(token);
          setUser(res.data.user);
        } catch {
          setUser(null);
          localStorage.removeItem('token');
        }
      }
    };

    // Show welcome links only once
    const linksShown = localStorage.getItem('welcomeLinksShown');
    if (!linksShown) {
      setShowLinks(true);
      localStorage.setItem('welcomeLinksShown', 'true');
    }

    checkUser();
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  return (
    <div className="app-wrapper">
      <Navbar user={user} logout={logout} />
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h1>Welcome, {user.handle || user.email}!</h1>
                <p>This is the front page.</p>
                <p>Click your handle in the top right to visit your dashboard.</p>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h1>Welcome to Online Judge!</h1>
                {showLinks && (
                  <p>
                    Please <Link to="/signin">Sign In</Link> or{' '}
                    <Link to="/signup">Sign Up</Link> to continue.
                  </p>
                )}
              </div>
            )
          }
        />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<Signin onSigninSuccess={setUser} />} />
        {/* Removed /profile route */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} /> : <Signin onSigninSuccess={setUser} />}
        />
      </Routes>
    </div>
  );
}

export default App;
