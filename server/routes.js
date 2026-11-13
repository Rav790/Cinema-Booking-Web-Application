import express from 'express';
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { db } from './db.js';
import { acquireSeatHold, releaseSeatHold, cleanExpiredLocks } from './lockManager.js';

const router = express.Router();

// Helper to generate formatted booking reference
function generateBookingRef() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let ref = 'CINE-';
  for (let i = 0; i < 6; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

// ----------------------------------------------------
// 1. SYSTEM CONFIGURATION & POLICIES
// ----------------------------------------------------
router.get('/config', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM system_config').all();
    const config = {};
    rows.forEach(r => config[r.key] = r.value);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/config', (req, res) => {
  try {
    const { updates } = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid config payload' });
    }
    const updateStmt = db.prepare('INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)');
    for (const [key, val] of Object.entries(updates)) {
      updateStmt.run(key, String(val));
    }
    res.json({ success: true, message: 'Configuration updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 2. SEAT CATEGORIES & PRICING
// ----------------------------------------------------
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM seat_categories ORDER BY base_price ASC').all();
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/categories/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, base_price, color, description } = req.body;
    db.prepare(`
      UPDATE seat_categories 
      SET name = COALESCE(?, name),
          base_price = COALESCE(?, base_price),
          color = COALESCE(?, color),
          description = COALESCE(?, description)
      WHERE id = ?
    `).run(name, base_price, color, description, id);
    res.json({ success: true, message: 'Category updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 3. CONCESSIONS (FOOD & BEVERAGES)
// ----------------------------------------------------
router.get('/concessions', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM concessions ORDER BY category, price').all();
    res.json({ success: true, concessions: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 4. THEATRES & SCREENS
// ----------------------------------------------------
router.get('/theatres', (req, res) => {
  try {
    const theatres = db.prepare('SELECT * FROM theatres ORDER BY id').all();
    const screens = db.prepare(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM seats WHERE screen_id = s.id) as total_seats
      FROM screens s
      ORDER BY s.theatre_id, s.name
    `).all();

    const data = theatres.map(t => ({
      ...t,
      screens: screens.filter(sc => sc.theatre_id === t.id)
    }));

    res.json({ success: true, theatres: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/theatres', (req, res) => {
  try {
    const { name, city, address, amenities } = req.body;
    if (!name || !city || !address) {
      return res.status(400).json({ success: false, error: 'Name, city, and address are required' });
    }
    const result = db.prepare('INSERT INTO theatres (name, city, address, amenities) VALUES (?, ?, ?, ?)').run(name, city, address, amenities || '');
    res.json({ success: true, id: Number(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/screens/:id/layout', (req, res) => {
  try {
    const { id } = req.params;
    const screen = db.prepare(`
      SELECT s.*, t.name as theatre_name 
      FROM screens s
      JOIN theatres t ON t.id = s.theatre_id
      WHERE s.id = ?
    `).get(id);

    if (!screen) {
      return res.status(404).json({ success: false, error: 'Screen not found' });
    }

    const seats = db.prepare(`
      SELECT s.*, c.name as category_name, c.base_price, c.color as category_color
      FROM seats s
      JOIN seat_categories c ON c.id = s.category_id
      WHERE s.screen_id = ?
      ORDER BY s.row_label ASC, s.seat_num ASC
    `).all(id);

    res.json({ success: true, screen, seats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 5. MOVIES
// ----------------------------------------------------
router.get('/movies', (req, res) => {
  try {
    const { all } = req.query;
    let query = 'SELECT * FROM movies';
    if (!all) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY id DESC';
    const movies = db.prepare(query).all();
    res.json({ success: true, movies });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/movies/:id', (req, res) => {
  try {
    const { id } = req.params;
    const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(id);
    if (!movie) {
      return res.status(404).json({ success: false, error: 'Movie not found' });
    }

    // Get upcoming shows for this movie
    const today = new Date().toISOString().split('T')[0];
    const shows = db.prepare(`
      SELECT sh.*, t.name as theatre_name, t.city, sc.name as screen_name, sc.screen_type, sc.sound_system,
        (SELECT COUNT(*) FROM seats WHERE screen_id = sc.id) as total_seats,
        (SELECT COUNT(*) FROM booking_seats bs 
         JOIN bookings b ON b.id = bs.booking_id 
         WHERE bs.show_id = sh.id AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN')) as booked_seats
      FROM shows sh
      JOIN theatres t ON t.id = sh.theatre_id
      JOIN screens sc ON sc.id = sh.screen_id
      WHERE sh.movie_id = ? AND sh.show_date >= ?
      ORDER BY sh.show_date ASC, sh.start_time ASC
    `).all(id, today);

    res.json({ success: true, movie, shows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/movies', (req, res) => {
  try {
    const { title, synopsis, duration_mins, genre, rating, language, poster_url, backdrop_url, trailer_url, release_date } = req.body;
    if (!title || !duration_mins || !genre || !rating) {
      return res.status(400).json({ success: false, error: 'Title, duration, genre, and rating are required' });
    }
    const result = db.prepare(`
      INSERT INTO movies (title, synopsis, duration_mins, genre, rating, language, poster_url, backdrop_url, trailer_url, release_date, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      title,
      synopsis || '',
      parseInt(duration_mins, 10),
      genre,
      rating,
      language || 'English',
      poster_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
      backdrop_url || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80',
      trailer_url || '',
      release_date || new Date().toISOString().split('T')[0]
    );

    res.json({ success: true, id: Number(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/movies/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, synopsis, duration_mins, genre, rating, language, poster_url, backdrop_url, trailer_url, release_date, is_active } = req.body;
    db.prepare(`
      UPDATE movies SET
        title = COALESCE(?, title),
        synopsis = COALESCE(?, synopsis),
        duration_mins = COALESCE(?, duration_mins),
        genre = COALESCE(?, genre),
        rating = COALESCE(?, rating),
        language = COALESCE(?, language),
        poster_url = COALESCE(?, poster_url),
        backdrop_url = COALESCE(?, backdrop_url),
        trailer_url = COALESCE(?, trailer_url),
        release_date = COALESCE(?, release_date),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(title, synopsis, duration_mins, genre, rating, language, poster_url, backdrop_url, trailer_url, release_date, is_active, id);

    res.json({ success: true, message: 'Movie updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 6. SHOWTIMES & SCHEDULES
// ----------------------------------------------------
router.get('/shows', (req, res) => {
  try {
    const { date, movieId, theatreId, format } = req.query;
    let query = `
      SELECT sh.*, m.title as movie_title, m.poster_url as movie_poster, m.rating as movie_rating, 
             m.duration_mins, m.genre as movie_genre,
             t.name as theatre_name, t.city,
             sc.name as screen_name, sc.screen_type, sc.sound_system,
             (SELECT COUNT(*) FROM seats WHERE screen_id = sc.id) as total_seats,
             (SELECT COUNT(*) FROM booking_seats bs 
              JOIN bookings b ON b.id = bs.booking_id 
              WHERE bs.show_id = sh.id AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN')) as booked_seats
      FROM shows sh
      JOIN movies m ON m.id = sh.movie_id
      JOIN theatres t ON t.id = sh.theatre_id
      JOIN screens sc ON sc.id = sh.screen_id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ' AND sh.show_date = ?';
      params.push(date);
    }
    if (movieId) {
      query += ' AND sh.movie_id = ?';
      params.push(movieId);
    }
    if (theatreId) {
      query += ' AND sh.theatre_id = ?';
      params.push(theatreId);
    }
    if (format) {
      query += ' AND sh.format LIKE ?';
      params.push(`%${format}%`);
    }

    query += ' ORDER BY sh.show_date ASC, sh.start_time ASC';

    const shows = db.prepare(query).all(...params);
    res.json({ success: true, shows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/shows/:id', (req, res) => {
  try {
    const { id } = req.params;
    const show = db.prepare(`
      SELECT sh.*, m.title as movie_title, m.poster_url as movie_poster, m.backdrop_url as movie_backdrop,
             m.rating as movie_rating, m.duration_mins, m.genre as movie_genre, m.synopsis,
             t.name as theatre_name, t.address as theatre_address, t.city,
             sc.name as screen_name, sc.screen_type, sc.sound_system, sc.total_rows, sc.seats_per_row
      FROM shows sh
      JOIN movies m ON m.id = sh.movie_id
      JOIN theatres t ON t.id = sh.theatre_id
      JOIN screens sc ON sc.id = sh.screen_id
      WHERE sh.id = ?
    `).get(id);

    if (!show) {
      return res.status(404).json({ success: false, error: 'Show not found' });
    }

    res.json({ success: true, show });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/shows', (req, res) => {
  try {
    const { movie_id, theatre_id, screen_id, show_date, start_time, end_time, format, language, price_multiplier } = req.body;
    if (!movie_id || !theatre_id || !screen_id || !show_date || !start_time || !end_time || !format) {
      return res.status(400).json({ success: false, error: 'Missing required show fields' });
    }

    // Check for scheduling conflict on the same screen and date
    const conflict = db.prepare(`
      SELECT * FROM shows 
      WHERE screen_id = ? AND show_date = ?
      AND (
        (start_time <= ? AND end_time > ?) OR
        (start_time < ? AND end_time >= ?) OR
        (start_time >= ? AND end_time <= ?)
      )
    `).get(screen_id, show_date, start_time, start_time, end_time, end_time, start_time, end_time);

    if (conflict) {
      return res.status(400).json({
        success: false,
        error: `Scheduling conflict: Screen already has a show from ${conflict.start_time} to ${conflict.end_time} on ${show_date}.`
      });
    }

    const result = db.prepare(`
      INSERT INTO shows (movie_id, theatre_id, screen_id, show_date, start_time, end_time, format, language, price_multiplier)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(movie_id, theatre_id, screen_id, show_date, start_time, end_time, format, language || 'English', price_multiplier || 1.0);

    res.json({ success: true, id: Number(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/shows/:id', (req, res) => {
  try {
    const { id } = req.params;
    // Check if there are confirmed bookings for this show
    const bookings = db.prepare("SELECT count(*) as count FROM bookings WHERE show_id = ? AND booking_status = 'CONFIRMED'").get(id);
    if (bookings.count > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete show: There are ${bookings.count} active confirmed booking(s). Please refund or cancel them first.`
      });
    }

    db.prepare('DELETE FROM shows WHERE id = ?').run(id);
    res.json({ success: true, message: 'Show cancelled and deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 7. SEATS STATUS FOR A SHOW (LIVE LOCKS + CONFIRMED)
// ----------------------------------------------------
router.get('/shows/:id/seats', (req, res) => {
  try {
    const { id } = req.params;
    const { session_id } = req.query;

    cleanExpiredLocks();
    const nowStr = new Date().toISOString();

    const show = db.prepare('SELECT screen_id, price_multiplier FROM shows WHERE id = ?').get(id);
    if (!show) {
      return res.status(404).json({ success: false, error: 'Show not found' });
    }

    const seats = db.prepare(`
      SELECT s.id, s.screen_id, s.seat_label, s.row_label, s.seat_num, s.is_accessible,
             c.id as category_id, c.name as category_name, c.base_price, c.color as category_color,
             ROUND(c.base_price * ?, 2) as final_price
      FROM seats s
      JOIN seat_categories c ON c.id = s.category_id
      WHERE s.screen_id = ?
      ORDER BY s.row_label ASC, s.seat_num ASC
    `).all(show.price_multiplier, show.screen_id);

    // Get confirmed booked seat IDs for this show
    const bookedRows = db.prepare(`
      SELECT bs.seat_id 
      FROM booking_seats bs
      JOIN bookings b ON b.id = bs.booking_id
      WHERE bs.show_id = ? AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN')
    `).all(id);
    const bookedSeatIds = new Set(bookedRows.map(r => r.seat_id));

    // Get active temporary locked seat IDs for this show
    const lockedRows = db.prepare(`
      SELECT seat_id, session_id, expires_at 
      FROM seat_locks
      WHERE show_id = ? AND expires_at > ?
    `).all(id, nowStr);

    const lockedByMe = new Set();
    const lockedByOther = new Set();
    let currentSessionExpiry = null;

    for (const lk of lockedRows) {
      if (session_id && lk.session_id === session_id) {
        lockedByMe.add(lk.seat_id);
        if (!currentSessionExpiry || lk.expires_at > currentSessionExpiry) {
          currentSessionExpiry = lk.expires_at;
        }
      } else {
        lockedByOther.add(lk.seat_id);
      }
    }

    const mappedSeats = seats.map(s => {
      let status = 'AVAILABLE';
      if (bookedSeatIds.has(s.id)) {
        status = 'BOOKED';
      } else if (lockedByMe.has(s.id)) {
        status = 'LOCKED_BY_ME';
      } else if (lockedByOther.has(s.id)) {
        status = 'LOCKED_BY_OTHER';
      }
      return {
        ...s,
        status
      };
    });

    res.json({
      success: true,
      seats: mappedSeats,
      totalSeats: seats.length,
      bookedCount: bookedSeatIds.size,
      lockedByOtherCount: lockedByOther.size,
      lockedByMeCount: lockedByMe.size,
      currentSessionExpiry
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 8. TEMPORARY SEAT HOLDS & EXPIRY
// ----------------------------------------------------
router.post('/bookings/hold', (req, res) => {
  try {
    const { showId, seatIds, sessionId } = req.body;
    if (!showId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0 || !sessionId) {
      return res.status(400).json({ success: false, error: 'showId, seatIds array, and sessionId are required' });
    }

    const holdResult = acquireSeatHold(showId, seatIds, sessionId);
    res.json({ success: true, ...holdResult });
  } catch (err) {
    res.status(409).json({ success: false, error: err.message });
  }
});

router.post('/bookings/release-hold', (req, res) => {
  try {
    const { showId, seatIds, sessionId } = req.body;
    if (!showId || !sessionId) {
      return res.status(400).json({ success: false, error: 'showId and sessionId required' });
    }

    releaseSeatHold(showId, sessionId, seatIds);
    res.json({ success: true, message: 'Seat hold released' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 9. BOOKING CONFIRMATION & PAYMENT SIMULATION
// ----------------------------------------------------
router.post('/bookings/confirm', async (req, res) => {
  try {
    const {
      showId,
      seatIds,
      sessionId,
      customerName,
      customerEmail,
      customerPhone,
      concessions,
      paymentMethod,
      simulateOutcome
    } = req.body;

    if (!showId || !seatIds || !seatIds.length || !sessionId || !customerName || !customerEmail) {
      return res.status(400).json({ success: false, error: 'Missing required booking fields' });
    }

    cleanExpiredLocks();
    const now = new Date();
    const nowStr = now.toISOString();

    // Verify hold: Ensure current session holds ALL requested seats and they haven't expired
    const placeholders = seatIds.map(() => '?').join(',');
    const activeHoldQuery = `
      SELECT seat_id FROM seat_locks 
      WHERE show_id = ? AND session_id = ? AND expires_at > ?
      AND seat_id IN (${placeholders})
    `;
    const heldSeats = db.prepare(activeHoldQuery).all(showId, sessionId, nowStr, ...seatIds);

    if (heldSeats.length !== seatIds.length) {
      return res.status(408).json({
        success: false,
        error: 'Your temporary seat hold has expired or was modified. Please select seats again.'
      });
    }

    // Check payment simulation outcome
    if (simulateOutcome === 'FAIL') {
      // Payment simulated failure: release locks
      releaseSeatHold(showId, sessionId, seatIds);
      return res.status(402).json({
        success: false,
        error: 'Payment declined by issuing bank (Simulated Test). Your seat hold has been released.'
      });
    }

    // Proceed to create booking inside an ACID transaction
    db.exec('BEGIN IMMEDIATE');

    try {
      // Fetch show details
      const show = db.prepare(`
        SELECT sh.*, m.title as movie_title, m.poster_url, t.name as theatre_name, sc.name as screen_name
        FROM shows sh
        JOIN movies m ON m.id = sh.movie_id
        JOIN theatres t ON t.id = sh.theatre_id
        JOIN screens sc ON sc.id = sh.screen_id
        WHERE sh.id = ?
      `).get(showId);

      // Fetch seat details and calculate ticket prices
      const seatsQuery = `
        SELECT s.id, s.seat_label, c.name as category_name, c.base_price,
               ROUND(c.base_price * ?, 2) as final_price
        FROM seats s
        JOIN seat_categories c ON c.id = s.category_id
        WHERE s.id IN (${placeholders})
        ORDER BY s.seat_label
      `;
      const seatDetails = db.prepare(seatsQuery).all(show.price_multiplier, ...seatIds);

      // Verify no duplicate booking exists in booking_seats
      const existingCheck = db.prepare(`
        SELECT count(*) as count FROM booking_seats bs
        JOIN bookings b ON b.id = bs.booking_id
        WHERE bs.show_id = ? AND bs.seat_id IN (${placeholders})
        AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN')
      `).get(showId, ...seatIds);

      if (existingCheck.count > 0) {
        throw new Error('A concurrent booking already confirmed one of these seats.');
      }

      // Calculate totals
      let baseAmount = 0;
      seatDetails.forEach(s => baseAmount += s.final_price);

      let concessionsAmount = 0;
      if (Array.isArray(concessions)) {
        concessions.forEach(item => {
          concessionsAmount += (item.price * item.quantity);
        });
      }

      // System config
      const feeRow = db.prepare("SELECT value FROM system_config WHERE key = 'convenience_fee_per_ticket'").get();
      const taxRow = db.prepare("SELECT value FROM system_config WHERE key = 'tax_percentage'").get();

      const feePerTicket = feeRow ? parseFloat(feeRow.value) : 1.50;
      const taxPct = taxRow ? parseFloat(taxRow.value) : 8.25;

      const convenienceFee = parseFloat((seatIds.length * feePerTicket).toFixed(2));
      const taxableSubtotal = baseAmount + concessionsAmount + convenienceFee;
      const taxAmount = parseFloat(((taxableSubtotal * taxPct) / 100).toFixed(2));
      const totalAmount = parseFloat((taxableSubtotal + taxAmount).toFixed(2));

      // Generate Reference & Token
      const bookingRef = generateBookingRef();
      const validationToken = 'VAL-' + crypto.randomBytes(6).toString('hex').toUpperCase();
      const paymentTxnId = 'TXN_SIM_' + crypto.randomBytes(5).toString('hex').toUpperCase();

      const seatLabels = seatDetails.map(s => `${s.seat_label} (${s.category_name})`).join(', ');

      const insertBookingStmt = db.prepare(`
        INSERT INTO bookings (
          booking_reference, validation_token, show_id, customer_name, customer_email, customer_phone,
          seats_summary, total_seats, base_amount, concessions_amount, concessions_json,
          convenience_fee, tax_amount, total_amount, payment_method, payment_status, payment_txn_id,
          booking_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const bookingRes = insertBookingStmt.run(
        bookingRef,
        validationToken,
        showId,
        customerName,
        customerEmail,
        customerPhone || '',
        seatLabels,
        seatIds.length,
        baseAmount,
        concessionsAmount,
        concessions ? JSON.stringify(concessions) : null,
        convenienceFee,
        taxAmount,
        totalAmount,
        paymentMethod || 'Credit Card (Simulated)',
        'PAID',
        paymentTxnId,
        'CONFIRMED',
        nowStr
      );

      const bookingId = Number(bookingRes.lastInsertRowid);

      // Insert into booking_seats
      const insertSeatStmt = db.prepare(`
        INSERT INTO booking_seats (booking_id, show_id, seat_id, price_paid)
        VALUES (?, ?, ?, ?)
      `);
      for (const s of seatDetails) {
        insertSeatStmt.run(bookingId, showId, s.id, s.final_price);
      }

      // Clear locks
      db.prepare('DELETE FROM seat_locks WHERE show_id = ? AND session_id = ?').run(showId, sessionId);

      db.exec('COMMIT');

      // Generate QR Code data URL containing validation verification payload
      const qrPayload = JSON.stringify({
        ref: bookingRef,
        token: validationToken,
        movie: show.movie_title,
        showId,
        seats: seatDetails.map(s => s.seat_label),
        customer: customerName
      });
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 280,
        margin: 2,
        color: { dark: '#09090b', light: '#ffffff' }
      });

      res.json({
        success: true,
        booking: {
          id: bookingId,
          reference: bookingRef,
          validationToken,
          customerName,
          customerEmail,
          seatsSummary: seatLabels,
          totalSeats: seatIds.length,
          baseAmount,
          concessionsAmount,
          convenienceFee,
          taxAmount,
          totalAmount,
          paymentMethod,
          paymentTxnId,
          status: 'CONFIRMED',
          qrDataUrl,
          movieTitle: show.movie_title,
          posterUrl: show.poster_url,
          theatreName: show.theatre_name,
          screenName: show.screen_name,
          showDate: show.show_date,
          startTime: show.start_time,
          format: show.format,
          concessions: concessions || []
        }
      });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 10. BOOKING LOOKUP & CANCELLATION
// ----------------------------------------------------
router.get('/bookings/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const booking = db.prepare(`
      SELECT b.*, 
             sh.show_date, sh.start_time, sh.end_time, sh.format,
             m.title as movie_title, m.poster_url as movie_poster, m.duration_mins, m.rating as movie_rating,
             t.name as theatre_name, t.address as theatre_address, t.city,
             sc.name as screen_name
      FROM bookings b
      JOIN shows sh ON sh.id = b.show_id
      JOIN movies m ON m.id = sh.movie_id
      JOIN theatres t ON t.id = sh.theatre_id
      JOIN screens sc ON sc.id = sh.screen_id
      WHERE b.booking_reference = ? OR b.validation_token = ?
    `).get(reference, reference);

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking reference not found' });
    }

    // Generate QR code data URL
    const qrPayload = JSON.stringify({
      ref: booking.booking_reference,
      token: booking.validation_token,
      movie: booking.movie_title,
      customer: booking.customer_name
    });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 280,
      margin: 2,
      color: { dark: '#09090b', light: '#ffffff' }
    });

    res.json({
      success: true,
      booking: {
        ...booking,
        qrDataUrl,
        concessions: booking.concessions_json ? JSON.parse(booking.concessions_json) : []
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/bookings/:reference/cancel', (req, res) => {
  try {
    const { reference } = req.params;
    const { reason } = req.body;

    const booking = db.prepare(`
      SELECT b.*, sh.show_date, sh.start_time 
      FROM bookings b
      JOIN shows sh ON sh.id = b.show_id
      WHERE b.booking_reference = ?
    `).get(reference);

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    if (booking.booking_status === 'CANCELLED') {
      return res.status(400).json({ success: false, error: 'Booking has already been cancelled.' });
    }

    if (booking.booking_status === 'CHECKED_IN') {
      return res.status(400).json({ success: false, error: 'Cannot cancel ticket: Customer has already checked in.' });
    }

    // Check cancellation window policy
    const windowHoursRow = db.prepare("SELECT value FROM system_config WHERE key = 'cancellation_window_hours'").get();
    const refundPctRow = db.prepare("SELECT value FROM system_config WHERE key = 'refund_percentage'").get();

    const windowHours = windowHoursRow ? parseFloat(windowHoursRow.value) : 2.0;
    const refundPct = refundPctRow ? parseFloat(refundPctRow.value) : 90.0;

    const showDateTime = new Date(`${booking.show_date}T${booking.start_time}`);
    const now = new Date();
    const diffHours = (showDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < windowHours) {
      return res.status(400).json({
        success: false,
        error: `Cancellation policy error: Tickets can only be cancelled up to ${windowHours} hour(s) before showtime. This show starts in ${diffHours > 0 ? diffHours.toFixed(1) : 0} hour(s).`
      });
    }

    // Calculate refund amount: refund percentage on base amount + 100% on unused concessions
    const refundBase = (booking.base_amount * (refundPct / 100));
    const refundTotal = parseFloat((refundBase + (booking.concessions_amount || 0)).toFixed(2));
    const refundTxnId = 'REF_SIM_' + crypto.randomBytes(5).toString('hex').toUpperCase();
    const cancelTime = now.toISOString();

    db.exec('BEGIN IMMEDIATE');
    try {
      // 1. Release the seats from booking_seats so they are IMMEDIATELY available for new bookings!
      db.prepare('DELETE FROM booking_seats WHERE booking_id = ?').run(booking.id);

      // 2. Update booking record
      db.prepare(`
        UPDATE bookings SET
          booking_status = 'CANCELLED',
          payment_status = 'REFUNDED',
          refund_amount = ?,
          refund_txn_id = ?,
          cancellation_time = ?,
          cancellation_reason = ?
        WHERE id = ?
      `).run(refundTotal, refundTxnId, cancelTime, reason || 'Customer requested cancellation', booking.id);

      db.exec('COMMIT');

      res.json({
        success: true,
        message: 'Booking cancelled successfully. Simulated refund processed.',
        refund: {
          refundAmount: refundTotal,
          refundTxnId,
          refundPercentage: refundPct,
          cancellationTime: cancelTime,
          bookingReference: booking.booking_reference
        }
      });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 11. STAFF QR VALIDATOR & TICKET ADMISSION
// ----------------------------------------------------
router.post('/staff/validate-ticket', (req, res) => {
  try {
    const { tokenOrReference } = req.body;
    if (!tokenOrReference) {
      return res.status(400).json({ success: false, error: 'Validation token or booking reference required' });
    }

    const trimmed = tokenOrReference.trim();
    const booking = db.prepare(`
      SELECT b.*, 
             sh.show_date, sh.start_time, sh.format,
             m.title as movie_title, m.poster_url as movie_poster,
             t.name as theatre_name, sc.name as screen_name
      FROM bookings b
      JOIN shows sh ON sh.id = b.show_id
      JOIN movies m ON m.id = sh.movie_id
      JOIN theatres t ON t.id = sh.theatre_id
      JOIN screens sc ON sc.id = sh.screen_id
      WHERE b.booking_reference = ? OR b.validation_token = ?
    `).get(trimmed, trimmed);

    if (!booking) {
      return res.json({
        success: false,
        valid: false,
        status: 'NOT_FOUND',
        message: 'No booking found matching this code.'
      });
    }

    if (booking.booking_status === 'CANCELLED') {
      return res.json({
        success: true,
        valid: false,
        status: 'CANCELLED',
        message: 'TICKET CANCELLED: This ticket was cancelled and refunded. Entry denied.',
        booking
      });
    }

    if (booking.booking_status === 'CHECKED_IN') {
      return res.json({
        success: true,
        valid: false,
        status: 'ALREADY_CHECKED_IN',
        message: `ALREADY ADMITTED: This ticket was scanned and admitted at ${new Date(booking.check_in_at).toLocaleTimeString()} by ${booking.checked_in_by || 'Staff'}.`,
        booking
      });
    }

    // Otherwise VALID
    res.json({
      success: true,
      valid: true,
      status: 'VALID_CONFIRMED',
      message: 'TICKET VALID: Ready for patron admission.',
      booking
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/staff/admit-ticket', (req, res) => {
  try {
    const { bookingId, staffName } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, error: 'Booking ID required' });
    }

    const now = new Date().toISOString();
    const staff = staffName || 'Gate Staff 01';

    const result = db.prepare(`
      UPDATE bookings 
      SET booking_status = 'CHECKED_IN',
          check_in_at = ?,
          checked_in_by = ?
      WHERE id = ? AND booking_status = 'CONFIRMED'
    `).run(now, staff, bookingId);

    if (result.changes === 0) {
      return res.status(400).json({
        success: false,
        error: 'Ticket could not be admitted. It may already be checked in or cancelled.'
      });
    }

    res.json({
      success: true,
      message: 'Patron admitted successfully!',
      checkInAt: now,
      checkedInBy: staff
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// 12. ADMIN ANALYTICS & TRANSACTIONS OVERVIEW
// ----------------------------------------------------
router.get('/admin/analytics', (req, res) => {
  try {
    // 1. Overall stats
    const stats = db.prepare(`
      SELECT 
        COUNT(CASE WHEN booking_status IN ('CONFIRMED', 'CHECKED_IN') THEN 1 END) as total_bookings,
        COALESCE(SUM(CASE WHEN booking_status IN ('CONFIRMED', 'CHECKED_IN') THEN total_seats END), 0) as total_tickets_sold,
        COALESCE(SUM(CASE WHEN booking_status IN ('CONFIRMED', 'CHECKED_IN') THEN total_amount END), 0) as total_revenue,
        COALESCE(SUM(refund_amount), 0) as total_refunded,
        COUNT(CASE WHEN booking_status = 'CANCELLED' THEN 1 END) as total_cancelled
      FROM bookings
    `).get();

    // 2. Occupancy rates per screen across all scheduled shows
    const screenOccupancy = db.prepare(`
      SELECT sc.id, sc.name as screen_name, sc.screen_type, t.name as theatre_name,
        (SELECT COUNT(*) FROM seats WHERE screen_id = sc.id) as screen_capacity,
        COUNT(DISTINCT sh.id) as active_shows_count,
        COUNT(bs.id) as booked_seats_count
      FROM screens sc
      JOIN theatres t ON t.id = sc.theatre_id
      LEFT JOIN shows sh ON sh.screen_id = sc.id
      LEFT JOIN booking_seats bs ON bs.show_id = sh.id
      GROUP BY sc.id
    `).all();

    const screenStats = screenOccupancy.map(s => {
      const maxPossibleSeats = s.screen_capacity * (s.active_shows_count || 1);
      const occupancyRate = maxPossibleSeats > 0 ? ((s.booked_seats_count / maxPossibleSeats) * 100).toFixed(1) : 0;
      return {
        ...s,
        occupancyRate: parseFloat(occupancyRate)
      };
    });

    // 3. Revenue by movie
    const revenueByMovie = db.prepare(`
      SELECT m.id, m.title, m.poster_url,
        COUNT(DISTINCT b.id) as bookings_count,
        COALESCE(SUM(b.total_amount), 0) as total_revenue,
        COALESCE(SUM(b.total_seats), 0) as tickets_sold
      FROM movies m
      LEFT JOIN shows sh ON sh.movie_id = m.id
      LEFT JOIN bookings b ON b.show_id = sh.id AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN')
      GROUP BY m.id
      ORDER BY total_revenue DESC
    `).all();

    // 4. Recent bookings list
    const recentBookings = db.prepare(`
      SELECT b.*, m.title as movie_title, t.name as theatre_name, sc.name as screen_name,
             sh.show_date, sh.start_time
      FROM bookings b
      JOIN shows sh ON sh.id = b.show_id
      JOIN movies m ON m.id = sh.movie_id
      JOIN theatres t ON t.id = sh.theatre_id
      JOIN screens sc ON sc.id = sh.screen_id
      ORDER BY b.id DESC
      LIMIT 20
    `).all();

    // 5. Total active shows
    const activeShowsCount = db.prepare("SELECT count(*) as count FROM shows WHERE status = 'SCHEDULED'").get().count;

    res.json({
      success: true,
      analytics: {
        totalRevenue: parseFloat(stats.total_revenue.toFixed(2)),
        totalTicketsSold: stats.total_tickets_sold,
        totalBookings: stats.total_bookings,
        totalCancelled: stats.total_cancelled,
        totalRefunded: parseFloat(stats.total_refunded.toFixed(2)),
        activeShowsCount,
        screenStats,
        revenueByMovie,
        recentBookings
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/admin/bookings', (req, res) => {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT b.*, m.title as movie_title, t.name as theatre_name, sc.name as screen_name,
             sh.show_date, sh.start_time
      FROM bookings b
      JOIN shows sh ON sh.id = b.show_id
      JOIN movies m ON m.id = sh.movie_id
      JOIN theatres t ON t.id = sh.theatre_id
      JOIN screens sc ON sc.id = sh.screen_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      query += ' AND b.booking_status = ?';
      params.push(status);
    }

    if (search) {
      query += ` AND (
        b.booking_reference LIKE ? OR 
        b.customer_name LIKE ? OR 
        b.customer_email LIKE ? OR 
        m.title LIKE ?
      )`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY b.id DESC LIMIT 100';

    const bookings = db.prepare(query).all(...params);
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
