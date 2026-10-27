import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfilePicture, getUserStats } from '../service/api.js';
import { FaUpload, FaUserCircle } from 'react-icons/fa';
import './dashboard.css';

function Dashboard({ user }) {
  const [profilePic, setProfilePic] = useState('');
  const [uploading, setUploading] = useState(false);
  const [questionsDone, setQuestionsDone] = useState(0);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }

    if (user?.handle) {
      fetchStats(user.handle);
    }
  }, [user?.handle]);

  const fetchStats = async (handle) => {
    try {
      const res = await getUserStats(handle);
      setQuestionsDone(res.questionsDone || 0);
      setProfilePic(res.profilePic || '');
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to fetch user statistics');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('profilePic', file);

      const res = await updateProfilePicture(user.handle, formData);
      setProfilePic(res.profilePic);
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      setError('Failed to update profile picture');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-box">Loading user info...</div>
      </div>
    );
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-box">
        <div className="dashboard-heading">
          <div>
            <p className="dashboard-eyebrow">Your account</p>
            <h1>Dashboard</h1>
            <p className="dashboard-intro">Manage your profile and keep an eye on your practice.</p>
          </div>
        </div>

        <div className="user-info">
          <div className="profile-pic-wrapper">
            {profilePic ? (
              <img
                src={profilePic}
                alt="Profile"
                className="profile-pic"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/default-profile.png';
                }}
              />
            ) : (
              <div className="no-pic-placeholder">
                <FaUserCircle size={74} />
              </div>
            )}

            <label className="file-input-label" htmlFor="profile-upload">
              <FaUpload style={{ marginRight: '8px' }} />
              {uploading ? 'Uploading...' : 'Upload'}
              <input
                id="profile-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="file-input"
                aria-label="Upload Profile Picture"
              />
            </label>
            <p className="profile-hint">Add a profile photo</p>
          </div>

          <div className="user-details">
            <div className="profile-name">
              <h2>{user.name || user.handle || 'Welcome'}</h2>
              <span className="profile-handle">@{user.handle || 'member'}</span>
            </div>
            <div className="account-row">
              <span>Email address</span>
              <strong>{user.email}</strong>
            </div>
            <div className="account-stat">
              <span className="stat-number">{questionsDone}</span>
              <span className="stat-label">Problems completed</span>
            </div>
          </div>
        </div>

        {error && <p className="error dashboard-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}

export default Dashboard;
