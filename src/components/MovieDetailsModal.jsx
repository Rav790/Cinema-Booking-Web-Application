import React, { useState, useEffect } from 'react';
import { X, Play, Clock, Film, Calendar, MapPin, Ticket, Star } from 'lucide-react';
import { api } from '../services/api';

export default function MovieDetailsModal({ movie, onClose, onSelectShow }) {
  const [movieData, setMovieData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);

  useEffect(() => {
    if (!movie) return;
    const loadDetails = async () => {
      try {
        setLoading(true);
        const res = await api.getMovie(movie.id);
        if (res.success) {
          setMovieData(res);
        }
      } catch (err) {
        console.error('Failed to load movie details', err);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [movie]);

  if (!movie) return null;

  // Extract YouTube embed URL if available
  const getEmbedUrl = (url) => {
    if (!url) return null;
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    return url;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-zinc-950/80 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center border border-zinc-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Backdrop Banner / Video Player */}
        <div className="relative w-full h-64 sm:h-80 bg-zinc-950 overflow-hidden">
          {showTrailer && movie.trailer_url ? (
            <iframe
              src={getEmbedUrl(movie.trailer_url)}
              title={`${movie.title} Trailer`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <>
              <img
                src={movie.backdrop_url || movie.poster_url}
                alt={movie.title}
                className="w-full h-full object-cover brightness-[0.55]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
              {movie.trailer_url && (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-amber-500/90 hover:bg-amber-400 text-zinc-950 flex items-center justify-center shadow-2xl hover:scale-110 transition-all"
                  title="Play Trailer"
                >
                  <Play className="w-7 h-7 fill-zinc-950 ml-1" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="w-28 sm:w-36 rounded-xl border border-zinc-700 shadow-xl -mt-16 sm:-mt-24 z-10 hidden sm:block object-cover flex-shrink-0"
            />

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-black bg-amber-500 text-zinc-950">
                  {movie.rating}
                </span>
                <span className="text-xs text-zinc-400 bg-zinc-800 px-2.5 py-0.5 rounded border border-zinc-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {movie.duration_mins} mins
                </span>
                <span className="text-xs text-zinc-400 bg-zinc-800 px-2.5 py-0.5 rounded border border-zinc-700">
                  {movie.language}
                </span>
                <span className="text-xs text-zinc-400 bg-zinc-800 px-2.5 py-0.5 rounded border border-zinc-700">
                  Released: {movie.release_date}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white font-['Outfit'] mb-1">
                {movie.title}
              </h2>
              <p className="text-amber-400 text-xs sm:text-sm font-semibold mb-4">
                {movie.genre}
              </p>
              <p className="text-zinc-300 text-sm leading-relaxed mb-6">
                {movie.synopsis}
              </p>
            </div>
          </div>

          {/* Available Showtimes Section */}
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              <span>Available Upcoming Showtimes</span>
            </h3>

            {loading ? (
              <div className="py-8 text-center text-zinc-500">Loading schedule...</div>
            ) : !movieData || !movieData.shows || movieData.shows.length === 0 ? (
              <div className="p-6 rounded-xl bg-zinc-950/60 border border-zinc-800 text-center text-zinc-400">
                No shows currently scheduled for this title.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-2">
                {movieData.shows.map((sh) => (
                  <div
                    key={sh.id}
                    onClick={() => {
                      onClose();
                      onSelectShow(sh);
                    }}
                    className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 hover:border-amber-500/80 cursor-pointer transition-all hover:bg-zinc-900 group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-zinc-200 group-hover:text-amber-400 transition-colors">
                        {sh.theatre_name}
                      </span>
                      <span className="text-[11px] font-black uppercase text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                        {sh.format}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-400 mt-2">
                      <span className="font-semibold text-white">
                        {sh.show_date} &bull; {formatTime(sh.start_time)}
                      </span>
                      <span className="text-emerald-400 text-[11px] font-medium">
                        {sh.total_seats - (sh.booked_seats || 0)} seats left
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

