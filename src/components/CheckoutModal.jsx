import React, { useState, useEffect } from 'react';
import { X, Clock, Plus, Minus, CreditCard, ShieldCheck, AlertCircle, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api, getSessionId } from '../services/api';

export default function CheckoutModal({
  checkoutData,
  onClose,
  onBookingSuccess,
  activeHold,
  setActiveHold
}) {
  const { show, selectedSeats, subtotal } = checkoutData;

  // Form states
  const [customerName, setCustomerName] = useState('Alex Morgan');
  const [customerEmail, setCustomerEmail] = useState('alex.morgan@cinema-demo.com');
  const [customerPhone, setCustomerPhone] = useState('+1 (555) 789-0123');

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState('Credit Card (Simulated)');
  const [cardNumber, setCardNumber] = useState('4242 &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('789');

  // Concessions
  const [concessionsList, setConcessionsList] = useState([]);
  const [selectedConcessions, setSelectedConcessions] = useState({});

  // System config & fee calculations
  const [config, setConfig] = useState({
    convenience_fee_per_ticket: '1.50',
    tax_percentage: '8.25',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [timeLeft, setTimeLeft] = useState('05:00');
  const sessionId = getSessionId();

  // Load Concessions and Config
  useEffect(() => {
    const loadInit = async () => {
      try {
        const [cRes, cfgRes] = await Promise.all([
          api.getConcessions(),
          api.getConfig()
        ]);
        if (cRes.success) setConcessionsList(cRes.concessions);
        if (cfgRes.success) setConfig(cfgRes.config);
      } catch (err) {
        console.error('Failed to load checkout options', err);
      }
    };
    loadInit();
  }, []);

  // Countdown timer for seat lock expiry
  useEffect(() => {
    if (!activeHold?.expiresAt) return;

    const interval = setInterval(() => {
      const remainingMs = new Date(activeHold.expiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft('00:00');
        clearInterval(interval);
        setErrorMsg('Your seat reservation hold has expired. Please select seats again.');
        setActiveHold(null);
      } else {
        const totalSecs = Math.floor(remainingMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setTimeLeft(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeHold, setActiveHold]);

  // Adjust concession quantity
  const handleQuantityChange = (item, delta) => {
    setSelectedConcessions((prev) => {
      const curr = prev[item.id] ? prev[item.id].quantity : 0;
      const next = Math.max(0, curr + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      }
      return {
        ...prev,
        [item.id]: {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: next
        }
      };
    });
  };

  // Calculations
  const seatIds = selectedSeats.map((s) => s.id);
  const concessionsTotal = Object.values(selectedConcessions).reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const feePerTicket = parseFloat(config.convenience_fee_per_ticket || '1.50');
  const taxPct = parseFloat(config.tax_percentage || '8.25');

  const convenienceFee = parseFloat((selectedSeats.length * feePerTicket).toFixed(2));
  const subtotalWithConcessions = subtotal + concessionsTotal + convenienceFee;
  const taxAmount = parseFloat(((subtotalWithConcessions * taxPct) / 100).toFixed(2));
  const grandTotal = parseFloat((subtotalWithConcessions + taxAmount).toFixed(2));

  // Handle Release and Close
  const handleCancelHold = async () => {
    try {
      await api.releaseSeatHold(show.id, seatIds, sessionId);
      setActiveHold(null);
    } catch (err) {
      console.error(err);
    }
    onClose();
  };

  // Process Booking with Simulated Outcome
  const handleProcessPayment = async (outcome = 'SUCCESS') => {
    if (!customerName || !customerEmail) {
      setErrorMsg('Please provide your name and email address.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const concessionsArray = Object.values(selectedConcessions);

      const res = await api.confirmBooking({
        showId: show.id,
        seatIds,
        sessionId,
        customerName,
        customerEmail,
        customerPhone,
        concessions: concessionsArray,
        paymentMethod,
        simulateOutcome: outcome
      });

      if (res.success) {
        // Trigger celebration confetti!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        setActiveHold(null);
        onBookingSuccess(res.booking);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Payment simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
              Complete Your Cinema Booking
            </h2>
            <p className="text-xs text-zinc-400">
              {show.movie_title} &bull; {show.screen_name} &bull; {selectedSeats.length} Seat(s)
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Timer Pill */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono font-bold ${
              timeLeft === '00:00' 
                ? 'bg-rose-950/80 border-rose-500 text-rose-300' 
                : 'bg-amber-500/10 border-amber-500/40 text-amber-400 animate-pulse'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>Held: {timeLeft}</span>
            </div>

            <button
              onClick={handleCancelHold}
              className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center border border-zinc-700 transition-colors"
              title="Release Hold & Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Error Notice */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Section 1: Customer Details */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
              <span>1. Guest Contact Information</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Concessions (F&B Add-ons) */}
          <div className="border-t border-zinc-800 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">
                2. Gourmet Cinema Concessions (Optional)
              </h3>
              <span className="text-xs text-zinc-400">Delivered right to your screen</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {concessionsList.map((item) => {
                const qty = selectedConcessions[item.id]?.quantity || 0;

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      qty > 0
                        ? 'bg-amber-500/10 border-amber-500/50'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-white truncate">{item.name}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{item.description}</div>
                      <div className="text-xs font-mono font-bold text-amber-400 mt-1">
                        ${item.price.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 rounded-lg p-1">
                      <button
                        onClick={() => handleQuantityChange(item, -1)}
                        disabled={qty === 0}
                        className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-mono font-bold text-white">
                        {qty}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item, 1)}
                        className="w-6 h-6 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center font-bold transition-colors"
                      >
                        <Plus className="w-3 h-3 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Simulated Payment Method */}
          <div className="border-t border-zinc-800 pt-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>3. Sandboxed / Simulated Payment Gateway</span>
            </h3>

            {/* Payment Options */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['Credit Card (Simulated)', 'UPI / NetBanking (Simulated)', 'Digital Wallet (Simulated)'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                    paymentMethod === method
                      ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-md shadow-amber-500/20'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {method.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Mock Card Preview Fields */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="flex items-center justify-between mb-3 text-xs text-zinc-400">
                <span className="font-semibold text-white">Mock Test Environment</span>
                <span className="text-emerald-400 flex items-center gap-1 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> 256-bit Simulated Sandbox
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Simulated Card #</label>
                  <input
                    type="text"
                    value={cardNumber}
                    readOnly
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-zinc-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Expiry / CVV</label>
                  <input
                    type="text"
                    value={`${cardExpiry} &bull; ${cardCvc}`}
                    readOnly
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-zinc-300"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Price Summary & Breakdown */}
          <div className="border-t border-zinc-800 pt-5">
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-300">
                <span>Seats Subtotal ({selectedSeats.length} seats: {selectedSeats.map(s => s.seat_label).join(', ')})</span>
                <span className="font-mono font-semibold">${subtotal.toFixed(2)}</span>
              </div>

              {concessionsTotal > 0 && (
                <div className="flex justify-between text-zinc-300">
                  <span>Concessions & Snacks</span>
                  <span className="font-mono font-semibold">${concessionsTotal.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-zinc-400">
                <span>Convenience Fee (${feePerTicket.toFixed(2)} / ticket)</span>
                <span className="font-mono">${convenienceFee.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-zinc-400">
                <span>Taxes & Cinema Surcharge ({taxPct}%)</span>
                <span className="font-mono">${taxAmount.toFixed(2)}</span>
              </div>

              <div className="border-t border-zinc-800 pt-2 flex justify-between items-center text-sm font-extrabold text-white">
                <span>Grand Total Amount</span>
                <span className="text-lg font-mono text-amber-400">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / Sandbox Actions */}
        <div className="p-5 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCancelHold}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            &larr; Release Hold & Back to Seats
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Simulation Button 1: Failure test */}
            <button
              disabled={loading || timeLeft === '00:00'}
              onClick={() => handleProcessPayment('FAIL')}
              className="px-4 py-3 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 text-rose-300 text-xs font-bold transition-all disabled:opacity-40"
              title="Test payment decline and seat release"
            >
              Simulate Failure
            </button>

            {/* Simulation Button 2: Success confirm */}
            <button
              disabled={loading || timeLeft === '00:00'}
              onClick={() => handleProcessPayment('SUCCESS')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 text-sm font-extrabold shadow-xl shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-zinc-950" />
                  <span>Confirm & Pay ${grandTotal.toFixed(2)}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

