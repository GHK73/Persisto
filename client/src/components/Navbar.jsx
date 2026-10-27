import { Link, NavLink } from 'react-router-dom';
import './Navbar.css';

export default function Navbar({ user, logout }) {
  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-left">
          <Link to="/" className="navbar-logo" aria-label="Persisto home">
            <span className="brand-mark" aria-hidden="true">&lt;/&gt;</span>
            <span>Persisto</span>
          </Link>
          <NavLink
            to="/all-questions"
            className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}
          >
            Problems
          </NavLink>
        </div>
        <div className="navbar-right">
          {user ? (
            <>
              {user.isAdmin && (
                <>
                  <NavLink to="/questions" className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>
                    Contributions
                  </NavLink>
                  <NavLink to="/questions/add" className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>
                    Add problem
                  </NavLink>
                </>
              )}
              <Link
                className="navbar-user"
                to="/dashboard"
                title="Go to dashboard"
              >
                <span className="user-avatar" aria-hidden="true">
                  {(user.handle || user.email || 'U').charAt(0).toUpperCase()}
                </span>
                <span className="user-name">{user.handle || user.email}</span>
              </Link>
              <button className="navbar-button" onClick={logout}>Sign out</button>
            </>
          ) : (
            <>
              <Link to="/signin" className="navbar-link">Sign in</Link>
              <Link to="/signup" className="navbar-signup">Get started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
