import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Signup from './pages/signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Signin from './pages/signin.jsx';
import Dashboard from './pages/dashboard.jsx';
import QuestionsList from './pages/QuestionsList.jsx';
import QuestionDetail from './pages/QuestionDetail.jsx';
import AddQuestion from './pages/AddQuestion.jsx';
import AllQuestions from './pages/AllQuestions.jsx';
import Navbar from './components/Navbar.jsx';
import { checkAuth } from './service/api.js';
import './App.css';

function App() {
  const [user, setUser ] = useState(null);
  const [showLinks, setShowLinks] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser  = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await checkAuth(token);
          setUser (res.data.user);
        } catch {
          setUser (null);
          localStorage.removeItem('token');
        }
      }
    };

    const linksShown = localStorage.getItem('welcomeLinksShown');
    if (!linksShown) {
      setShowLinks(true);
      localStorage.setItem('welcomeLinksShown', 'true');
    }

    checkUser ();
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    setUser (null);
    navigate('/');
  };

  useEffect(() => {
    console.log('Current user:', user);
  }, [user]);

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
                    Please <Link to="/signin">Sign In</Link> or <Link to="/signup">Sign Up</Link> to continue.
                  </p>
                )}
              </div>
            )
          }
        />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<Signin onSigninSuccess={setUser } />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} /> : <Signin onSigninSuccess={setUser } />}
        />
        <Route path="/questions" element={<QuestionsList user={user} />} />
        <Route
          path="/questions/add"
          element={
            user ? (
              user.isAdmin ? (
                <AddQuestion />
              ) : (
                <div className="access-denied">
                  <h2>Access Denied</h2>
                  <p>You do not have permission to view this page.</p>
                </div>
              )
            ) : (
              <Signin onSigninSuccess={setUser } />
            )
          }
        />
        <Route path="/questions/:id" element={<QuestionDetail />} />
        <Route path="/all-questions" element={<AllQuestions user={user} />} />
      </Routes>
    </div>
  );
}

export default App;
