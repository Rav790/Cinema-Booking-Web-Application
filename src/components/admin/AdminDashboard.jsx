import React, { useState, useEffect } from 'react';
import { DollarSign, Ticket, Users, BarChart3, TrendingUp, Film, Calendar, RefreshCw, CheckCircle2, RotateCcw } from 'lucide-react';
import { api } from '../../services/api';

export default function AdminDashboard({ onSwitchTab }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getAnalytics();
      if (res.success) {
        setAnalytics(res.analytics);
      }
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <div className="py-24 text-center text-zinc-500">Loading cinema analytics...</div>;
  }

  if (!analytics) {
    return <div className="py-24 text-center text-zinc-500">Failed to load analytics data.</div>;
  }

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white font-['Outfit']">
            Executive Operations & Sales Dashboard
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time monitoring of box office revenue, ticket velocity, and screen occupancy rates.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 hover:text-white transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-bold text-zinc-400">Total Net Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ${analytics.totalRevenue.toFixed(2)}
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Includes ticket fare & concessions
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-bold text-zinc-400">Tickets Issued</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {analytics.totalTicketsSold}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 font-medium">
            Across {analytics.totalBookings} customer bookings
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-bold text-zinc-400">Active Shows</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {analytics.activeShowsCount}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 font-medium">
            Scheduled across 4 auditoriums
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase font-bold text-zinc-400">Cancellations</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {analytics.totalCancelled}
          </div>
          <p className="text-[11px] text-rose-300 mt-1 font-mono">
            ${analytics.totalRefunded.toFixed(2)} refunded
          </p>
        </div>
      </div>

      {/* Middle Section: Screen Occupancy Rates & Movie Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Screen Occupancy Rates */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>Screen Occupancy Rates</span>
            </h3>
            <span className="text-xs text-zinc-400">Capacity utilization</span>
          </div>

          <div className="space-y-4">
            {analytics.screenStats.map((sc) => (
              <div key={sc.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-zinc-200">{sc.screen_name}</span>
                    <span className="text-[11px] text-zinc-500 ml-1.5">({sc.theatre_name})</span>
                  </div>
                  <span className="font-mono font-bold text-amber-400">
                    {sc.occupancyRate}% ({sc.booked_seats_count} seats sold)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(5, sc.occupancyRate))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Movie */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Film className="w-4 h-4 text-amber-400" />
              <span>Box Office by Title</span>
            </h3>
            <span className="text-xs text-zinc-400">Gross ticket sales</span>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {analytics.revenueByMovie.map((m) => (
              <div
                key={m.id}
                className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={m.poster_url}
                    alt={m.title}
                    className="w-10 h-14 rounded-lg object-cover flex-shrink-0 border border-zinc-800"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-white truncate">{m.title}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      {m.tickets_sold} tickets across {m.bookings_count} bookings
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="font-mono font-bold text-sm text-amber-400">
                    ${Number(m.total_revenue).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Bookings Audit Log */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Recent Cinema Bookings Audit</h3>
            <p className="text-xs text-zinc-400">Live transaction stream with admission status</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono text-[10px] border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-3">Reference</th>
                <th className="py-2.5 px-3">Movie & Auditorium</th>
                <th className="py-2.5 px-3">Guest</th>
                <th className="py-2.5 px-3">Seats</th>
                <th className="py-2.5 px-3">Total Amount</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-medium">
              {analytics.recentBookings.map((b) => (
                <tr key={b.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-amber-400">
                    {b.booking_reference}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-white truncate max-w-[180px]">{b.movie_title}</div>
                    <div className="text-[11px] text-zinc-500">{b.screen_name}</div>
                  </td>
                  <td className="py-3 px-3 text-zinc-300 truncate max-w-[140px]">
                    {b.customer_name}
                  </td>
                  <td className="py-3 px-3 font-mono text-zinc-300">
                    {b.seats_summary}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-white">
                    ${Number(b.total_amount).toFixed(2)}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        b.booking_status === 'CHECKED_IN'
                          ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                          : b.booking_status === 'CONFIRMED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {b.booking_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

