import { useEffect, useState } from 'react';
import { getAllQuestions } from '../service/api';
import '../App.css';

function AllQuestions() {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await getAllQuestions();
        setQuestions(res);
      } catch (err) {
        console.error('Error fetching questions:', err);
      }
    };
    fetchQuestions();
  }, []);

  return (
    <div className="questions-container">
      <h2>All Questions</h2>
      {questions.map((q) => (
        <div className="question-card" key={q._id}>
          <div className="question-left">
            <h3>{q.title}</h3>
          </div>
          <div className="question-right">
            <p>Status: {q.solved ? '✅ Solved' : '❌ Not Solved'}</p>
            <p>Tag: {q.tag}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AllQuestions;
