import React, { useState } from 'react';
import { BarChart3, Film, Calendar, Building2, Sliders, ShieldCheck } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import MovieManager from './MovieManager';
import ScheduleManager from './ScheduleManager';
import CinemaConfig from './CinemaConfig';
import PolicySettings from './PolicySettings';

export default function AdminPortal() {
  const [subTab, setSubTab] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Analytics & KPIs', icon: BarChart3 },
    { id: 'movies', label: 'Movies & Assets', icon: Film },
    { id: 'schedule', label: 'Showtimes & Screens', icon: Calendar },
    { id: 'venues', label: 'Venues & Layouts', icon: Building2 },
    { id: 'policies', label: 'Policies & Pricing', icon: Sliders },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Portal Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
              Cinema Management Operations
            </h1>
            <p className="text-xs text-zinc-400">
              Staff & Administrator Central Control Hub
            </p>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = subTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSubTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isCurrent
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'bg-zinc-950/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Sub Tab Content */}
      <div className="min-h-[500px]">
        {subTab === 'dashboard' && <AdminDashboard onSwitchTab={setSubTab} />}
        {subTab === 'movies' && <MovieManager />}
        {subTab === 'schedule' && <ScheduleManager />}
        {subTab === 'venues' && <CinemaConfig />}
        {subTab === 'policies' && <PolicySettings />}
      </div>
    </div>
  );
}

