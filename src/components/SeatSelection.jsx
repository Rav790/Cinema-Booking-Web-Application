import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Clock, Info, ShieldAlert, Sparkles, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { api, getSessionId } from '../services/api';

export default function SeatSelection({
  show,
  onBack,
  onProceedToCheckout,
  activeHold,
  setActiveHold
}) {
  const [seats, setSeats] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [holdingLoading, setHoldingLoading] = useState(false);
  const [hoveredSeat, setHoveredSeat] = useState(null);

  const sessionId = getSessionId();

  // Load seats from backend
  const loadSeats = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const res = await api.getShowSeats(show.id, sessionId);
      if (res.success) {
        setSeats(res.seats);

        // If the backend indicates seats are currently locked by this session, restore them
        const lockedByMeIds = res.seats
          .filter(s => s.status === 'LOCKED_BY_ME')
          .map(s => s.id);

        if (lockedByMeIds.length > 0 && selectedSeatIds.length === 0) {
          setSelectedSeatIds(lockedByMeIds);
        }
      }
    } catch (err) {
      console.error('Failed to load show seats', err);
      setErrorMsg('Failed to load seats. Please try refreshing.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [show.id, sessionId]);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await api.getCategories();
        if (res.success) {
          setCategories(res.categories);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadCategories();
    loadSeats(false);

    // Set up 5s polling to keep locks and bookings synchronized in real-time
    const interval = setInterval(() => {
      loadSeats(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [loadSeats]);

  // Format 12-hour time
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // Toggle seat selection
  const handleSeatClick = (seat) => {
    if (seat.status === 'BOOKED') return;
    if (seat.status === 'LOCKED_BY_OTHER') return;

    setErrorMsg(null);
    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      } else {
        // Max 10 seats per booking
        if (prev.length >= 10) {
          setErrorMsg('You can select a maximum of 10 seats per transaction.');
          return prev;
        }
        return [...prev, seat.id];
      }
    });
  };

  // Group seats by row
  const rowsMap = {};
  seats.forEach((seat) => {
    if (!rowsMap[seat.row_label]) {
      rowsMap[seat.row_label] = [];
    }
    rowsMap[seat.row_label].push(seat);
  });

  // Calculate pricing breakdown
  const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.id));
  const subtotal = selectedSeats.reduce((acc, s) => acc + s.final_price, 0);

  // Acquire Server Lock and Proceed
  const handleProceed = async () => {
    if (selectedSeatIds.length === 0) {
      setErrorMsg('Please select at least one seat to proceed.');
      return;
    }

    try {
      setHoldingLoading(true);
      setErrorMsg(null);

      // Acquire hold on backend
      const res = await api.holdSeats(show.id, selectedSeatIds, sessionId);

      if (res.success) {
        setActiveHold({
          showId: show.id,
          seatIds: selectedSeatIds,
          expiresAt: res.expiresAt,
          holdDurationSeconds: res.holdDurationSeconds
        });

        // Callback to open checkout modal
        onProceedToCheckout({
          show,
          selectedSeats,
          subtotal,
          holdInfo: res
        });
      }
    } catch (err) {
      // Lock conflict / already booked by someone else!
      setErrorMsg(err.message || 'Selected seats could not be held. Please pick different seats.');
      // Refresh seat status immediately
      loadSeats(false);
    } finally {
      setHoldingLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            title="Back to movies"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                {show.movie_title}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-amber-400 font-bold border border-zinc-700">
                {show.format}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {show.theatre_name} &bull; {show.screen_name} &bull; {show.show_date} at <strong className="text-white">{formatTime(show.start_time)}</strong>
            </p>
          </div>
        </div>

        {/* Live Refresh & Indicator */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadSeats(false)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-400 hover:text-white transition-colors"
            title="Refresh live seat status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Live Sync'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert (e.g. Concurrency Lock Conflict) */}
      {errorMsg && (
        <div className="my-4 p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-sm flex items-start gap-3 shadow-lg animate-shake">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Reservation Notice:</span> {errorMsg}
          </div>
        </div>
      )}

      {/* Main Seat Layout & Legend */}
      <div className="my-8 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 sm:p-10 backdrop-blur-md shadow-2xl relative overflow-hidden">
        {/* Curved Screen Graphic */}
        <div className="max-w-2xl mx-auto mb-14 text-center">
          <div className="screen-curve mb-3" />
          <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-extrabold">
            &mdash; ALL EYES THIS WAY &bull; CURVED CINEMA SCREEN &mdash;
          </p>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Loading screen seating plan...</p>
          </div>
        ) : (
          /* Grid of Seats */
          <div className="overflow-x-auto pb-6">
            <div className="min-w-[640px] flex flex-col items-center gap-2.5">
              {Object.keys(rowsMap).map((rowLetter) => {
                const rowSeats = rowsMap[rowLetter];
                const firstSeat = rowSeats[0];
                const categoryName = firstSeat?.category_name;

                return (
                  <div key={rowLetter} className="flex items-center gap-3">
                    {/* Row Label Left */}
                    <span className="w-6 text-center text-xs font-bold text-zinc-500 font-mono">
                      {rowLetter}
                    </span>

                    {/* Seats in this Row */}
                    <div className="flex items-center gap-2">
                      {rowSeats.map((seat, idx) => {
                        const isSelected = selectedSeatIds.includes(seat.id);
                        const isBooked = seat.status === 'BOOKED';
                        const isLockedByOther = seat.status === 'LOCKED_BY_OTHER';
                        const isLockedByMe = seat.status === 'LOCKED_BY_ME';

                        // Insert visual aisle gap in the middle
                        const isMidAisle = idx === Math.floor(rowSeats.length / 2);

                        // Category styling colors
                        let seatBg = 'bg-zinc-800 hover:bg-zinc-700 border-zinc-600 text-zinc-200';
                        if (seat.category_name === 'Standard') {
                          seatBg = 'bg-blue-950/60 hover:bg-blue-900 border-blue-500/40 text-blue-200';
                        } else if (seat.category_name === 'Premium') {
                          seatBg = 'bg-purple-950/60 hover:bg-purple-900 border-purple-500/40 text-purple-200';
                        } else if (seat.category_name === 'VIP Recliner') {
                          seatBg = 'bg-amber-950/60 hover:bg-amber-900 border-amber-500/40 text-amber-200';
                        } else if (seat.is_accessible) {
                          seatBg = 'bg-emerald-950/60 hover:bg-emerald-900 border-emerald-500/40 text-emerald-200';
                        }

                        if (isSelected) {
                          seatBg = 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-zinc-950 font-black shadow-lg shadow-amber-500/30 scale-110 z-10';
                        } else if (isBooked) {
                          seatBg = 'bg-zinc-900/90 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50';
                        } else if (isLockedByOther) {
                          seatBg = 'bg-orange-950/70 border-orange-500/50 text-orange-400 cursor-not-allowed opacity-60 animate-pulse';
                        }

                        return (
                          <React.Fragment key={seat.id}>
                            {isMidAisle && <div className="w-6" />}
                            <button
                              disabled={isBooked || isLockedByOther}
                              onClick={() => handleSeatClick(seat)}
                              onMouseEnter={() => setHoveredSeat(seat)}
                              onMouseLeave={() => setHoveredSeat(null)}
                              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg border text-xs font-bold transition-all flex items-center justify-center relative select-none ${seatBg}`}
                              title={`${seat.seat_label} &bull; ${seat.category_name} &bull; $${seat.final_price.toFixed(2)}`}
                            >
                              {isSelected ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : isBooked ? (
                                <span className="text-[10px] text-zinc-600 font-mono">X</span>
                              ) : isLockedByOther ? (
                                <span className="text-[9px] text-orange-400 font-mono">HOLD</span>
                              ) : (
                                <span className="text-[11px] font-mono">{seat.seat_num}</span>
                              )}
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Row Label Right */}
                    <span className="w-6 text-center text-xs font-bold text-zinc-500 font-mono">
                      {rowLetter}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Hover Info Pill */}
        <div className="h-6 text-center mt-3">
          {hoveredSeat ? (
            <span className="text-xs text-amber-300 font-semibold bg-zinc-950/80 px-3 py-1 rounded-full border border-amber-500/30">
              Seat <strong className="text-white">{hoveredSeat.seat_label}</strong> &bull; {hoveredSeat.category_name} &bull; ${hoveredSeat.final_price.toFixed(2)}
            </span>
          ) : (
            <span className="text-xs text-zinc-500">Hover or click seats to view tier and pricing</span>
          )}
        </div>

        {/* Legend */}
        <div className="mt-8 pt-6 border-t border-zinc-800/80 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border bg-blue-950/60 border-blue-500/50" />
            <span>Standard (${(12.5 * show.price_multiplier).toFixed(2)})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border bg-purple-950/60 border-purple-500/50" />
            <span>Premium (${(18.0 * show.price_multiplier).toFixed(2)})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border bg-amber-950/60 border-amber-500/50" />
            <span>VIP Recliner (${(25.0 * show.price_multiplier).toFixed(2)})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border bg-emerald-950/60 border-emerald-500/50" />
            <span>Accessible</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border bg-amber-500 border-amber-400" />
            <span className="text-amber-400 font-bold">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border bg-orange-950/70 border-orange-500/50" />
            <span>Held (Other User)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border bg-zinc-900 border-zinc-800 opacity-50" />
            <span>Sold / Booked</span>
          </div>
        </div>
      </div>

      {/* Floating Bottom Cart Bar */}
      <div className="sticky bottom-4 z-30 bg-zinc-900/95 border border-zinc-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
              Selected Seats ({selectedSeats.length})
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {selectedSeats.length === 0 ? (
              <span className="text-xs text-zinc-500">No seats chosen yet</span>
            ) : (
              selectedSeats.map((s) => (
                <span
                  key={s.id}
                  className="px-2 py-0.5 rounded text-xs font-bold bg-zinc-800 text-amber-300 border border-zinc-700"
                >
                  {s.seat_label} (${s.final_price.toFixed(2)})
                </span>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-right">
            <span className="text-[11px] text-zinc-400 uppercase font-semibold">Subtotal</span>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              ${subtotal.toFixed(2)}
            </div>
          </div>

          <button
            disabled={selectedSeats.length === 0 || holdingLoading}
            onClick={handleProceed}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm shadow-xl transition-all ${
              selectedSeats.length === 0 || holdingLoading
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/25 transform hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            {holdingLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Locking Seats...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Lock Seats & Checkout</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

