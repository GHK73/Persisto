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
import UpdateQuestion from './pages/UpdateQuestion.jsx';

import Navbar from './components/Navbar.jsx';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser && storedUser !== 'undefined') {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          console.error("Failed to parse stored user:", storedUser);
          localStorage.removeItem('user'); // remove corrupted user data
        }
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

  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="app-loading" role="status">Preparing your workspace...</div>
    );
  }

  return (
    <div className="app-wrapper">
      <Navbar user={user} logout={logout} />

      <Routes>
        <Route
          path="/"
          element={
            <main className="home-page">
              <div className="home-content">
                <section className="home-copy">
                  <p className="eyebrow">The coding practice platform</p>
                  <h1 className="home-title">
                    {user ? (
                      <>Good to see you, <span>{user.handle || user.email}.</span></>
                    ) : (
                      <>Think clearly. <span>Code confidently.</span></>
                    )}
                  </h1>
                  <p className="home-description">
                    Build problem-solving skills one challenge at a time. Practice with a focused editor,
                    run your code, and track your progress as you grow.
                  </p>
                  <div className="home-actions">
                    <Link to="/all-questions" className="home-action home-action-primary">
                      Explore problems
                    </Link>
                    {user ? (
                      <Link to="/dashboard" className="home-action home-action-secondary">
                        View your dashboard
                      </Link>
                    ) : (
                      <Link to="/signup" className="home-action home-action-secondary">
                        Create a free account
                      </Link>
                    )}
                  </div>
                  <div className="home-proof" aria-label="Platform features">
                    <span>Curated challenges</span>
                    <span>Instant code runs</span>
                    <span>Progress that matters</span>
                  </div>
                </section>

                <aside className="code-preview" aria-label="Example coding workspace">
                  <div className="preview-topbar">
                    <div className="preview-dots" aria-hidden="true"><i /><i /><i /></div>
                    <span>two-sum.cpp</span>
                    <span className="preview-language">C++</span>
                  </div>
                  <pre className="preview-code" aria-hidden="true">
                    <span className="code-line-number">01</span><span className="code-keyword">int</span> twoSum(vector&lt;<span className="code-keyword">int</span>&gt;&amp; nums, <span className="code-keyword">int</span> target) {'{'}{'\n'}
                    <span className="code-line-number">02</span>  unordered_map&lt;<span className="code-keyword">int</span>, <span className="code-keyword">int</span>&gt; seen;{'\n'}
                    <span className="code-line-number">03</span>  <span className="code-keyword">for</span> (<span className="code-keyword">int</span> i = 0; i &lt; nums.size(); i++) {'{'}{'\n'}
                    <span className="code-line-number">04</span>    <span className="code-keyword">int</span> match = target - nums[i];{'\n'}
                    <span className="code-line-number">05</span>    <span className="code-keyword">if</span> (seen.count(match)) {'{'}{'\n'}
                    <span className="code-line-number">06</span>      <span className="code-keyword">return</span> seen[match];{'\n'}
                    <span className="code-line-number">07</span>    {'}'}{'\n'}
                    <span className="code-line-number">08</span>    seen[nums[i]] = i;{'\n'}
                    <span className="code-line-number">09</span>  {'}'}{'\n'}
                    <span className="code-line-number">10</span>  <span className="code-keyword">return</span> -1;{'\n'}
                    <span className="code-line-number">11</span>{'}'}
                  </pre>
                  <div className="preview-status"><span className="status-dot" /> Ready to run</div>
                </aside>
              </div>
            </main>
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
                <div className="access-denied">
                  <h2>Admin access required</h2>
                  <p>You do not have permission to view this page.</p>
                </div>
              )
            ) : (
              <Signin onSigninSuccess={setUser} />
            )
          }
        />
        <Route path="/questions/:id" element={<QuestionDetail />} />
        <Route
          path="/update-question/:id"
          element={
            user ? (
              user.isAdmin ? (
                <UpdateQuestion />
              ) : (
                <div className="access-denied">
                  <h2>Admin access required</h2>
                  <p>You do not have permission to view this page.</p>
                </div>
              )
            ) : (
              <Signin onSigninSuccess={setUser} />
            )
          }
        />
        <Route path="/all-questions" element={<AllQuestions user={user} />} />
      </Routes>
    </div>
  );
}

export default App;
