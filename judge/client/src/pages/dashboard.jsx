import React, { useState, useEffect } from 'react';
import { updateProfilePicture, getUserStats } from '../service/api.js';
import '../App.css';

const BACKEND_BASE_URL = 'http://localhost:8000';

function Dashboard({ user }) {
  const [profilePic, setProfilePic] = useState(user?.profilePic || '');
  const [uploading, setUploading] = useState(false);
  const [questionsDone, setQuestionsDone] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!user?.handle) return;
        const res = await getUserStats(user.handle);  // use handle here
        setQuestionsDone(res.questionsDone || 0);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Failed to fetch user statistics');
      }
    };
    fetchStats();
  }, [user?.handle]);

  const getFullProfilePicUrl = (picPath) => {
    if (!picPath) return '';
    if (picPath.startsWith('http://') || picPath.startsWith('https://')) return picPath;
    return BACKEND_BASE_URL + picPath;
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('profilePic', file);
      const res = await updateProfilePicture(user.handle, formData);  // use handle here
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
        <div className="form-box">Loading user info...</div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="form-box dashboard-box">
        <h1 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>User Dashboard</h1>

        <div className="user-info">
          <div className="profile-pic-wrapper">
            {profilePic ? (
              <img
                src={getFullProfilePicUrl(profilePic)}
                alt="Profile"
                className="profile-pic"
              />
            ) : (
              <div className="no-pic-placeholder">No Profile Picture</div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="file-input"
              aria-label="Upload Profile Picture"
            />
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
