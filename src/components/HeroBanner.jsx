import React from 'react';
import { Play, Ticket, Sparkles, Clock, Star } from 'lucide-react';

export default function HeroBanner({ featuredMovie, onBookNow, onWatchTrailer }) {
  if (!featuredMovie) return null;

  return (
    <div className="relative w-full h-[420px] md:h-[480px] overflow-hidden rounded-3xl mb-10 border border-zinc-800 shadow-2xl">
      {/* Background Backdrop Image */}
      <img
        src={featuredMovie.backdrop_url || featuredMovie.poster_url}
        alt={featuredMovie.title}
        className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.45] scale-105 transform hover:scale-100 transition-transform duration-1000 ease-out"
      />

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent" />

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-6 sm:px-10 flex flex-col justify-end pb-10">
        <div className="max-w-2xl">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-amber-500 text-zinc-950 shadow-md">
              FEATURED PREMIERE
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-zinc-800/80 text-zinc-300 border border-zinc-700">
              {featuredMovie.rating}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              {featuredMovie.duration_mins} mins
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30">
              IMAX 3D Laser &bull; Dolby Atmos
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight font-['Outfit'] mb-3 drop-shadow-md">
            {featuredMovie.title}
          </h1>

          {/* Genre & Synopsis */}
          <p className="text-amber-400/90 text-sm font-semibold mb-2">
            {featuredMovie.genre} &bull; {featuredMovie.language}
          </p>
          <p className="text-zinc-300 text-sm sm:text-base line-clamp-2 sm:line-clamp-3 mb-6 max-w-xl font-normal leading-relaxed">
            {featuredMovie.synopsis}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onBookNow(featuredMovie)}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm shadow-xl shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Ticket className="w-4 h-4 fill-zinc-950" />
              <span>Book Tickets</span>
            </button>

            {featuredMovie.trailer_url && (
              <button
                onClick={() => onWatchTrailer(featuredMovie)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-white font-semibold text-sm border border-zinc-700 backdrop-blur-sm transition-all"
              >
                <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Watch Trailer</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

