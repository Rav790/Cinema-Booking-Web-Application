import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Check, X, Film, Clock, Star, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

export default function MovieManager() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMovie, setEditingMovie] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Form State
  const initialForm = {
    title: '',
    synopsis: '',
    duration_mins: 120,
    genre: 'Action, Sci-Fi',
    rating: 'PG-13',
    language: 'English',
    poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    backdrop_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    trailer_url: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
    release_date: new Date().toISOString().split('T')[0]
  };
  const [formData, setFormData] = useState(initialForm);

  const loadMovies = async () => {
    try {
      setLoading(true);
      const res = await api.getMovies(true);
      if (res.success) setMovies(res.movies);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, []);

  const handleEdit = (m) => {
    setEditingMovie(m);
    setFormData({
      title: m.title,
      synopsis: m.synopsis || '',
      duration_mins: m.duration_mins,
      genre: m.genre,
      rating: m.rating,
      language: m.language,
      poster_url: m.poster_url || '',
      backdrop_url: m.backdrop_url || '',
      trailer_url: m.trailer_url || '',
      release_date: m.release_date || ''
    });
    setShowForm(true);
  };

  const handleCreateNew = () => {
    setEditingMovie(null);
    setFormData(initialForm);
    setShowForm(true);
  };

  const handleToggleActive = async (m) => {
    try {
      const nextActive = m.is_active ? 0 : 1;
      await api.updateMovie(m.id, { is_active: nextActive });
      loadMovies();
      setStatusMsg(`Movie "${m.title}" set to ${nextActive ? 'Active' : 'Archived'}.`);
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMovie) {
        await api.updateMovie(editingMovie.id, formData);
        setStatusMsg('Movie updated successfully!');
      } else {
        await api.createMovie(formData);
        setStatusMsg('New movie added to catalog!');
      }
      setShowForm(false);
      setEditingMovie(null);
      loadMovies();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      alert(`Error saving movie: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white font-['Outfit']">
            Cinema Catalog & Movie Management
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure titles, censor ratings, durations, synopses, and promotional assets.
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add New Movie</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Movies Table / List */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-zinc-500">Loading catalog...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Movie</th>
                  <th className="py-3 px-3">Rating / Language</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3">Release Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {movies.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={m.poster_url}
                          alt={m.title}
                          className="w-10 h-14 rounded-lg object-cover border border-zinc-800 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-white text-sm truncate max-w-xs">{m.title}</div>
                          <div className="text-[11px] text-amber-400">{m.genre}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-bold text-[11px] mr-1.5 border border-zinc-700">
                        {m.rating}
                      </span>
                      <span className="text-zinc-400 text-xs">{m.language}</span>
                    </td>

                    <td className="py-3 px-3 text-zinc-300 font-mono">
                      {m.duration_mins} mins
                    </td>

                    <td className="py-3 px-3 text-zinc-400 font-mono">
                      {m.release_date}
                    </td>

                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleToggleActive(m)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${
                          m.is_active
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900'
                            : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700'
                        }`}
                        title="Click to toggle status"
                      >
                        {m.is_active ? 'Active' : 'Archived'}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleEdit(m)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Movie Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl my-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
              <h3 className="text-lg font-black text-white font-['Outfit']">
                {editingMovie ? `Edit Movie: ${editingMovie.title}` : 'Add New Movie to Repertoire'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Movie Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={formData.duration_mins}
                    onChange={(e) => setFormData({ ...formData, duration_mins: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Censor Rating</label>
                  <select
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm focus:border-amber-500"
                  >
                    <option value="G">G - General Audiences</option>
                    <option value="PG">PG - Parental Guidance</option>
                    <option value="PG-13">PG-13 - Parents Strongly Cautioned</option>
                    <option value="R">R - Restricted</option>
                    <option value="NC-17">NC-17 - Adults Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Language</label>
                  <input
                    type="text"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Genres (comma separated)</label>
                  <input
                    type="text"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    placeholder="e.g. Sci-Fi, Adventure, Action"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Release Date</label>
                  <input
                    type="date"
                    value={formData.release_date}
                    onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Synopsis</label>
                <textarea
                  rows={3}
                  value={formData.synopsis}
                  onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Poster Image URL</label>
                  <input
                    type="url"
                    value={formData.poster_url}
                    onChange={(e) => setFormData({ ...formData, poster_url: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">YouTube Trailer URL</label>
                  <input
                    type="url"
                    value={formData.trailer_url}
                    onChange={(e) => setFormData({ ...formData, trailer_url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20"
                >
                  Save Movie Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

