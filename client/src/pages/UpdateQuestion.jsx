import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { checkAuth, getQuestionById, updateQuestion } from '../service/api.js';

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

  if (!questionData) return <div>Loading...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Edit Question</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Title:</label><br />
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Description:</label><br />
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={6}
            required
          />
        </div>
        <div>
          <label>Tags (comma-separated):</label><br />
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Time Limit (per test case):</label><br />
          <select
            name="timeLimitSec"
            value={formData.timeLimitSec}
            onChange={handleChange}
          >
            <option value={1}>1 second</option>
            <option value={2}>2 seconds</option>
            <option value={5}>5 seconds</option>
          </select>
        </div>
        <div>
          <label>Memory Limit (per submission):</label><br />
          <select
            name="memoryLimitMb"
            value={formData.memoryLimitMb}
            onChange={handleChange}
          >
            <option value={128}>128 MB</option>
            <option value={256}>256 MB</option>
            <option value={512}>512 MB</option>
            <option value={1024}>1024 MB</option>
          </select>
        </div>
        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Update Question'}
        </button>
      </form>
    </div>
  );
}
