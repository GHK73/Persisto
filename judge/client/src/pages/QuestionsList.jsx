// src/pages/QuestionsList.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserQuestions, deleteQuestion, checkAuth } from '../service/api.js';
import { FaEdit, FaTrash } from 'react-icons/fa';
import '../App.css';

const QuestionList = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/signin');

    checkAuth()
      .then(() => fetchQuestions())
      .catch((err) => {
        console.error("Auth check failed:", err.response?.data || err.message);
        localStorage.removeItem('token');
        navigate('/signin');
      });
  }, []);

  const fetchQuestions = async () => {
    try {
      const res = await getUserQuestions();
      if (Array.isArray(res)) {
        setQuestions(res);
      } else {
        console.error('Expected an array but got:', res);
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await deleteQuestion(questionId);
      setQuestions(prev => prev.filter(q => q.questionId !== questionId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleUpdate = (questionId) => {
    navigate(`/update-question/${questionId}`);
  };

  if (loading) return <div className="questions-list-container">Loading...</div>;

  return (
    <div className="questions-list-container">
      <h2>My Questions</h2>
      {questions.length === 0 ? (
        <p className="text-gray-500">You have not uploaded any questions yet.</p>
      ) : (
        <ul className="questions-list">
          {questions.map(q => (
            <li key={q.questionId} className="question-list-item">
              <div className="question-info">
                <span className="question-link">{q.title}</span>
                <span className="difficulty-tag">{q.difficulty}</span>
              </div>
              <div className="button-group">
                <button onClick={() => handleUpdate(q.questionId)} className="btn-edit">
                  <FaEdit style={{ marginRight: '5px' }} /> Edit
                </button>
                <button onClick={() => handleDelete(q.questionId)} className="btn-delete">
                  <FaTrash style={{ marginRight: '5px' }} /> Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default QuestionList;