import React, { useState, useEffect } from 'react';
import { Sliders, Save, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

export default function PolicySettings() {
  const [config, setConfig] = useState({
    cancellation_window_hours: '2',
    refund_percentage: '90',
    hold_duration_seconds: '300',
    convenience_fee_per_ticket: '1.50',
    tax_percentage: '8.25',
    cinema_name: 'CineSphere Grand Multiplex'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const res = await api.getConfig();
        if (res.success) {
          setConfig((prev) => ({ ...prev, ...res.config }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateConfig(config);
      setSuccessMsg('System configuration and booking policies saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white font-['Outfit'] flex items-center gap-2">
          <Sliders className="w-5 h-5 text-amber-400" />
          <span>Booking Policies & System Parameters</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Tune seat lock expiration timers, cancellation policies, refund rates, and service fees.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-5 text-xs">
        <div>
          <label className="block text-zinc-300 font-bold mb-1">Cinema Enterprise Brand Name</label>
          <input
            type="text"
            value={config.cinema_name}
            onChange={(e) => setConfig({ ...config, cinema_name: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm focus:border-amber-500"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-zinc-800/80">
          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              Cancellation Cutoff Window (Hours)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={config.cancellation_window_hours}
              onChange={(e) => setConfig({ ...config, cancellation_window_hours: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm focus:border-amber-500 font-mono"
              required
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Customers can cancel up to this many hours before showtime.
            </p>
          </div>

          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              Refund Percentage (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={config.refund_percentage}
              onChange={(e) => setConfig({ ...config, refund_percentage: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm focus:border-amber-500 font-mono"
              required
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Percentage of ticket base fare refunded on cancellation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-zinc-800/80">
          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              Seat Hold Expiry (Seconds)
            </label>
            <input
              type="number"
              min="30"
              max="1800"
              value={config.hold_duration_seconds}
              onChange={(e) => setConfig({ ...config, hold_duration_seconds: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm focus:border-amber-500 font-mono"
              required
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Defaults to 300s (5 minutes).
            </p>
          </div>

          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              Fee per Ticket ($)
            </label>
            <input
              type="number"
              step="0.25"
              min="0"
              value={config.convenience_fee_per_ticket}
              onChange={(e) => setConfig({ ...config, convenience_fee_per_ticket: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm focus:border-amber-500 font-mono"
              required
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Online convenience charge.
            </p>
          </div>

          <div>
            <label className="block text-zinc-300 font-bold mb-1">
              Sales Tax Rate (%)
            </label>
            <input
              type="number"
              step="0.25"
              min="0"
              value={config.tax_percentage}
              onChange={(e) => setConfig({ ...config, tax_percentage: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-white text-sm focus:border-amber-500 font-mono"
              required
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Calculated on checkout subtotal.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

