import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getQuestionById,
  runCodeApi,
  submitCodeApi,
  checkAuth,
  reviewCodeApi,
} from '../service/api.js';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { FaCode } from 'react-icons/fa';
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

  const [review, setReview] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const languageMap = { c: 'c', cpp: 'cpp', python: 'python', java: 'java' };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
      return;
    }

    checkAuth()
      .then(fetchQuestion)
      .catch(() => {
        localStorage.removeItem('token');
        navigate('/signin');
      });
  }, [id]);

  const fetchQuestion = async () => {
  try {
    const data = await getQuestionById(id);
    console.log('Fetched question:', data);
    setQuestion({
      ...data,
      sampleTestCases: data.sampleTestCases || [], // ✅ Ensure it's part of `question` state
    });
  } catch {
    setError('❌ Failed to load question. Please try again later.');
  } finally {
    setLoading(false);
  }
};

  const handleRun = async () => {
    resetOutputs();
    try {
      const result = await runCodeApi({
        code,
        language: languageMap[language],
        input,
      });
      setOutput(result.output);
    } catch (err) {
      setOutputError(err.response?.data?.error || err.message);
    }
  };

  const handleSubmit = async () => {
    resetOutputs();
    try {
      const result = await submitCodeApi({
        code,
        language: languageMap[language],
        questionId: id,
      });
      if (result.passed) {
        setOutput('✅ All test cases passed!');
      } else {
        setOutput(`❌ Failed test cases: ${result.failedCases.join(', ')}`);
      }
    } catch (err) {
      setOutputError(err.response?.data?.error || err.message);
    }
  };

  const handleCodeReview = async () => {
    setReview('');
    setReviewLoading(true);
    setShowModal(true);

    try {
      const result = await reviewCodeApi({
        code,
        language: languageMap[language],
        questionTitle: question.title,
        questionDescription: question.description,
      });
      setReview(result.review);
    } catch (err) {
      setReview(`⚠️ Review failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setReviewLoading(false);
    }
  };

  const resetOutputs = () => {
    setOutput('');
    setOutputError('');
    setReview('');
  };

  const closeModal = () => {
    setShowModal(false);
    setReview('');
  };

  const handleSampleClick = (sampleInput) => {
    setInput(sampleInput);
  };

  if (loading) return <p>Loading question...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="question-details-container">
      <div className="left-pane">
        <h2 className="question-title">{question.title}</h2>
        <div className="question-description">
          <ReactMarkdown>{question.description || 'No description available.'}</ReactMarkdown>
        </div>

        {Array.isArray(question.sampleTestCases) && question.sampleTestCases.length > 0 && (
          <div className="sample-test-case">
            <h4>📘 Sample Test Cases</h4>
            {question.sampleTestCases.map((test, idx) => (
              <div key={idx} className="sample-pair">
                <div className="sample-block">
                  <strong>Input #{idx + 1}:</strong>
                  <pre>{test.input}</pre>
                  <button onClick={() => handleSampleClick(test.input)} className="use-sample-btn">
                    Use this input
                  </button>
                </div>
                <div className="sample-block">
                  <strong>Output #{idx + 1}:</strong>
                  <pre>{test.output}</pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="right-pane">
        <div className="language-selector">
          <label htmlFor="language-select">Language:</label>
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
          <div className="editor-header">
            <FaCode /> <span>Code Editor</span>
          </div>
          <Editor
            height="100%"
            language={languageMap[language]}
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
          <label htmlFor="input-area">Custom Input (optional):</label>
          <textarea
            id="input-area"
            value={input}
            placeholder="Enter sample input for testing..."
            onChange={(e) => setInput(e.target.value)}
            className="input-box"
          />
        </div>

        <div className="button-group">
          <button onClick={handleRun} className="btn-run">Run</button>
          <button onClick={handleSubmit} className="btn-submit">Submit</button>
          {output.includes('✅') && (
            <button onClick={handleCodeReview} className="btn-review">
              {reviewLoading ? 'Reviewing...' : 'AI Code Review'}
            </button>
          )}
        </div>

        <div className="output-box">
          {outputError ? (
            <span className="output-error">{outputError}</span>
          ) : (
            output && <pre>{output}</pre>
          )}
        </div>
      </div>

      {showModal && (
        <>
          <div className="modal-overlay" onClick={closeModal}></div>
          <div className="review-modal">
            <button className="close-button" onClick={closeModal}>×</button>
            <h3>💡 AI Code Review</h3>
            <pre>{reviewLoading ? 'Generating review...' : review}</pre>
          </div>
        </>
      )}
    </div>
  );
}