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
      <div className="form-container">
        <div className="dashboard-box">Loading user info...</div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="dashboard-box">
        <h1>User Dashboard</h1>

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
                <FaUserCircle size={80} color="#94a3b8" />
                <p>No Profile Picture</p>
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
          </div>

          <div className="user-details">
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Handle:</strong> {user.handle}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Questions Done:</strong> {questionsDone}</p>
          </div>
        </div>

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}

export default Dashboard;
