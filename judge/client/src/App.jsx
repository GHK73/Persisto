// src/App.jsx
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { checkAuth } from './service/api.js';

import Signup from './pages/signup.jsx';
import Signin from './pages/signin.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Dashboard from './pages/dashboard.jsx';
import QuestionsList from './pages/QuestionsList.jsx';
import QuestionDetail from './pages/QuestionDetail.jsx';
import AddQuestion from './pages/AddQuestion.jsx';
import AllQuestions from './pages/AllQuestions.jsx';

import Navbar from './components/Navbar.jsx';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLinks, setShowLinks] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
      }

      if (token) {
        try {
          const userData = await checkAuth();
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (err) {
          console.error("Auth check failed", err.message);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }

      setAuthLoading(false);
    };

    checkUser();

    if (!localStorage.getItem('welcomeLinksShown')) {
      setShowLinks(true);
      localStorage.setItem('welcomeLinksShown', 'true');
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white text-xl font-semibold">
        Checking Authentication...
      </div>
    );
  }

  return (
    <div className="app-wrapper min-h-screen bg-slate-900 text-slate-100">
      <Navbar user={user} logout={logout} />

      <Routes>
        <Route
          path="/"
          element={
            <div className="flex items-center justify-center min-h-[calc(100vh-70px)] px-4">
              <div className="welcome-card bg-slate-800 p-10 rounded-xl shadow-lg text-center max-w-xl w-full border border-slate-600">
                <h1 className="text-3xl font-bold mb-4">
                  {user ? `Welcome, ${user.handle || user.email}!` : 'Welcome to Online Judge!'}
                </h1>
                <p className="text-slate-300">
                  {user ? (
                    'Click your handle in the top right to visit your dashboard.'
                  ) : showLinks ? (
                    <>
                      Please{' '}
                      <Link to="/signin" className="text-sky-400 underline">
                        Sign In
                      </Link>{' '}
                      or{' '}
                      <Link to="/signup" className="text-sky-400 underline">
                        Sign Up
                      </Link>{' '}
                      to continue.
                    </>
                  ) : null}
                </p>
              </div>
            </div>
          }
        />

        <Route path="/signup" element={<Signup />} />
        <Route path="/signin" element={<Signin onSigninSuccess={setUser} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} /> : <Signin onSigninSuccess={setUser} />}
        />
        <Route path="/questions" element={<QuestionsList user={user} />} />
        <Route
          path="/questions/add"
          element={
            user ? (
              user.isAdmin ? (
                <AddQuestion />
              ) : (
                <div className="text-center py-20 text-red-400 font-semibold">
                  <h2 className="text-2xl mb-2">Access Denied 🚫</h2>
                  <p>You do not have permission to view this page.</p>
                </div>
              )
            ) : (
              <Signin onSigninSuccess={setUser} />
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
