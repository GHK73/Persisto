import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar({ user, setUser }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/signin');
  };

  return (
    <nav style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>
      <Link to="/" style={{ marginRight: '20px' }}>Home</Link>

      {!user && (
        <>
          <Link to="/signin" style={{ marginRight: '10px' }}>Sign In</Link>
          <Link to="/signup">Sign Up</Link>
        </>
      )}

      {user && (
        <>
          <span style={{ marginRight: '20px' }}>Hello, {user.handle || user.email}</span>
          <button onClick={handleLogout}>Logout</button>
        </>
      )}
    </nav>
  );
}
