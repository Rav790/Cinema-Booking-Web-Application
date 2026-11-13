import React, { useState } from 'react';
import { CheckCircle2, QrCode, Printer, Share2, Copy, Check, ArrowRight, ShieldCheck, Ticket, AlertTriangle, X } from 'lucide-react';
import { api } from '../services/api';

export default function TicketView({
  booking,
  onClose,
  onOpenScannerWithToken,
  onOpenCancellation
}) {
  const [copied, setCopied] = useState(false);

  if (!booking) return null;

  const handleCopyRef = () => {
    navigator.clipboard.writeText(booking.reference || booking.booking_reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const bookingRef = booking.reference || booking.booking_reference;
  const validationToken = booking.validationToken || booking.validation_token;
  const movieTitle = booking.movieTitle || booking.movie_title;
  const posterUrl = booking.posterUrl || booking.poster_url || booking.movie_poster;
  const theatreName = booking.theatreName || booking.theatre_name;
  const screenName = booking.screenName || booking.screen_name;
  const showDate = booking.showDate || booking.show_date;
  const startTime = booking.startTime || booking.start_time;
  const seatsSummary = booking.seatsSummary || booking.seats_summary;
  const totalAmount = booking.totalAmount || booking.total_amount;
  const isCheckedIn = booking.booking_status === 'CHECKED_IN' || booking.status === 'CHECKED_IN';
  const isCancelled = booking.booking_status === 'CANCELLED' || booking.status === 'CANCELLED';

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Top Success Banner */}
      {!isCancelled && !isCheckedIn && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-between gap-3 text-emerald-200 shadow-xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="font-extrabold text-sm text-white">Booking Confirmed!</div>
              <div className="text-xs text-emerald-300">Your digital e-Ticket is ready for entry.</div>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-600 text-xs font-semibold text-emerald-100 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      )}

      {/* Ticket Card Container */}
      <div className="relative bg-zinc-900 border border-zinc-700/80 rounded-3xl overflow-hidden shadow-2xl transition-all">
        {/* Ticket Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 p-5 text-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 fill-zinc-950" />
            <span className="font-black tracking-tight text-lg font-['Outfit']">
              CINESPHERE ADMIT ONE
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-950 text-amber-300">
              {isCheckedIn ? 'ADMITTED / SCANNED' : isCancelled ? 'CANCELLED' : 'OFFICIAL PASS'}
            </span>
          </div>
        </div>

        {/* Upper Body: Movie & Show Details */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            {posterUrl && (
              <img
                src={posterUrl}
                alt={movieTitle}
                className="w-20 h-28 rounded-xl object-cover border border-zinc-700 shadow-md flex-shrink-0"
              />
            )}

            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-black text-white font-['Outfit'] truncate">
                {movieTitle}
              </h2>
              <p className="text-xs font-bold text-amber-400 mt-0.5">
                {booking.format || 'IMAX / Dolby'}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[10px]">Date</span>
                  <span className="font-semibold text-zinc-200">{showDate}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[10px]">Time</span>
                  <span className="font-semibold text-zinc-200">{formatTime(startTime)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[10px]">Theatre</span>
                  <span className="font-semibold text-zinc-200 truncate block">{theatreName}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase font-bold text-[10px]">Auditorium</span>
                  <span className="font-semibold text-zinc-200">{screenName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reserved Seats Bar */}
          <div className="mt-5 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Reserved Seats</span>
              <span className="text-sm font-black text-amber-400 font-mono">
                {seatsSummary}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Guest</span>
              <span className="text-xs font-semibold text-zinc-300">
                {booking.customerName || booking.customer_name}
              </span>
            </div>
          </div>
        </div>

        {/* Middle Perforated Divider */}
        <div className="relative my-2">
          <div className="ticket-perforation-left" />
          <div className="ticket-perforation-right" />
          <div className="border-t-2 border-dashed border-zinc-800 mx-5" />
        </div>

        {/* Lower Body: QR Code & Validation Token */}
        <div className="p-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-6 bg-zinc-950/60">
          {/* QR Code Container */}
          <div className="flex flex-col items-center">
            <div className="p-2.5 rounded-2xl bg-white border border-zinc-200 shadow-xl">
              {booking.qrDataUrl ? (
                <img
                  src={booking.qrDataUrl}
                  alt="Ticket Validation QR Code"
                  className="w-36 h-36 object-contain"
                />
              ) : (
                <div className="w-36 h-36 bg-zinc-100 flex items-center justify-center text-zinc-500 text-xs">
                  Generating QR...
                </div>
              )}
            </div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-extrabold mt-2">
              SCAN AT TURNSTILE
            </span>
          </div>

          {/* Code Breakdown & Reference */}
          <div className="flex-1 w-full text-center sm:text-left space-y-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Booking Reference</span>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-0.5">
                <span className="text-lg font-black font-mono text-white tracking-wider">
                  {bookingRef}
                </span>
                <button
                  onClick={handleCopyRef}
                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                  title="Copy Reference"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Validation Token</span>
              <span className="text-xs font-mono text-amber-400 font-semibold block truncate">
                {validationToken}
              </span>
            </div>

            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Total Paid</span>
              <span className="font-mono font-bold text-white text-sm">
                ${Number(totalAmount).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Ticket Footer / Action Bar */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => onOpenScannerWithToken(bookingRef)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-xs font-bold transition-all"
            title="Open ticket in Staff Check-In Scanner to test admission"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Test Staff Scanner &rarr;</span>
          </button>

          {!isCancelled && (
            <button
              onClick={() => onOpenCancellation(booking)}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors"
            >
              Cancel & Request Refund
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

