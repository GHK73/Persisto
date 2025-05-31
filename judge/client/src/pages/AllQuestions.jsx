import React, { useEffect, useState } from 'react';
import { getAllQuestions } from '../service/api';
import { Link } from 'react-router-dom';
import '../App.css';

export default function AllQuestions() {
  const [questions, setQuestions] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
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

  // Extract all unique tags from questions
  const allTags = Array.from(new Set(questions.flatMap((q) => q.tags || [])));

  // Filter questions by selected tag
  const filtered = selectedTag
    ? questions.filter((q) => (q.tags || []).includes(selectedTag))
    : questions;

  return (
    <div className="questions-container">
      <h2>All Questions</h2>
      {loading ? (
        <p>Loading questions...</p>
      ) : (
        <div className="all-questions-wrapper">
          <div className="horizontal-question-list">
            {filtered.length === 0 ? (
              <p>No questions found.</p>
            ) : (
              filtered.map((q) => (
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
              ))
            )}
          </div>

          <aside className="tag-filter">
            <h3>Filter by Tag</h3>
            <button
              className={!selectedTag ? 'tag-btn active' : 'tag-btn'}
              onClick={() => setSelectedTag(null)}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                className={selectedTag === tag ? 'tag-btn active' : 'tag-btn'}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </button>
            ))}
          </aside>
        </div>
      )}
    </div>
  );
}
