import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Eye, Save, ArrowLeft, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getPuzzle, generatePreview, updatePuzzle, publishPuzzle, unpublishPuzzle } from '../api';
import CrosswordPreview from '../components/CrosswordPreview';

function EditPuzzle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('low');
  const [timerMode, setTimerMode] = useState(false);
  const [timeLimit, setTimeLimit] = useState(180);
  const [gridSize, setGridSize] = useState(15);
  const [words, setWords] = useState([]);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState('draft');
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    const fetchPuzzle = async () => {
      try {
        const res = await getPuzzle(id);
        const p = res.data;
        setTitle(p.title);
        setDifficulty(p.difficulty);
        setTimerMode(p.timer_mode === 1);
        setTimeLimit(p.time_limit_seconds || 180);
        setGridSize(p.grid_size);
        setStatus(p.status);
        setWords(p.words.map(w => ({ word: w.word, hint: w.hint })));
        if (p.grid_data?.solution) {
          setPreview({
            grid: p.grid_data.solution,
            words: p.words,
            gridSize: p.grid_size,
            placedCount: p.words.length,
            totalWords: p.words.length,
          });
        }
      } catch (err) {
        toast.error('Failed to load puzzle');
        navigate('/');
      } finally {
        setFetching(false);
      }
    };
    fetchPuzzle();
  }, [id, navigate]);

  const addWord = () => setWords([...words, { word: '', hint: '' }]);

  const removeWord = (index) => {
    if (words.length <= 2) return toast.error('Minimum 2 words');
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
    if (validWords.length < 2) return toast.error('Enter at least 2 words');
    setPreviewing(true);
    setErrors([]);
    try {
      const res = await generatePreview(validWords, gridSize);
      setPreview(res.data);
      toast.success('Preview updated!');
    } catch (err) {
      setErrors(err.response?.data?.errors || [err.response?.data?.error || 'Preview failed']);
    } finally {
      setPreviewing(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return toast.error('Title required');
    const validWords = words.filter(w => w.word.trim() && w.hint.trim());
    if (validWords.length < 2) return toast.error('Enter at least 2 words');
    setLoading(true);
    try {
      await updatePuzzle(id, {
        title: title.trim(),
        difficulty,
        timer_mode: timerMode,
        time_limit_seconds: timerMode ? timeLimit : 0,
        words: validWords,
        gridSize,
      });
      toast.success('Puzzle updated!');
      navigate('/');
    } catch (err) {
      setErrors(err.response?.data?.errors || [err.response?.data?.error || 'Update failed']);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async () => {
    try {
      if (status === 'published') {
        await unpublishPuzzle(id);
        setStatus('unpublished');
        toast.success('Unpublished');
      } else {
        await publishPuzzle(id);
        setStatus('published');
        toast.success('Published!');
      }
    } catch (err) {
      toast.error('Action failed');
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Puzzle</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          status === 'published' ? 'bg-green-100 text-green-700' : status === 'draft' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Settings</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
              <div className="flex gap-2">
                {['low', 'medium', 'high'].map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${
                      difficulty === d ? 'bg-primary-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Grid Size</label>
              <select value={gridSize} onChange={(e) => { setGridSize(Number(e.target.value)); setPreview(null); }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary-500">
                {[10, 12, 15, 18, 20].map(s => <option key={s} value={s}>{s} x {s}</option>)}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Timer Mode</label>
              <button onClick={() => setTimerMode(!timerMode)}
                className={`w-12 h-6 rounded-full transition-all relative ${timerMode ? 'bg-primary-600' : 'bg-gray-300'}`}>
                <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${timerMode ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>

            {timerMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit (seconds)</label>
                <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} min={30} max={600}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Words & Hints ({words.length})</h3>
              <button onClick={addWord} className="flex items-center gap-1 text-sm text-primary-600 font-medium">
                <Plus className="w-4 h-4" /> Add Word
              </button>
            </div>
            <div className="space-y-3">
              {words.map((w, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="w-8 h-10 flex items-center justify-center text-sm text-gray-400 font-medium">{i + 1}</span>
                  <input type="text" value={w.word}
                    onChange={(e) => updateWord(i, 'word', e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary-500 font-mono uppercase"
                    placeholder="WORD" />
                  <input type="text" value={w.hint}
                    onChange={(e) => updateWord(i, 'hint', e.target.value)}
                    className="flex-[2] px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Hint..." />
                  <button onClick={() => removeWord(i)} className="p-2.5 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {errors.length > 0 && (
            <div className="bg-red-50 rounded-2xl border border-red-100 p-4">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <AlertCircle className="w-5 h-5" /><span className="font-medium text-sm">Errors</span>
              </div>
              <ul className="text-sm text-red-600 space-y-1 ml-7">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-8">
            <h3 className="font-semibold text-gray-900 mb-4">Preview</h3>
            {preview ? (
              <div>
                <div className="flex justify-center mb-4 overflow-auto">
                  <CrosswordPreview grid={preview.grid} words={preview.words} />
                </div>
                <p className="text-sm text-gray-500 text-center">{preview.placedCount}/{preview.totalWords} words | {preview.gridSize}x{preview.gridSize}</p>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                Click "Generate Preview" to see your crossword
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button onClick={handlePreview} disabled={previewing}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" /> {previewing ? 'Generating...' : 'Generate Preview'}
              </button>
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={loading}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Save
                </button>
                <button onClick={handleTogglePublish}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm ${
                    status === 'published' ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}>
                  {status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditPuzzle;
