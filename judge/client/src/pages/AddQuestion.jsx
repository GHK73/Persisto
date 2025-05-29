import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addQuestion } from '../service/api';
import '../App.css';

const allTags = [
  "2-sat", "binary search", "bitmasks", "brute force", "chinese remainder theorem",
  "combinations", "constructive algorithms", "data structure", "dfs and similar",
  "divide and conquer", "dp", "dsu", "expression parsing", "fft", "flows", "games",
  "geometry", "graph matchings", "graphs", "greedy", "hashing", "implementation",
  "interactive", "math", "matrices", "meet-in-the-middle", "number theory",
  "probabilities", "schedules", "shortest paths", "sortings", "string suffix structures",
  "strings", "ternary search", "trees", "two pointers"
];

export default function AddQuestion() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('Easy');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [descriptionFile, setDescriptionFile] = useState(null);
  const [testCases, setTestCases] = useState([]);

  const suggestions = tagInput
    ? allTags.filter(
        (tag) =>
          tag.toLowerCase().includes(tagInput.toLowerCase()) &&
          !tags.includes(tag)
      )
    : [];

  const addTag = (tag) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = tagInput.trim().toLowerCase();
      const matchedTag = allTags.find((t) => t.toLowerCase() === input);
      if (matchedTag && !tags.includes(matchedTag)) {
        addTag(matchedTag);
      } else if (input && !tags.includes(input)) {
        addTag(input);
      }
    }
  };

  const removeTag = (indexToRemove) => {
    setTags(tags.filter((_, i) => i !== indexToRemove));
  };

  const handleSuggestionClick = (tag) => {
    addTag(tag);
  };

  const handleAddTestCase = () => {
    setTestCases([...testCases, { input: null, solution: null }]);
  };

  const handleTestCaseChange = (e, index, type) => {
    const updated = [...testCases];
    updated[index][type] = e.target.files[0];
    setTestCases(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !descriptionFile) {
      alert('Please provide a title and description file.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('difficulty', difficulty.toLowerCase());
    formData.append('tags', JSON.stringify(tags));

    if (descriptionFile) {
      formData.append('description', descriptionFile);
    } else {
      alert('Description file missing!');
      return;
    }

    testCases.forEach((test) => {
      if (test.input) formData.append('inputFiles', test.input);
      if (test.solution) formData.append('outputFiles', test.solution);
    });

    // Debug logs
    console.log('Submitting form data:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }

    try {
      await addQuestion(formData);
      alert('Question added successfully!');
      navigate('/questions');
    } catch (error) {
      console.error('API Error:', error.response?.data || error.message);
      alert(error.response?.data?.message || 'Error adding question.');
    }
  };

  return (
    <div className="add-question-container">
      <h2 className="add-question-heading">Add New Question</h2>
      <form onSubmit={handleSubmit} className="add-question-form">
        <label>Title:</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Enter question title"
          className="input-text"
        />

        <label>Tags (select from suggestions or type and press Enter):</label>
        <div className="tags-input-container" style={{ position: 'relative' }}>
          {tags.map((tag, idx) => (
            <div key={idx} className="tag-chip">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className="tag-remove-btn"
              >
                ×
              </button>
            </div>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            placeholder="Add a tag"
            className="input-text tag-input"
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <ul className="suggestions-list">
              {suggestions.map((suggestion, i) => (
                <li
                  key={i}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>

        <label>Description File (.txt):</label>
        <input
          type="file"
          accept=".txt"
          onChange={(e) => {
            console.log('Selected description file:', e.target.files[0]);
            setDescriptionFile(e.target.files[0]);
          }}
          required
          className="input-file"
        />

        <label>Difficulty:</label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="input-select"
        >
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>

        <div className="test-case-section">
          <label>Test Case Files (input + solution):</label>
          {testCases.map((test, idx) => (
            <div key={idx} className="test-case-pair">
              <input
                type="file"
                accept=".txt"
                onChange={(e) => handleTestCaseChange(e, idx, 'input')}
                className="input-file"
              />
              <input
                type="file"
                accept=".txt"
                onChange={(e) => handleTestCaseChange(e, idx, 'solution')}
                className="input-file"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddTestCase}
            className="btn-add-test-case"
          >
            + Add Test Case Pair
          </button>
        </div>

        <button type="submit" className="btn-submit-question">
          Add Question
        </button>
      </form>
    </div>
  );
}
