// QuestionDetails.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getQuestionById } from '../service/api';
import './QuestionDetails.css';

export default function QuestionDetail() {
  const { id } = useParams();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const res = await getQuestionById(id);
        setQuestion(res.data); // Your backend returns question with description
      } catch (err) {
        setError('Failed to load question');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestion();
  }, [id]);

  if (loading) return <p>Loading question...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="question-details-container">
      <div className="left-pane">
        <h2>{question.title}</h2>
        <pre className="question-description">{question.description || 'No description available.'}</pre>
      </div>
      <div className="right-pane">
        <h3>Code Editor / Submission</h3>
        {/* TODO: Add code editor or submission form here later */}
        <p>Code editor will be here.</p>
      </div>
    </div>
  );
}
