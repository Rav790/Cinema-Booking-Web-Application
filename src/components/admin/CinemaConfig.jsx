import React, { useState, useEffect } from 'react';
import { MapPin, Film, Sliders, DollarSign, Check, Edit2 } from 'lucide-react';
import { api } from '../../services/api';

export default function CinemaConfig() {
  const [theatres, setTheatres] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedScreenId, setSelectedScreenId] = useState(null);
  const [screenLayout, setScreenLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tRes, cRes] = await Promise.all([
        api.getTheatres(),
        api.getCategories()
      ]);

      if (tRes.success) {
        setTheatres(tRes.theatres);
        if (tRes.theatres[0]?.screens?.length > 0) {
          setSelectedScreenId(tRes.theatres[0].screens[0].id);
        }
      }
      if (cRes.success) setCategories(cRes.categories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When selectedScreenId changes, load its layout
  useEffect(() => {
    if (!selectedScreenId) return;
    const loadLayout = async () => {
      try {
        const res = await api.getScreenLayout(selectedScreenId);
        if (res.success) {
          setScreenLayout(res);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadLayout();
  }, [selectedScreenId]);

  const handleUpdateCategoryPrice = async (cat) => {
    try {
      const priceNum = parseFloat(newPrice);
      if (isNaN(priceNum) || priceNum <= 0) return;

      await api.updateConfig({}); // verify connection
      await fetch(`/api/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_price: priceNum })
      });

      setSuccessMsg(`Base price for ${cat.name} updated to $${priceNum.toFixed(2)}.`);
      setEditingCategory(null);
      loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert(`Failed to update category: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white font-['Outfit']">
          Cinema Configuration: Theatres, Screens & Seat Tiers
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Multiplex venue definitions, auditorium sound/projection specs, and seat tier base pricing.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Seat Category Base Pricing Grid */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-xl">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-amber-400" />
          <span>Seat Categories & Base Price Tiers</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">{cat.name}</span>
                  <div
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-2 mb-3">
                  {cat.description}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Base Price</span>
                  {editingCategory === cat.id ? (
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        step="0.5"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-20 px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-xs text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateCategoryPrice(cat)}
                        className="p-1 rounded bg-amber-500 text-zinc-950"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-base font-black text-amber-400 font-mono">
                      ${cat.base_price.toFixed(2)}
                    </span>
                  )}
                </div>

                {editingCategory !== cat.id && (
                  <button
                    onClick={() => {
                      setEditingCategory(cat.id);
                      setNewPrice(String(cat.base_price));
                    }}
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                    title="Edit base price"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Theatres & Auditoriums */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-xl">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-400" />
          <span>Theatres & Auditoriums</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {theatres.map((t) => (
            <div
              key={t.id}
              className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between"
            >
              <div>
                <h4 className="font-bold text-white text-sm">{t.name}</h4>
                <p className="text-xs text-amber-400 mt-0.5">{t.city}</p>
                <p className="text-[11px] text-zinc-400 mt-2">{t.address}</p>
                <p className="text-[10px] text-zinc-500 mt-2 italic">{t.amenities}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800 space-y-1.5">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Screens:</span>
                {t.screens?.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => setSelectedScreenId(sc.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${
                      selectedScreenId === sc.id
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span>{sc.name}</span>
                    <span className="font-mono text-[10px] text-zinc-500">{sc.total_seats} seats</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Screen Layout Visualizer */}
      {screenLayout && (
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">
                Seating Layout: {screenLayout.screen.name}
              </h3>
              <p className="text-xs text-zinc-400">
                {screenLayout.screen.screen_type} &bull; {screenLayout.screen.sound_system} &bull; {screenLayout.seats.length} Total Seats
              </p>
            </div>
          </div>

          {/* Mini Seating Map */}
          <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 overflow-x-auto text-center">
            <div className="screen-curve max-w-md mx-auto mb-8" />
            <div className="inline-flex flex-wrap justify-center gap-1.5 max-w-xl mx-auto">
              {screenLayout.seats.map((seat) => (
                <div
                  key={seat.id}
                  className="w-7 h-7 rounded text-[10px] font-bold flex items-center justify-center border font-mono"
                  style={{
                    backgroundColor: `${seat.category_color}25`,
                    borderColor: `${seat.category_color}60`,
                    color: seat.category_color
                  }}
                  title={`${seat.seat_label} (${seat.category_name}) - Base $${seat.base_price.toFixed(2)}`}
                >
                  {seat.seat_label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

