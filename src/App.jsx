import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import HeroBanner from './components/HeroBanner';
import MovieFilter from './components/MovieFilter';
import MovieCard from './components/MovieCard';
import MovieDetailsModal from './components/MovieDetailsModal';
import SeatSelection from './components/SeatSelection';
import CheckoutModal from './components/CheckoutModal';
import TicketView from './components/TicketView';
import BookingHistory from './components/BookingHistory';
import StaffScanner from './components/StaffScanner';
import AdminPortal from './components/admin/AdminPortal';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('discovery'); // 'discovery', 'history', 'scanner', 'admin'
  const [movies, setMovies] = useState([]);
  const [shows, setShows] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheatre, setSelectedTheatre] = useState('ALL');
  const [selectedFormat, setSelectedFormat] = useState('All Formats');
  const [selectedGenre, setSelectedGenre] = useState('ALL');

  // Interactive Flows
  const [selectedMovieForDetails, setSelectedMovieForDetails] = useState(null);
  const [selectedShow, setSelectedShow] = useState(null);
  const [checkoutData, setCheckoutData] = useState(null);
  const [activeHold, setActiveHold] = useState(null);
  const [viewingTicket, setViewingTicket] = useState(null);
  const [scannerCode, setScannerCode] = useState('');

  // Initial Data Load
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);

        // Generate 5 days range for dates
        const today = new Date();
        const dates = [];
        for (let i = 0; i < 5; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() + i);
          dates.push(d.toISOString().split('T')[0]);
        }
        setAvailableDates(dates);
        setSelectedDate(dates[0]);

        const [mRes, tRes] = await Promise.all([
          api.getMovies(false),
          api.getTheatres()
        ]);

        if (mRes.success) setMovies(mRes.movies);
        if (tRes.success) setTheatres(tRes.theatres);
      } catch (err) {
        console.error('Initialization error', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Load Shows whenever filter criteria change
  useEffect(() => {
    if (!selectedDate) return;

    const loadShows = async () => {
      try {
        const filters = { date: selectedDate };
        if (selectedTheatre !== 'ALL') filters.theatreId = selectedTheatre;
        if (selectedFormat !== 'All Formats') filters.format = selectedFormat;

        const res = await api.getShows(filters);
        if (res.success) {
          setShows(res.shows);
        }
      } catch (err) {
        console.error('Failed to load shows', err);
      }
    };
    loadShows();
  }, [selectedDate, selectedTheatre, selectedFormat]);

  // Extract distinct genres
  const allGenres = useMemo(() => {
    const set = new Set();
    movies.forEach((m) => {
      if (m.genre) {
        m.genre.split(',').forEach((g) => set.add(g.trim()));
      }
    });
    return Array.from(set);
  }, [movies]);

  // Filter movies by search query and genre
  const filteredMovies = useMemo(() => {
    return movies.filter((m) => {
      const matchSearch =
        searchQuery === '' ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.genre.toLowerCase().includes(searchQuery.toLowerCase());

      const matchGenre =
        selectedGenre === 'ALL' ||
        (m.genre && m.genre.toLowerCase().includes(selectedGenre.toLowerCase()));

      return matchSearch && matchGenre;
    });
  }, [movies, searchQuery, selectedGenre]);

  // Featured Movie for Hero Banner
  const featuredMovie = movies.length > 0 ? movies[0] : null;

  // Handlers
  const handleSelectShow = (sh) => {
    setSelectedShow(sh);
    setCheckoutData(null);
    setViewingTicket(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToCheckout = (data) => {
    setCheckoutData(data);
  };

  const handleBookingSuccess = (booking) => {
    setCheckoutData(null);
    setSelectedShow(null);
    setViewingTicket(booking);
    setActiveHold(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenScannerWithToken = (token) => {
    setViewingTicket(null);
    setScannerCode(token);
    setActiveTab('scanner');
  };

  const handleOpenCancellation = (booking) => {
    setViewingTicket(null);
    setActiveTab('history');
  };

  const handleResumeHold = () => {
    if (activeHold?.showId) {
      const found = shows.find((s) => s.id === activeHold.showId);
      if (found) {
        handleSelectShow(found);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-amber-500 selection:text-zinc-950">
      {/* Top Main Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          // If returning to discovery, preserve show selection or clear ticket view
          if (tab !== 'discovery') {
            setViewingTicket(null);
          }
        }}
        activeHold={activeHold}
        onResumeHold={handleResumeHold}
      />

      {/* Main Body Content */}
      <main className="flex-1">
        {/* VIEW 1: CUSTOMER DISCOVERY & SEAT RESERVATION FLOW */}
        {activeTab === 'discovery' && (
          <>
            {/* If a ticket is currently being viewed */}
            {viewingTicket ? (
              <TicketView
                booking={viewingTicket}
                onClose={() => setViewingTicket(null)}
                onOpenScannerWithToken={handleOpenScannerWithToken}
                onOpenCancellation={handleOpenCancellation}
              />
            ) : selectedShow ? (
              /* If in Seat Selection view for a picked show */
              <SeatSelection
                show={selectedShow}
                onBack={() => setSelectedShow(null)}
                onProceedToCheckout={handleProceedToCheckout}
                activeHold={activeHold}
                setActiveHold={setActiveHold}
              />
            ) : (
              /* Browse Movies & Showtimes */
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Hero Featured Premiere */}
                <HeroBanner
                  featuredMovie={featuredMovie}
                  onBookNow={(m) => {
                    // Pick first available show for this movie
                    const firstShow = shows.find((sh) => sh.movie_id === m.id);
                    if (firstShow) handleSelectShow(firstShow);
                    else setSelectedMovieForDetails(m);
                  }}
                  onWatchTrailer={(m) => setSelectedMovieForDetails(m)}
                />

                {/* Filter Ribbon */}
                <MovieFilter
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  availableDates={availableDates}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  selectedTheatre={selectedTheatre}
                  setSelectedTheatre={setSelectedTheatre}
                  theatres={theatres}
                  selectedFormat={selectedFormat}
                  setSelectedFormat={setSelectedFormat}
                  selectedGenre={selectedGenre}
                  setSelectedGenre={setSelectedGenre}
                  genres={allGenres}
                />

                {/* Section Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
                      Now Showing &bull; Daily Showtimes
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Showing {filteredMovies.length} title(s) matching your selections
                    </p>
                  </div>
                </div>

                {/* Movie Cards List */}
                {loading ? (
                  <div className="py-24 text-center text-zinc-500">
                    Loading cinema repertoire...
                  </div>
                ) : filteredMovies.length === 0 ? (
                  <div className="py-20 text-center bg-zinc-900/40 border border-zinc-800 rounded-3xl">
                    <p className="text-sm font-semibold text-zinc-400">
                      No movies found matching "{searchQuery}".
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredMovies.map((movie) => {
                      const movieShows = shows.filter((sh) => sh.movie_id === movie.id);
                      return (
                        <MovieCard
                          key={movie.id}
                          movie={movie}
                          shows={movieShows}
                          onSelectShow={handleSelectShow}
                          onOpenDetails={setSelectedMovieForDetails}
                          onWatchTrailer={setSelectedMovieForDetails}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* VIEW 2: CUSTOMER BOOKING HISTORY & CANCELLATIONS */}
        {activeTab === 'history' && (
          <BookingHistory
            onViewTicket={(b) => setViewingTicket(b)}
            onOpenScanner={handleOpenScannerWithToken}
          />
        )}

        {/* VIEW 3: STAFF TICKET SCANNER & ADMISSION */}
        {activeTab === 'scanner' && (
          <StaffScanner initialCode={scannerCode} />
        )}

        {/* VIEW 4: ADMIN OPERATIONS & ANALYTICS */}
        {activeTab === 'admin' && (
          <AdminPortal />
        )}
      </main>

      {/* Global Modals */}
      {/* 1. Movie Details & Trailer Modal */}
      {selectedMovieForDetails && (
        <MovieDetailsModal
          movie={selectedMovieForDetails}
          onClose={() => setSelectedMovieForDetails(null)}
          onSelectShow={handleSelectShow}
        />
      )}

      {/* 2. Checkout & Concessions Modal */}
      {checkoutData && (
        <CheckoutModal
          checkoutData={checkoutData}
          onClose={() => setCheckoutData(null)}
          onBookingSuccess={handleBookingSuccess}
          activeHold={activeHold}
          setActiveHold={setActiveHold}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-800 bg-zinc-950/80 py-8 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-zinc-300 font-['Outfit']">CINESPHERE GRAND MULTIPLEX</span>
            <span>&bull; Full-Stack Cinema Reservation Engine</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <span>Server-Enforced Seat Locks</span>
            <span>&bull;</span>
            <span>QR Validation Token</span>
            <span>&bull;</span>
            <span>Sandboxed Payment Simulation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

