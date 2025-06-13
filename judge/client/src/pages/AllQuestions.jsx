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
      <div className="questions-header">
        <h2>Your Problems</h2>
      </div>

      {loading && <p>Loading questions...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && questions.length === 0 && !error && (
        <p>No questions found.</p>
      )}

      <div className="horizontal-question-list">
        {questions.map((q) => (
          <Link to={`/questions/${q.questionId}`} key={q.questionId} className="question-link">
            <div className="question-card">
              <div className="question-left">
                <h3>{q.title}</h3>
                <div className="tags">
                  {(q.tags || []).map((tag, i) => (
                    <span className="tag" key={i}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className={`difficulty-badge ${q.difficulty.toLowerCase()}`}>
                {q.difficulty}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
