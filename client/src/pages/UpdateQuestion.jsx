import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { checkAuth, getQuestionById, updateQuestion } from '../service/api.js';
import './AddQuestion.css';

const defaultForm = {
  title: '',
  description: '',
  tags: '',
  timeLimitSec: 2,
  memoryLimitMb: 256,
};

export default function UpdateQuestion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [questionData, setQuestionData] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/signin');
      return;
    }

    const loadQuestion = async () => {
      try {
        await checkAuth();
        const question = await getQuestionById(id);
        setQuestionData(question);
        setFormData({
          title: question.title,
          description: question.description,
          tags: Array.isArray(question.tags) ? question.tags.join(', ') : '',
          timeLimitSec: question.timeLimitSec || 2,
          memoryLimitMb: question.memoryLimitMb || 256,
        });
      } catch (error) {
        console.error('Error fetching question:', error);
        navigate('/dashboard');
      }
    };

    loadQuestion();
  }, [id, navigate]);

  const handleChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateQuestion(id, {
        ...formData,
        timeLimitSec: Number(formData.timeLimitSec),
        memoryLimitMb: Number(formData.memoryLimitMb),
        tags: formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
      navigate(`/questions/${id}`);
    } catch (error) {
      console.error('Error updating question:', error);
      alert(error.response?.data?.message || 'Failed to update question');
    } finally {
      setSaving(false);
    }
  };

  if (!questionData) return <div className="app-loading">Loading question...</div>;

  return (
    <main className="add-question-container">
      <h1 className="add-question-heading">Edit problem</h1>
      <form onSubmit={handleSubmit} className="add-question-form">
        <div className="question-field">
          <label htmlFor="question-title">Title</label>
          <input
            type="text"
            name="title"
            id="question-title"
            value={formData.title}
            onChange={handleChange}
            required
            className="input-text"
          />
        </div>
        <div className="question-field">
          <label htmlFor="question-description">Description</label>
          <textarea
            name="description"
            id="question-description"
            value={formData.description}
            onChange={handleChange}
            rows={6}
            required
            className="input-text"
          />
        </div>
        <div className="question-field">
          <label htmlFor="question-tags">Tags (comma-separated)</label>
          <input
            type="text"
            name="tags"
            id="question-tags"
            value={formData.tags}
            onChange={handleChange}
            className="input-text"
          />
        </div>
        <div className="question-field">
          <label htmlFor="question-time-limit">Time limit (per test case)</label>
          <select
            name="timeLimitSec"
            id="question-time-limit"
            value={formData.timeLimitSec}
            onChange={handleChange}
            className="input-select"
          >
            <option value={1}>1 second</option>
            <option value={2}>2 seconds</option>
            <option value={5}>5 seconds</option>
          </select>
        </div>
        <div className="question-field">
          <label htmlFor="question-memory-limit">Memory limit (per submission)</label>
          <select
            name="memoryLimitMb"
            id="question-memory-limit"
            value={formData.memoryLimitMb}
            onChange={handleChange}
            className="input-select"
          >
            <option value={128}>128 MB</option>
            <option value={256}>256 MB</option>
            <option value={512}>512 MB</option>
            <option value={1024}>1024 MB</option>
          </select>
        </div>
        <button type="submit" className="btn-submit-question" disabled={saving}>
          {saving ? 'Saving...' : 'Update Question'}
        </button>
      </form>
    </main>
  );
}
