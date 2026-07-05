import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Edit3, Trash2, Eye, EyeOff, Clock, Award, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllPuzzles, publishPuzzle, unpublishPuzzle, deletePuzzle } from '../api';

const difficultyColors = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

function Dashboard() {
  const [puzzles, setPuzzles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchPuzzles = async () => {
    try {
      const res = await getAllPuzzles();
      setPuzzles(res.data);
    } catch (err) {
      toast.error('Failed to load puzzles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPuzzles();
  }, []);

  const handlePublish = async (id) => {
    try {
      await publishPuzzle(id);
      toast.success('Puzzle published!');
      fetchPuzzles();
    } catch (err) {
      toast.error('Failed to publish');
    }
  };

  const handleUnpublish = async (id) => {
    try {
      await unpublishPuzzle(id);
      toast.success('Puzzle unpublished');
      fetchPuzzles();
    } catch (err) {
      toast.error('Failed to unpublish');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this puzzle?')) return;
    try {
      await deletePuzzle(id);
      toast.success('Puzzle deleted');
      fetchPuzzles();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const filtered = filter === 'all' ? puzzles : puzzles.filter(p => p.status === filter);

  const stats = {
    total: puzzles.length,
    published: puzzles.filter(p => p.status === 'published').length,
    draft: puzzles.filter(p => p.status === 'draft').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your crossword puzzles</p>
        </div>
        <Link
          to="/create"
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-all text-sm"
        >
          <PlusCircle className="w-5 h-5" />
          New Puzzle
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Puzzles', value: stats.total, color: 'bg-blue-50 text-blue-700' },
          { label: 'Published', value: stats.published, color: 'bg-green-50 text-green-700' },
          { label: 'Drafts', value: stats.draft, color: 'bg-orange-50 text-orange-700' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {['all', 'published', 'draft', 'unpublished'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              filter === f ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Puzzle list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-400 text-lg">No puzzles found</p>
          <Link to="/create" className="text-primary-600 text-sm font-medium mt-2 inline-block hover:underline">
            Create your first puzzle
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((puzzle) => (
            <div
              key={puzzle.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between hover:shadow-md transition-all"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{puzzle.title}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${difficultyColors[puzzle.difficulty]}`}>
                    {puzzle.difficulty}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    puzzle.status === 'published' ? 'bg-green-100 text-green-700' :
                    puzzle.status === 'draft' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {puzzle.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />{puzzle.word_count} words</span>
                  <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" />{puzzle.points} pts</span>
                  {puzzle.timer_mode === 1 && (
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{puzzle.time_limit_seconds}s</span>
                  )}
                  <span className="text-gray-400">Grid: {puzzle.grid_size}x{puzzle.grid_size}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {puzzle.status === 'published' ? (
                  <button
                    onClick={() => handleUnpublish(puzzle.id)}
                    className="p-2 rounded-lg hover:bg-orange-50 text-orange-500 transition-all"
                    title="Unpublish"
                  >
                    <EyeOff className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handlePublish(puzzle.id)}
                    className="p-2 rounded-lg hover:bg-green-50 text-green-500 transition-all"
                    title="Publish"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                )}
                <Link
                  to={`/edit/${puzzle.id}`}
                  className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-all"
                  title="Edit"
                >
                  <Edit3 className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => handleDelete(puzzle.id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
