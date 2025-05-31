import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getQuestionById, runCodeApi, submitCodeApi } from '../service/api';
import './QuestionDetails.css';

export default function QuestionDetail() {
  const { id } = useParams();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [language, setLanguage] = useState('cpp'); // Default language
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');

  const [output, setOutput] = useState('');
  const [outputError, setOutputError] = useState('');

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const data = await getQuestionById(id);
        setQuestion(data);
      } catch (err) {
        setError('Failed to load question.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestion();
  }, [id]);

  const handleRun = async () => {
    setOutput('');
    setOutputError('');
    try {
      const result = await runCodeApi({ code, language, input });
      setOutput(result.output);
    } catch (err) {
      setOutputError(err.response?.data?.error || err.message);
    }
  };

  const handleSubmit = async () => {
    setOutput('');
    setOutputError('');
    try {
      const result = await submitCodeApi({ code, language, questionId: id });
      if (result.passed) {
        setOutput('✅ All test cases passed!');
      } else {
        setOutput(`❌ Some test cases failed: ${result.failedCases.join(', ')}`);
      }
    } catch (err) {
      setOutputError(err.response?.data?.error || err.message);
    }
  };

  if (loading) return <p>Loading question...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div className="question-details-container">
      <div className="left-pane">
        <h2>{question.title}</h2>
        <pre className="question-description">{question.description || 'No description available.'}</pre>
      </div>

      <div className="right-pane">
        <div className="language-selector">
          <label htmlFor="language-select" style={{ fontWeight: 'bold' }}>Language:</label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="c">C</option>
            <option value="cpp">C++</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
          </select>
        </div>

        <div className="code-editor-container">
          <textarea
            className="code-editor"
            placeholder="Write your code here..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>

        <div className="input-section">
          <label htmlFor="input-area" style={{ fontWeight: 'bold' }}>Input (stdin):</label>
          <textarea
            id="input-area"
            className="input-box"
            placeholder="Optional input for your program"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>

        <div className="button-group">
          <button onClick={handleRun} style={{ backgroundColor: '#4caf50', color: 'white' }}>Run</button>
          <button onClick={handleSubmit} style={{ backgroundColor: '#2196f3', color: 'white' }}>Submit</button>
        </div>

        <div className="output-box">
          {outputError ? (
            <span className="output-error">{outputError}</span>
          ) : (
            <pre>{output}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
