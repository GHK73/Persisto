import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Signup from './pages/signup.jsx';
import Signin from './pages/signin.jsx';
import './App.css'; // Make sure CSS is imported

function Home() {
  return (
    <div className="form-container" style={{ flexDirection: 'column' }}>
      <div className="form-box" style={{ maxWidth: '320px', textAlign: 'center' }}>
        <h2>Welcome!</h2>
        <p>
          <Link to="/signup" className="btn-link">
            Sign Up
          </Link>
        </p>
        <p>
          <Link to="/signin" className="btn-link">
            Sign In
          </Link>
        </p>
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
      </Routes>
    </Router>
  );
}

export default App;
  