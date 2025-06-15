import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getQuestionById,
  runCodeApi,
  submitCodeApi,
  checkAuth,
} from '../service/api';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { FaCode } from 'react-icons/fa';
import '../App.css';
import './QuestionDetails.css';

export default function QuestionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');

  const [output, setOutput] = useState('');
  const [outputError, setOutputError] = useState('');

  const languageMap = {
    c: 'c',
    cpp: 'cpp',
    python: 'python',
    java: 'java',
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
      return;
    }

    checkAuth()
      .then(() => {
        fetchQuestion();
      })
      .catch(() => {
        localStorage.removeItem('token');
        navigate('/signin');
      });
  }, [id]);

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

  const handleRun = async () => {
    setOutput('');
    setOutputError('');

    const selectedLang = languageMap[language] || 'cpp';
    console.log('RUN CODE:', { code, language: selectedLang, input });

    try {
      const result = await runCodeApi({
        code,
        language: selectedLang,
        input,
      });
      setOutput(result.output);
    } catch (err) {
      setOutputError(err.response?.data?.error || err.message);
    }
  };

  const handleSubmit = async () => {
    setOutput('');
    setOutputError('');

    const selectedLang = languageMap[language] || 'cpp';
    console.log('SUBMIT CODE:', { code, language: selectedLang, questionId: id });

    try {
      const result = await submitCodeApi({
        code,
        language: selectedLang,
        questionId: id,
      });
      if (result.passed) {
        setOutput('✅ All test cases passed!');
      } else {
        setOutput(
          `❌ Some test cases failed: ${result.failedCases.join(', ')}`
        );
      }
    } catch (err) {
      setOutputError(err.response?.data?.error || err.message);
    }
  };

  if (loading) return <p>Loading question...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="question-details-container">
      <div className="left-pane">
        <h2 className="question-title">{question.title}</h2>
        <div className="question-description">
          <ReactMarkdown>
            {question.description || 'No description available.'}
          </ReactMarkdown>
        </div>
      </div>

      <div className="right-pane">
        <div className="language-selector">
          <label htmlFor="language-select" className="language-label">
            Language:
          </label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="language-dropdown"
          >
            <option value="c">C</option>
            <option value="cpp">C++</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
          </select>
        </div>

        <div className="code-editor-container">
          <div style={{ marginBottom: '6px', color: '#475569', fontWeight: '600' }}>
            <FaCode style={{ marginRight: '6px' }} /> Code Editor
          </div>
          <Editor
            height="100%"
            language={languageMap[language] || 'cpp'}
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || '')}
            options={{
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>

        <div className="input-section">
          <label htmlFor="input-area" className="input-label">
            Input (stdin):
          </label>
          <textarea
            id="input-area"
            className="input-box"
            placeholder="Optional input for your program"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>

        <div className="button-group">
          <button onClick={handleRun} className="btn-run">
            Run
          </button>
          <button onClick={handleSubmit} className="btn-submit">
            Submit
          </button>
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
