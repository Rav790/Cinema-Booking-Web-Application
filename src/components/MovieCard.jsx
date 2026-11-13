import React from 'react';
import { Clock, Star, Play, Ticket, ChevronRight, Sparkles } from 'lucide-react';

export default function MovieCard({ movie, shows, onSelectShow, onOpenDetails, onWatchTrailer }) {
  // Format show time (HH:MM to 12-hour AM/PM)
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // Group shows by Theatre
  const showsByTheatre = {};
  shows.forEach((sh) => {
    if (!showsByTheatre[sh.theatre_name]) {
      showsByTheatre[sh.theatre_name] = [];
    }
    showsByTheatre[sh.theatre_name].push(sh);
  });

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all duration-300 shadow-xl flex flex-col md:flex-row">
      {/* Poster Section */}
      <div className="relative md:w-60 flex-shrink-0 group overflow-hidden bg-zinc-950">
        <img
          src={movie.poster_url}
          alt={movie.title}
          className="w-full h-72 md:h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent md:hidden" />

        {/* Rating & Language Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className="px-2 py-0.5 rounded bg-zinc-900/90 text-amber-400 font-extrabold text-xs border border-zinc-700 backdrop-blur-sm shadow-md">
            {movie.rating}
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-500/90 text-zinc-950 font-black text-[10px] tracking-wider uppercase backdrop-blur-sm shadow-md">
            {movie.language}
          </span>
        </div>

        {/* Trailer button hover overlay */}
        {movie.trailer_url && (
          <button
            onClick={() => onWatchTrailer(movie)}
            className="absolute bottom-3 right-3 md:inset-0 md:m-auto w-12 h-12 rounded-full bg-amber-500/90 hover:bg-amber-400 text-zinc-950 flex items-center justify-center shadow-xl opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110"
            title="Watch Official Trailer"
          >
            <Play className="w-5 h-5 fill-zinc-950 ml-0.5" />
          </button>
        )}
      </div>

      {/* Details & Showtimes Section */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
            <div>
              <h3 
                onClick={() => onOpenDetails(movie)}
                className="text-xl sm:text-2xl font-black text-white hover:text-amber-400 cursor-pointer transition-colors font-['Outfit']"
              >
                {movie.title}
              </h3>
              <p className="text-xs text-amber-400 font-semibold mt-0.5">
                {movie.genre}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-zinc-400 font-medium bg-zinc-800/80 px-2.5 py-1 rounded-md border border-zinc-700">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                {movie.duration_mins} mins
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 mb-5 font-normal">
            {movie.synopsis}
          </p>

          {/* Showtimes by Theatre */}
          <div className="space-y-4">
            {Object.keys(showsByTheatre).length === 0 ? (
              <div className="py-4 px-4 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-center">
                <p className="text-xs text-zinc-500">No scheduled showtimes for the selected filters.</p>
              </div>
            ) : (
              Object.entries(showsByTheatre).map(([theatreName, tShows]) => (
                <div key={theatreName} className="border-t border-zinc-800/60 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                      {theatreName}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {tShows[0]?.screen_name} &bull; {tShows[0]?.sound_system}
                    </span>
                  </div>

                  {/* Showtime Pills */}
                  <div className="flex flex-wrap gap-2">
                    {tShows.map((sh) => {
                      const availableSeats = sh.total_seats - (sh.booked_seats || 0);
                      const isFilling = availableSeats <= 15;
                      const isSoldOut = availableSeats <= 0;

                      return (
                        <button
                          key={sh.id}
                          disabled={isSoldOut}
                          onClick={() => onSelectShow(sh)}
                          className={`group/btn relative px-3.5 py-2 rounded-xl text-left border transition-all ${
                            isSoldOut
                              ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-60'
                              : 'bg-zinc-950/70 hover:bg-amber-500 border-zinc-700/80 hover:border-amber-400 text-zinc-200 hover:text-zinc-950 shadow-md hover:shadow-amber-500/20'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <span>{formatTime(sh.start_time)}</span>
                            <span className="text-[10px] font-extrabold uppercase px-1 py-0.2 rounded bg-zinc-800 group-hover/btn:bg-zinc-950 group-hover/btn:text-amber-300 text-zinc-300">
                              {sh.format.split(' ')[0]}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <span className={`text-[10px] font-medium ${
                              isSoldOut
                                ? 'text-rose-500'
                                : isFilling
                                ? 'text-amber-400 group-hover/btn:text-zinc-900 font-bold'
                                : 'text-emerald-400 group-hover/btn:text-zinc-800'
                            }`}>
                              {isSoldOut ? 'Sold Out' : isFilling ? `${availableSeats} left!` : 'Available'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
          <button
            onClick={() => onOpenDetails(movie)}
            className="text-xs font-semibold text-zinc-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
          >
            <span>View Full Details & Trailer</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {shows.length > 0 && (
            <button
              onClick={() => onSelectShow(shows[0])}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Ticket className="w-3.5 h-3.5 text-amber-400" />
              <span>Select Seats</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

