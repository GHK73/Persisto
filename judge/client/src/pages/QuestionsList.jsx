import React, { useEffect, useState } from 'react';
import { getAllQuestions, deleteQuestion } from '../service/api';
import { Link } from 'react-router-dom';
import '../App.css';

export default function QuestionsList() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchQuestions = async () => {
    try {
      const res = await getAllQuestions();
      const questionsData = res.map((q) => ({
        questionId: q._id || q.questionId,
        title: q.title,
        difficulty: q.difficulty,
      }));
      setQuestions(questionsData);
    } catch (error) {
      console.error('Failed to fetch questions', error);
      setError('Could not load questions. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleDelete = async (questionId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in to delete a question.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      await deleteQuestion(questionId);
      alert('Question deleted successfully');
      setQuestions((prev) => prev.filter((q) => q.questionId !== questionId));
    } catch (error) {
      console.error('Failed to delete question', error.response || error);
      alert('Failed to delete question');
    }
  };

  return (
    <div className="questions-list-container">
      <h2>Available Coding Questions</h2>
      {loading ? (
        <p>Loading questions...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : questions.length === 0 ? (
        <p>No questions available.</p>
      ) : (
        <ul className="questions-list">
          {questions.map(({ questionId, title, difficulty }) => (
            <li key={questionId} className="question-list-item">
              <Link to={`/questions/${questionId}`} className="question-link">
                {title} <span className="difficulty-tag">[{difficulty}]</span>
              </Link>
              <button
                onClick={() => handleDelete(questionId)}
                className="btn-delete"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
