import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Eye, Save, ArrowLeft, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { generatePreview, createPuzzle, publishPuzzle } from '../api';
import CrosswordPreview from '../components/CrosswordPreview';

function CreatePuzzle() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('low');
  const [timerMode, setTimerMode] = useState(false);
  const [timeLimit, setTimeLimit] = useState(180);
  const [gridSize, setGridSize] = useState(15);
  const [words, setWords] = useState([{ word: '', hint: '' }, { word: '', hint: '' }, { word: '', hint: '' }]);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const addWord = () => setWords([...words, { word: '', hint: '' }]);

  const removeWord = (index) => {
    if (words.length <= 2) {
      toast.error('Minimum 2 words required');
      return;
    }
    setWords(words.filter((_, i) => i !== index));
    setPreview(null);
  };

  const updateWord = (index, field, value) => {
    const updated = [...words];
    updated[index] = { ...updated[index], [field]: value };
    setWords(updated);
    setPreview(null);
  };

  const handlePreview = async () => {
    const validWords = words.filter(w => w.word.trim() && w.hint.trim());
    if (validWords.length < 2) {
      toast.error('Enter at least 2 words with hints');
      return;
    }
    setPreviewing(true);
    setErrors([]);
    try {
      const res = await generatePreview(validWords, gridSize);
      setPreview(res.data);
      if (res.data.placedCount < res.data.totalWords) {
        toast(`${res.data.placedCount}/${res.data.totalWords} words placed`, { icon: '⚠️' });
      } else {
        toast.success('Preview generated!');
      }
    } catch (err) {
      const errs = err.response?.data?.errors || [err.response?.data?.error || 'Preview failed'];
      setErrors(errs);
      toast.error('Validation errors found');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSave = async (publish = false) => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    const validWords = words.filter(w => w.word.trim() && w.hint.trim());
    if (validWords.length < 2) {
      toast.error('Enter at least 2 words with hints');
      return;
    }
    setLoading(true);
    try {
      const res = await createPuzzle({
        title: title.trim(),
        difficulty,
        timer_mode: timerMode,
        time_limit_seconds: timerMode ? timeLimit : 0,
        words: validWords,
        gridSize,
      });
      if (publish) {
        await publishPuzzle(res.data.id);
        toast.success('Puzzle created and published!');
      } else {
        toast.success('Puzzle saved as draft!');
      }
      navigate('/');
    } catch (err) {
      const errs = err.response?.data?.errors || [err.response?.data?.error || 'Save failed'];
      setErrors(errs);
      toast.error('Failed to save puzzle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Puzzle</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Form */}
        <div className="space-y-6">
          {/* Title */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Puzzle Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
              placeholder="e.g., Tech Basics, Animal Kingdom"
            />
          </div>

          {/* Settings */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Settings</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
              <div className="flex gap-2">
                {['low', 'medium', 'high'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${
                      difficulty === d ? 'bg-primary-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grid Size</label>
              <select
                value={gridSize}
                onChange={(e) => { setGridSize(Number(e.target.value)); setPreview(null); }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              >
                {[10, 12, 15, 18, 20].map(s => (
                  <option key={s} value={s}>{s} x {s}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Timer Mode</label>
              <button
                onClick={() => setTimerMode(!timerMode)}
                className={`w-12 h-6 rounded-full transition-all relative ${timerMode ? 'bg-primary-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${timerMode ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>

            {timerMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit (seconds)</label>
                <input
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  min={30}
                  max={600}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}
          </div>

          {/* Words */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Words & Hints ({words.length})</h3>
              <button onClick={addWord} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
                <Plus className="w-4 h-4" /> Add Word
              </button>
            </div>

            <div className="space-y-3">
              {words.map((w, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="w-8 h-10 flex items-center justify-center text-sm text-gray-400 font-medium">{i + 1}</span>
                  <input
                    type="text"
                    value={w.word}
                    onChange={(e) => updateWord(i, 'word', e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary-500 font-mono uppercase"
                    placeholder="WORD"
                  />
                  <input
                    type="text"
                    value={w.hint}
                    onChange={(e) => updateWord(i, 'hint', e.target.value)}
                    className="flex-[2] px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter a hint..."
                  />
                  <button onClick={() => removeWord(i)} className="p-2.5 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 rounded-2xl border border-red-100 p-4">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium text-sm">Validation Errors</span>
              </div>
              <ul className="text-sm text-red-600 space-y-1 ml-7">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Right: Preview & Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-8">
            <h3 className="font-semibold text-gray-900 mb-4">Preview</h3>

            {preview ? (
              <div>
                <div className="flex justify-center mb-4 overflow-auto">
                  <CrosswordPreview grid={preview.grid} words={preview.words} />
                </div>
                <p className="text-sm text-gray-500 text-center">
                  {preview.placedCount}/{preview.totalWords} words placed | Grid: {preview.gridSize}x{preview.gridSize}
                </p>

                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Clues</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Across</p>
                      {preview.words.filter(w => w.direction === 'across').map(w => (
                        <p key={w.number + 'a'} className="text-gray-600"><span className="font-medium">{w.number}.</span> {w.hint}</p>
                      ))}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Down</p>
                      {preview.words.filter(w => w.direction === 'down').map(w => (
                        <p key={w.number + 'd'} className="text-gray-600"><span className="font-medium">{w.number}.</span> {w.hint}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                Click "Generate Preview" to see your crossword
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button
                onClick={handlePreview}
                disabled={previewing}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {previewing ? 'Generating...' : 'Generate Preview'}
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => handleSave(false)}
                  disabled={loading}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Draft
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={loading}
                  className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-all disabled:opacity-50 text-sm"
                >
                  {loading ? 'Saving...' : 'Publish Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreatePuzzle;
