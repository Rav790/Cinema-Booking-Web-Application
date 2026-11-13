import React, { useState, useEffect } from 'react';
import { Search, Ticket, Calendar, Clock, MapPin, AlertCircle, CheckCircle2, RotateCcw, X, ExternalLink, QrCode } from 'lucide-react';
import { api } from '../services/api';

export default function BookingHistory({
  onViewTicket,
  onOpenScanner
}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchRef, setSearchRef] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Cancellation modal state
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('Change of schedule');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [refundReceipt, setRefundReceipt] = useState(null);

  // Policy config
  const [policyConfig, setPolicyConfig] = useState({
    cancellation_window_hours: '2',
    refund_percentage: '90'
  });

  const loadBookings = async () => {
    try {
      setLoading(true);
      const [bRes, cRes] = await Promise.all([
        api.getAdminBookings({ status: filterStatus }),
        api.getConfig()
      ]);
      if (bRes.success) setBookings(bRes.bookings);
      if (cRes.success) setPolicyConfig(cRes.config);
    } catch (err) {
      console.error('Failed to load booking history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [filterStatus]);

  // Lookup single reference directly
  const handleDirectLookup = async (e) => {
    e.preventDefault();
    if (!searchRef.trim()) return;

    try {
      setLoading(true);
      const res = await api.getBooking(searchRef.trim());
      if (res.success && res.booking) {
        onViewTicket(res.booking);
      }
    } catch (err) {
      alert(`Booking not found: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Open cancellation preview
  const handleInitiateCancel = (b) => {
    setCancellingBooking(b);
    setCancelError(null);
    setRefundReceipt(null);
  };

  // Execute cancellation & simulated refund
  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    try {
      setCancelLoading(true);
      setCancelError(null);

      const ref = cancellingBooking.booking_reference;
      const res = await api.cancelBooking(ref, cancellationReason);

      if (res.success) {
        setRefundReceipt(res.refund);
        // Refresh bookings list
        loadBookings();
      }
    } catch (err) {
      setCancelError(err.message || 'Cancellation could not be completed.');
    } finally {
      setCancelLoading(false);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
            My Bookings & Tickets
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Review past and upcoming reservations, download tickets, or process simulated refunds.
          </p>
        </div>

        {/* Quick Reference Code Lookup Form */}
        <form onSubmit={handleDirectLookup} className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={searchRef}
            onChange={(e) => setSearchRef(e.target.value)}
            placeholder="Enter reference (e.g. CINE-982145)"
            className="px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            <span>Find</span>
          </button>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-3">
        {['ALL', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === st
                ? 'bg-zinc-800 text-amber-400 border border-zinc-700'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {st === 'ALL' ? 'All Bookings' : st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Bookings Grid / List */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500">Loading booking records...</div>
      ) : bookings.length === 0 ? (
        <div className="py-16 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl">
          <Ticket className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <h3 className="text-base font-bold text-zinc-300">No bookings found</h3>
          <p className="text-xs text-zinc-500 mt-1">Book a movie from the catalog to see your tickets here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookings.map((b) => {
            const isConfirmed = b.booking_status === 'CONFIRMED';
            const isCheckedIn = b.booking_status === 'CHECKED_IN';
            const isCancelled = b.booking_status === 'CANCELLED';

            return (
              <div
                key={b.id}
                className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all shadow-lg flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-black tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      {b.booking_reference}
                    </span>

                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isCheckedIn
                          ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                          : isConfirmed
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {b.booking_status}
                    </span>
                  </div>

                  {/* Movie Info */}
                  <h3 className="text-lg font-black text-white font-['Outfit'] truncate">
                    {b.movie_title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {b.theatre_name} &bull; {b.screen_name}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-zinc-300 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Show Date & Time</span>
                      <span className="font-semibold">{b.show_date} at {formatTime(b.start_time)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Seats</span>
                      <span className="font-semibold text-amber-300 font-mono truncate block">
                        {b.seats_summary}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Guest</span>
                      <span className="font-semibold truncate block">{b.customer_name}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Amount Paid</span>
                      <span className="font-mono font-bold text-white">${Number(b.total_amount).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Refund details if cancelled */}
                  {isCancelled && b.refund_amount > 0 && (
                    <div className="mt-3 p-2.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 flex items-center justify-between">
                      <span>Simulated Refund Processed:</span>
                      <strong className="font-mono">${Number(b.refund_amount).toFixed(2)}</strong>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewTicket(b)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Ticket className="w-3.5 h-3.5 text-amber-400" />
                      <span>View Ticket</span>
                    </button>

                    <button
                      onClick={() => onOpenScanner(b.booking_reference)}
                      className="px-2.5 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900 text-purple-300 text-xs font-medium border border-purple-800/50 transition-colors flex items-center gap-1"
                      title="Test ticket admission in Staff Scanner"
                    >
                      <QrCode className="w-3 h-3" />
                      <span className="hidden sm:inline">Scanner</span>
                    </button>
                  </div>

                  {isConfirmed && (
                    <button
                      onClick={() => handleInitiateCancel(b)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors"
                    >
                      Cancel & Refund
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Modal */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5 text-rose-400">
                <RotateCcw className="w-5 h-5" />
                <h3 className="text-lg font-black font-['Outfit'] text-white">
                  Cancel Reservation & Refund
                </h3>
              </div>
              <button
                onClick={() => setCancellingBooking(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If Refund Complete Receipt */}
            {refundReceipt ? (
              <div className="py-6 space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <h4 className="font-bold text-white text-base">Cancellation Successful!</h4>
                  <p className="text-xs text-emerald-300 mt-1">
                    Your seats have been released back into the ticket pool and a simulated refund has been credited.
                  </p>
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Refund Txn ID:</span>
                    <span className="text-white font-bold">{refundReceipt.refundTxnId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Refund Amount:</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      ${refundReceipt.refundAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Policy Applied:</span>
                    <span className="text-zinc-300">{refundReceipt.refundPercentage}% Ticket Fare Refund</span>
                  </div>
                </div>

                <button
                  onClick={() => setCancellingBooking(null)}
                  className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs"
                >
                  Close Receipt
                </button>
              </div>
            ) : (
              /* Cancellation Confirmation Form */
              <div className="py-4 space-y-4">
                {cancelError && (
                  <div className="p-3.5 rounded-xl bg-rose-950 border border-rose-500 text-rose-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                    <span>{cancelError}</span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1.5">
                  <div className="font-bold text-white text-sm">
                    {cancellingBooking.movie_title}
                  </div>
                  <div className="text-zinc-400">
                    Booking: <span className="font-mono text-amber-400">{cancellingBooking.booking_reference}</span>
                  </div>
                  <div className="text-zinc-400">
                    Seats: <span className="font-semibold text-zinc-200">{cancellingBooking.seats_summary}</span>
                  </div>
                  <div className="text-zinc-400">
                    Showtime: {cancellingBooking.show_date} at {cancellingBooking.start_time}
                  </div>
                </div>

                {/* Policy Notice */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
                  <strong>Cancellation Policy Notice:</strong> Cancellations are permitted up to {policyConfig.cancellation_window_hours} hours prior to showtime. Standard {policyConfig.refund_percentage}% refund will be simulated back to your original payment method. Convenience fees are non-refundable.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Reason for cancellation</label>
                  <select
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white"
                  >
                    <option value="Change of plans / Schedule conflict">Change of plans / Schedule conflict</option>
                    <option value="Booked incorrect showtime or theatre">Booked incorrect showtime or theatre</option>
                    <option value="Personal emergency">Personal emergency</option>
                    <option value="Testing demo cancellation">Testing demo cancellation</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setCancellingBooking(null)}
                    className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold"
                  >
                    Keep Booking
                  </button>

                  <button
                    disabled={cancelLoading}
                    onClick={handleConfirmCancel}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all"
                  >
                    {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

