const API_BASE = '/api';

// Persistent Session ID for seat lock tracking
export function getSessionId() {
  let sessionId = sessionStorage.getItem('cinema_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
    sessionStorage.setItem('cinema_session_id', sessionId);
  }
  return sessionId;
}

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Config
  getConfig: () => request('/config'),
  updateConfig: (updates) => request('/config', { method: 'PUT', body: JSON.stringify({ updates }) }),

  // Categories & Concessions
  getCategories: () => request('/categories'),
  getConcessions: () => request('/concessions'),

  // Movies
  getMovies: (all = false) => request(`/movies${all ? '?all=true' : ''}`),
  getMovie: (id) => request(`/movies/${id}`),
  createMovie: (data) => request('/movies', { method: 'POST', body: JSON.stringify(data) }),
  updateMovie: (id, data) => request(`/movies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Theatres & Screens
  getTheatres: () => request('/theatres'),
  createTheatre: (data) => request('/theatres', { method: 'POST', body: JSON.stringify(data) }),
  getScreenLayout: (id) => request(`/screens/${id}/layout`),

  // Shows & Schedules
  getShows: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.date) params.append('date', filters.date);
    if (filters.movieId) params.append('movieId', filters.movieId);
    if (filters.theatreId) params.append('theatreId', filters.theatreId);
    if (filters.format) params.append('format', filters.format);
    const qs = params.toString();
    return request(`/shows${qs ? `?${qs}` : ''}`);
  },
  getShow: (id) => request(`/shows/${id}`),
  createShow: (data) => request('/shows', { method: 'POST', body: JSON.stringify(data) }),
  deleteShow: (id) => request(`/shows/${id}`, { method: 'DELETE' }),

  // Seats & Temporary Holds
  getShowSeats: (showId, sessionId) => request(`/shows/${showId}/seats?session_id=${encodeURIComponent(sessionId)}`),
  holdSeats: (showId, seatIds, sessionId) =>
    request('/bookings/hold', {
      method: 'POST',
      body: JSON.stringify({ showId, seatIds, sessionId }),
    }),
  releaseSeatHold: (showId, seatIds, sessionId) =>
    request('/bookings/release-hold', {
      method: 'POST',
      body: JSON.stringify({ showId, seatIds, sessionId }),
    }),

  // Checkout & Confirmation
  confirmBooking: (bookingData) =>
    request('/bookings/confirm', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    }),

  // Bookings & Cancellation
  getBooking: (reference) => request(`/bookings/${encodeURIComponent(reference)}`),
  cancelBooking: (reference, reason) =>
    request(`/bookings/${encodeURIComponent(reference)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Staff Validation & Admission
  validateTicket: (tokenOrReference) =>
    request('/staff/validate-ticket', {
      method: 'POST',
      body: JSON.stringify({ tokenOrReference }),
    }),
  admitTicket: (bookingId, staffName) =>
    request('/staff/admit-ticket', {
      method: 'POST',
      body: JSON.stringify({ bookingId, staffName }),
    }),

  // Admin Analytics & Reports
  getAnalytics: () => request('/admin/analytics'),
  getAdminBookings: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    const qs = params.toString();
    return request(`/admin/bookings${qs ? `?${qs}` : ''}`);
  },
};

