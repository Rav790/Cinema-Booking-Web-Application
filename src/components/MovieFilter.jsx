import React from 'react';
import { Search, Calendar, MapPin, Sparkles } from 'lucide-react';

export default function MovieFilter({
  selectedDate,
  setSelectedDate,
  availableDates,
  searchQuery,
  setSearchQuery,
  selectedTheatre,
  setSelectedTheatre,
  theatres,
  selectedFormat,
  setSelectedFormat,
  selectedGenre,
  setSelectedGenre,
  genres
}) {
  const formats = ['All Formats', 'IMAX 3D Laser', 'Dolby Cinema', '4DX 3D', 'Laser 2D'];

  const formatDateDisplay = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    const dayNum = d.getDate();

    let tag = '';
    if (diffDays === 0) tag = 'Today';
    else if (diffDays === 1) tag = 'Tomorrow';

    return { dayName, monthName, dayNum, tag };
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 mb-8 backdrop-blur-sm shadow-xl">
      {/* Top Row: Date Ribbon */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Select Date</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {availableDates.map((dateStr) => {
            const { dayName, monthName, dayNum, tag } = formatDateDisplay(dateStr);
            const isSelected = selectedDate === dateStr;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[76px] py-2.5 px-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 font-bold'
                    : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600'
                }`}
              >
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-zinc-900' : 'text-amber-400'}`}>
                  {tag || dayName}
                </span>
                <span className="text-lg font-black leading-none my-0.5">{dayNum}</span>
                <span className={`text-[10px] font-medium ${isSelected ? 'text-zinc-800' : 'text-zinc-400'}`}>{monthName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Row: Search, Theatre, Format & Genre Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-zinc-800/80">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies, actors, genre..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/70 border border-zinc-700/70 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Theatre Select */}
        <div className="relative">
          <MapPin className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <select
            value={selectedTheatre}
            onChange={(e) => setSelectedTheatre(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-zinc-950/70 border border-zinc-700/70 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 appearance-none transition-colors"
          >
            <option value="ALL">All Theatres & Multiplexes</option>
            {theatres.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.city})
              </option>
            ))}
          </select>
        </div>

        {/* Format Select */}
        <div>
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-950/70 border border-zinc-700/70 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 appearance-none transition-colors"
          >
            {formats.map((fmt) => (
              <option key={fmt} value={fmt}>
                {fmt}
              </option>
            ))}
          </select>
        </div>

        {/* Genre Select */}
        <div>
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-950/70 border border-zinc-700/70 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 appearance-none transition-colors"
          >
            <option value="ALL">All Genres</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

