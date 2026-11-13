import React, { useState, useEffect } from 'react';
import { QrCode, Search, CheckCircle2, AlertTriangle, XCircle, ShieldCheck, UserCheck, ArrowRight, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function StaffScanner({ initialCode }) {
  const [inputCode, setInputCode] = useState(initialCode || '');
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [admitting, setAdmitting] = useState(false);
  const [staffName, setStaffName] = useState('Staff Agent 07 (Gate A)');

  useEffect(() => {
    if (initialCode) {
      setInputCode(initialCode);
      handleValidate(initialCode);
    }
  }, [initialCode]);

  const handleValidate = async (codeToTest = null) => {
    const code = (codeToTest || inputCode).trim();
    if (!code) return;

    try {
      setLoading(true);
      const res = await api.validateTicket(code);
      setValidationResult(res);
    } catch (err) {
      setValidationResult({
        success: false,
        valid: false,
        status: 'ERROR',
        message: err.message || 'Validation request failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdmit = async () => {
    if (!validationResult?.booking?.id) return;
    try {
      setAdmitting(true);
      const res = await api.admitTicket(validationResult.booking.id, staffName);
      if (res.success) {
        // Re-validate to reflect CHECKED_IN status immediately
        await handleValidate();
      }
    } catch (err) {
      alert(`Admission failed: ${err.message}`);
    } finally {
      setAdmitting(false);
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 text-purple-400 mb-1">
          <QrCode className="w-6 h-6" />
          <h1 className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
            Gate Staff Scanner & Ticket Validator
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-zinc-400">
          Simulated gate turnstile terminal. Scan QR codes or enter booking references to admit cinema attendees.
        </p>
      </div>

      {/* Quick Demo Test Buttons */}
      <div className="mb-6 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2.5">
          Reviewer Quick Test Shortcuts (Click to simulate scanning):
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setInputCode('CINE-982145');
              handleValidate('CINE-982145');
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Test Valid Ticket (CINE-982145)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setInputCode('CINE-413902');
              handleValidate('CINE-413902');
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Test Already Admitted Ticket (CINE-413902)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setInputCode('CINE-651873');
              handleValidate('CINE-651873');
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Test Cancelled Ticket (CINE-651873)</span>
          </button>
        </div>
      </div>

      {/* Scanner Input Box */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-8 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-zinc-400 mb-1">
              Validation Token or Booking Reference
            </label>
            <div className="relative">
              <QrCode className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Paste QR payload token or type reference (e.g. CINE-XXXXXX)"
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">
              Gate Staff Station
            </label>
            <input
              type="text"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <button
          onClick={() => handleValidate()}
          disabled={loading || !inputCode.trim()}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
        >
          <Search className="w-4 h-4" />
          <span>{loading ? 'Verifying Code...' : 'Scan / Validate Ticket'}</span>
        </button>
      </div>

      {/* Validation Result Box */}
      {validationResult && (
        <div className="transition-all animate-fadeIn">
          {/* Status 1: VALID_CONFIRMED */}
          {validationResult.status === 'VALID_CONFIRMED' && (
            <div className="bg-emerald-950/70 border-2 border-emerald-500/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-emerald-800/60">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-zinc-950 flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                      VALID TICKET &bull; ADMIT PATRON
                    </h3>
                    <p className="text-xs text-emerald-300 font-semibold mt-0.5">
                      {validationResult.message}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleAdmit}
                  disabled={admitting}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-sm shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-100"
                >
                  <UserCheck className="w-5 h-5 stroke-[2.5]" />
                  <span>{admitting ? 'Admitting...' : 'CHECK IN & ADMIT PATRON'}</span>
                </button>
              </div>

              {/* Booking Snapshot */}
              {validationResult.booking && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 text-xs bg-zinc-950/70 p-4 rounded-2xl border border-emerald-900/60">
                  <div>
                    <span className="text-zinc-500 uppercase font-bold text-[10px] block">Movie</span>
                    <span className="text-sm font-bold text-white block truncate">{validationResult.booking.movie_title}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 uppercase font-bold text-[10px] block">Auditorium</span>
                    <span className="text-sm font-bold text-white block">{validationResult.booking.screen_name}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 uppercase font-bold text-[10px] block">Seats</span>
                    <span className="text-sm font-mono font-bold text-amber-400 block">{validationResult.booking.seats_summary}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 uppercase font-bold text-[10px] block">Attendee</span>
                    <span className="text-sm font-semibold text-zinc-200 block truncate">{validationResult.booking.customer_name}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status 2: ALREADY_CHECKED_IN */}
          {validationResult.status === 'ALREADY_CHECKED_IN' && (
            <div className="bg-amber-950/70 border-2 border-amber-500/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <div className="flex items-center gap-3 pb-4 border-b border-amber-800/60">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-zinc-950 flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                    ALREADY ADMITTED / USED TICKET
                  </h3>
                  <p className="text-xs text-amber-300 font-semibold mt-0.5">
                    {validationResult.message}
                  </p>
                </div>
              </div>

              {validationResult.booking && (
                <div className="mt-4 text-xs text-zinc-300 bg-zinc-950/70 p-4 rounded-xl border border-amber-900/60 space-y-1">
                  <div>Movie: <strong className="text-white">{validationResult.booking.movie_title}</strong></div>
                  <div>Seats: <strong className="text-amber-400 font-mono">{validationResult.booking.seats_summary}</strong></div>
                  <div>Attendee: <strong className="text-white">{validationResult.booking.customer_name}</strong></div>
                  <div>Admission Stamp: <strong className="text-zinc-400">{validationResult.booking.check_in_at}</strong></div>
                </div>
              )}
            </div>
          )}

          {/* Status 3: CANCELLED */}
          {validationResult.status === 'CANCELLED' && (
            <div className="bg-rose-950/70 border-2 border-rose-500/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-zinc-950 flex items-center justify-center shadow-lg">
                  <XCircle className="w-7 h-7 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                    CANCELLED TICKET &bull; ENTRY DENIED
                  </h3>
                  <p className="text-xs text-rose-300 font-semibold mt-0.5">
                    {validationResult.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status 4: NOT_FOUND or ERROR */}
          {(validationResult.status === 'NOT_FOUND' || validationResult.status === 'ERROR') && (
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 text-center">
              <XCircle className="w-10 h-10 text-zinc-500 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-white">Invalid Ticket Code</h3>
              <p className="text-xs text-zinc-400 mt-1">{validationResult.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

