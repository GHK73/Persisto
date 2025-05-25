import { useState, useEffect } from 'react';
import { updateProfilePicture, getUserStats } from '../service/api.js';
import '../App.css';


function Dashboard({ user }) {
  const [profilePic, setProfilePic] = useState(user.profilePic || '');
  const [uploading, setUploading] = useState(false);
  const [questionsDone, setQuestionsDone] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getUserStats(user._id);
        setQuestionsDone(res.data.questionsDone);
      } catch {
        setError('Failed to fetch stats');
      }
    };
    fetchStats();
  }, [user._id]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('profilePic', file);

      const res = await updateProfilePicture(user._id, formData);
      setProfilePic(res.data.profilePic);
    } catch {
      setError('Failed to update profile picture');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-box dashboard-box">
        <h1 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>User Dashboard</h1>

        <div className="user-info">
          <div className="profile-pic-wrapper">
            {profilePic ? (
              <img src={profilePic} alt="Profile" className="profile-pic" />
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
