// src/pages/UpdateQuestion.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function UpdateQuestion() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [questionData, setQuestionData] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', tags: '' });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/signin');

    // First check if token is valid
    axios.get('http://localhost:8000/protected', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(() => {
      fetchQuestion(token);
    })
    .catch(() => {
      localStorage.removeItem('token');
      navigate('/signin');
    });
  }, [id]);

  const fetchQuestion = async (token) => {
    try {
      const res = await axios.get(`http://localhost:8000/questions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { title, description, tags } = res.data;
      setFormData({
        title,
        description,
        tags: Array.isArray(tags) ? tags.join(', ') : ''
      });
      setQuestionData(res.data);
    } catch (err) {
      console.error('Error fetching question:', err);
      alert('Failed to fetch question');
      navigate('/dashboard');
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await axios.put(
        `http://localhost:8000/questions/${id}`,
        {
          ...formData,
          tags: formData.tags.split(',').map(tag => tag.trim())
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      alert('Question updated!');
      navigate(`/questions/${id}`);
    } catch (err) {
      console.error('Error updating question:', err);
      alert('Failed to update question');
    }
  };

  if (!questionData) return <div>Loading...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Edit Question</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Title:</label><br />
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Description:</label><br />
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={6}
            required
          />
        </div>
        <div>
          <label>Tags (comma-separated):</label><br />
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
          />
        </div>
        <button type="submit">Update Question</button>
      </form>
    </div>
  );
}

export default UpdateQuestion;
