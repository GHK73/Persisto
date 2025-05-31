// components/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar({ user, logout }) {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-left">
          <Link to="/" className="navbar-logo">Online Judge</Link>
          <Link to="/all-questions" className="plain-link" style={{ marginLeft: '1rem' }}>Questions</Link>
        </div>
        <div className="navbar-right">
          {user ? (
            <>
              {user.isAdmin && (
                <>
                  <Link to="/questions" className="plain-link">Contribution</Link>
                  <Link to="/questions/add" className="plain-link">Add Question</Link>
                </>
              )}
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
