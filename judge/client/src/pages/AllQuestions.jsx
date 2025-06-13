// src/pages/AllQuestions.jsx
import React, { useEffect, useState } from 'react';
import { getAllQuestions } from '../service/api';
import { Link } from 'react-router-dom';
import './AllQuestions.css';

export default function AllQuestions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const all = await getAllQuestions();
        console.log('Fetched questions from backend:', all);
        setQuestions(Array.isArray(all) ? all : []);
      } catch (err) {
        console.error('Error fetching questions:', err);
        setError('Failed to fetch questions. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  return (
    <div className="questions-container">
      <h2>All Questions</h2>

      {loading && <p>Loading questions...</p>}

      {error && <p className="error">{error}</p>}

      {!loading && questions.length === 0 && !error && (
        <p>No questions found.</p>
      )}

      {!loading && questions.length > 0 && (
        <div className="horizontal-question-list">
          {questions.map((q) => (
            <Link
              to={`/questions/${q.questionId}`}
              key={q.questionId}
              className="question-link"
            >
              <div className="question-card">
                <div className="question-left">
                  <h3>{q.title}</h3>
                  <p className="tags">{(q.tags || []).join(', ')}</p>
                  <p className="difficulty">Difficulty: {q.difficulty}</p>
                </div>
                <div className="question-right">
                  <p>Status: {q.solved ? '✅ Solved' : '❌ Not Solved'}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
