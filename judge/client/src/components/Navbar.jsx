// components/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css'; // Import the CSS file for styling

export default function Navbar({ user, logout }) {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-left">
          <Link to="/" className="navbar-logo">Online Judge</Link>
          <Link to="/all-questions" className="navbar-link">Questions</Link>
        </div>
        <div className="navbar-right">
          {user ? (
            <>
              {user.isAdmin && (
                <>
                  <Link to="/questions" className="navbar-link">Contribution</Link>
                  <Link to="/questions/add" className="navbar-link">Add Question</Link>
                </>
              )}
              <button
                className="navbar-button user-email"
                onClick={() => navigate('/dashboard')}
                title="Go to Dashboard"
              >
                {user.handle || user.email}
              </button>
              <button className="navbar-button" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/signup" className="navbar-link">Sign Up</Link>
              <Link to="/signin" className="navbar-link">Sign In</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
