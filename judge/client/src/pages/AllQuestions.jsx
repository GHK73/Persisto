import React, { useEffect, useState } from 'react';
import { getAllQuestions } from '../service/api';
import { Link } from 'react-router-dom';
import './AllQuestions.css'; // Import the CSS file for styling

export default function AllQuestions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const all = await getAllQuestions();
        console.log('Fetched questions:', all);
        setQuestions(all || []);
      } catch (err) {
        console.error('Error fetching questions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  return (
    <div className="questions-container">
      <h2>All Questions</h2>
      {loading ? (
        <p>Loading questions...</p>
      ) : (
        <div className="all-questions-wrapper">
          {questions.length === 0 ? (
            <p>No questions found.</p>
          ) : (
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
      )}
    </div>
  );
}
