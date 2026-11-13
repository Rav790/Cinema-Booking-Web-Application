import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Clock, MapPin, AlertCircle, Check, Film } from 'lucide-react';
import { api } from '../../services/api';

export default function ScheduleManager() {
  const [shows, setShows] = useState([]);
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // New Show Form State
  const [selectedMovieId, setSelectedMovieId] = useState('');
  const [selectedTheatreId, setSelectedTheatreId] = useState('');
  const [selectedScreenId, setSelectedScreenId] = useState('');
  const [showDate, setShowDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('16:45');
  const [format, setFormat] = useState('IMAX 3D Laser');
  const [priceMultiplier, setPriceMultiplier] = useState('1.25');

  const loadData = async () => {
    try {
      setLoading(true);
      const [shRes, mRes, tRes] = await Promise.all([
        api.getShows(),
        api.getMovies(true),
        api.getTheatres()
      ]);

      if (shRes.success) setShows(shRes.shows);
      if (mRes.success) {
        setMovies(mRes.movies);
        if (mRes.movies.length > 0) setSelectedMovieId(String(mRes.movies[0].id));
      }
      if (tRes.success) {
        setTheatres(tRes.theatres);
        if (tRes.theatres.length > 0) {
          setSelectedTheatreId(String(tRes.theatres[0].id));
          if (tRes.theatres[0].screens?.length > 0) {
            setSelectedScreenId(String(tRes.theatres[0].screens[0].id));
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When theatre changes, update screens
  useEffect(() => {
    const theatre = theatres.find(t => String(t.id) === String(selectedTheatreId));
    if (theatre && theatre.screens?.length > 0) {
      setSelectedScreenId(String(theatre.screens[0].id));
    }
  }, [selectedTheatreId, theatres]);

  const handleAddShow = async (e) => {
    e.preventDefault();
    try {
      setErrorMsg(null);
      const res = await api.createShow({
        movie_id: parseInt(selectedMovieId, 10),
        theatre_id: parseInt(selectedTheatreId, 10),
        screen_id: parseInt(selectedScreenId, 10),
        show_date: showDate,
        start_time: startTime,
        end_time: endTime,
        format,
        language: 'English',
        price_multiplier: parseFloat(priceMultiplier)
      });

      if (res.success) {
        setSuccessMsg('Showtime scheduled successfully!');
        setShowModal(false);
        loadData();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to schedule showtime.');
    }
  };

  const handleDeleteShow = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled show?')) return;
    try {
      setErrorMsg(null);
      await api.deleteShow(id);
      setSuccessMsg('Showtime removed from schedule.');
      loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Cannot delete show.');
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const currentTheatre = theatres.find(t => String(t.id) === String(selectedTheatreId));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white font-['Outfit']">
            Showtime Scheduler & Screen Allocations
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Schedule movie presentations on multiplex screens with built-in conflict collision prevention.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Schedule New Show</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Shows List */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-zinc-500">Loading schedule...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Show Date & Time</th>
                  <th className="py-3 px-4">Movie</th>
                  <th className="py-3 px-3">Theatre & Auditorium</th>
                  <th className="py-3 px-3">Format</th>
                  <th className="py-3 px-3">Occupancy</th>
                  <th className="py-3 px-3">Price Mult.</th>
                  <th className="py-3 px-4 text-right">Cancel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {shows.map((sh) => (
                  <tr key={sh.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{sh.show_date}</div>
                      <div className="text-[11px] text-amber-400 font-mono">
                        {formatTime(sh.start_time)} - {formatTime(sh.end_time)}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{sh.movie_title}</div>
                      <div className="text-[11px] text-zinc-400">{sh.movie_rating} &bull; {sh.duration_mins}m</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="text-zinc-200 font-semibold">{sh.theatre_name}</div>
                      <div className="text-[11px] text-zinc-400">{sh.screen_name}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-amber-300 font-bold text-[10px] border border-zinc-700">
                        {sh.format}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-mono text-zinc-300">
                        {sh.booked_seats || 0} / {sh.total_seats} seats
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-zinc-300">
                      {sh.price_multiplier}x
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteShow(sh.id)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950/80 hover:text-rose-300 text-zinc-400 transition-colors"
                        title="Delete Show"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Show Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white font-['Outfit'] mb-4">
              Schedule New Movie Showtime
            </h3>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-rose-950 border border-rose-500 text-rose-200 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddShow} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Select Movie</label>
                <select
                  value={selectedMovieId}
                  onChange={(e) => setSelectedMovieId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm"
                  required
                >
                  {movies.map(m => (
                    <option key={m.id} value={m.id}>{m.title} ({m.rating})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Multiplex Theatre</label>
                  <select
                    value={selectedTheatreId}
                    onChange={(e) => setSelectedTheatreId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm"
                    required
                  >
                    {theatres.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Auditorium / Screen</label>
                  <select
                    value={selectedScreenId}
                    onChange={(e) => setSelectedScreenId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm"
                    required
                  >
                    {currentTheatre?.screens?.map(sc => (
                      <option key={sc.id} value={sc.id}>{sc.name} ({sc.screen_type})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    value={showDate}
                    onChange={(e) => setShowDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm"
                  >
                    <option value="IMAX 3D Laser">IMAX 3D Laser</option>
                    <option value="Dolby Cinema">Dolby Cinema</option>
                    <option value="4DX 3D">4DX 3D</option>
                    <option value="Laser 2D">Laser 2D</option>
                    <option value="Standard 2D">Standard 2D</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Price Multiplier</label>
                  <select
                    value={priceMultiplier}
                    onChange={(e) => setPriceMultiplier(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm"
                  >
                    <option value="1.0">1.0x (Standard / Matinee)</option>
                    <option value="1.15">1.15x (Midday / Regular)</option>
                    <option value="1.25">1.25x (Prime Evening)</option>
                    <option value="1.45">1.45x (Weekend Blockbuster)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs"
                >
                  Schedule Showtime
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

