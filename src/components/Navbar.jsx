import React, { useState, useEffect } from 'react';
import { Film, Ticket, ShieldCheck, QrCode, Clock, Sparkles } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, activeHold, onResumeHold }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!activeHold || !activeHold.expiresAt) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const remainingMs = new Date(activeHold.expiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft('00:00');
      } else {
        const totalSecs = Math.floor(remainingMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setTimeLeft(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeHold]);

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand */}
        <div 
          onClick={() => setActiveTab('discovery')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-all duration-300">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <Film className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-white font-['Outfit']">
                CINESPHERE
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                PRO
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium hidden sm:block">Grand Multiplex & IMAX Laser</p>
          </div>
        </div>

        {/* Active Hold Countdown Banner (if hold is active) */}
        {activeHold && timeLeft && timeLeft !== '00:00' && (
          <button
            onClick={onResumeHold}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-400 text-xs font-semibold animate-pulse hover:bg-amber-500/20 transition-all"
            title="Click to resume checkout"
          >
            <Clock className="w-4 h-4 text-amber-400 animate-spin" />
            <span>Seats Held: <strong className="text-amber-300 font-mono text-sm">{timeLeft}</strong></span>
            <span className="underline hidden md:inline ml-1 text-zinc-300">Finish Booking &rarr;</span>
          </button>
        )}

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveTab('discovery')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'discovery'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <Film className="w-4 h-4" />
            <span className="hidden sm:inline">Movies & Shows</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span className="hidden sm:inline">My Tickets</span>
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'scanner'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-purple-400 hover:text-purple-300 hover:bg-purple-950/40 border border-purple-500/20'
            }`}
            title="Gate Staff Ticket Scanner & Validator"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Staff Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'admin'
                ? 'bg-zinc-200 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
            }`}
            title="Cinema Admin Operations & Analytics"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

