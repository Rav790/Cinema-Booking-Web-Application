import { db } from './db.js';

export function getHoldDurationSeconds() {
  const row = db.prepare("SELECT value FROM system_config WHERE key = 'hold_duration_seconds'").get();
  return row ? parseInt(row.value, 10) : 300;
}

export function cleanExpiredLocks() {
  const now = new Date().toISOString();
  const res = db.prepare('DELETE FROM seat_locks WHERE expires_at <= ?').run(now);
  if (res.changes > 0) {
    // console.log(`[LockManager] Cleaned ${res.changes} expired seat hold(s)`);
  }
}

/**
 * Atomically acquires a hold on a list of seat IDs for a given show and session.
 * Rejects if any seat is already booked or currently locked by another active session.
 */
export function acquireSeatHold(showId, seatIds, sessionId) {
  if (!seatIds || seatIds.length === 0) {
    throw new Error('No seats specified for lock');
  }

  cleanExpiredLocks();
  const now = new Date();
  const holdDuration = getHoldDurationSeconds();
  const expiresAt = new Date(now.getTime() + holdDuration * 1000).toISOString();
  const nowStr = now.toISOString();

  // Run in an explicit transaction
  db.exec('BEGIN IMMEDIATE');

  try {
    const placeholders = seatIds.map(() => '?').join(',');

    // 1. Check if any seat is already confirmed booked
    const bookedQuery = `
      SELECT bs.seat_id, s.seat_label 
      FROM booking_seats bs
      JOIN seats s ON s.id = bs.seat_id
      JOIN bookings b ON b.id = bs.booking_id
      WHERE bs.show_id = ? AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN')
      AND bs.seat_id IN (${placeholders})
    `;
    const bookedSeats = db.prepare(bookedQuery).all(showId, ...seatIds);

    if (bookedSeats.length > 0) {
      const labels = bookedSeats.map(s => s.seat_label).join(', ');
      throw new Error(`Seat(s) ${labels} are already confirmed booked by another customer.`);
    }

    // 2. Check if any seat is held by ANOTHER active session
    const lockedQuery = `
      SELECT sl.seat_id, s.seat_label, sl.expires_at
      FROM seat_locks sl
      JOIN seats s ON s.id = sl.seat_id
      WHERE sl.show_id = ? 
        AND sl.session_id != ? 
        AND sl.expires_at > ?
        AND sl.seat_id IN (${placeholders})
    `;
    const activeLocks = db.prepare(lockedQuery).all(showId, sessionId, nowStr, ...seatIds);

    if (activeLocks.length > 0) {
      const labels = activeLocks.map(s => s.seat_label).join(', ');
      throw new Error(`Seat(s) ${labels} are temporarily held by another customer at checkout. Please choose different seats or try again shortly.`);
    }

    // 3. Clear existing locks for this session on this show (allowing seat re-selection)
    db.prepare('DELETE FROM seat_locks WHERE show_id = ? AND session_id = ?').run(showId, sessionId);

    // 4. Insert new locks
    const insertLock = db.prepare(`
      INSERT INTO seat_locks (show_id, seat_id, session_id, locked_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const seatId of seatIds) {
      insertLock.run(showId, seatId, sessionId, nowStr, expiresAt);
    }

    db.exec('COMMIT');

    return {
      success: true,
      showId,
      seatIds,
      sessionId,
      lockedAt: nowStr,
      expiresAt,
      holdDurationSeconds: holdDuration
    };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/**
 * Releases seats held by this session
 */
export function releaseSeatHold(showId, sessionId, seatIds = null) {
  if (seatIds && seatIds.length > 0) {
    const placeholders = seatIds.map(() => '?').join(',');
    return db.prepare(`DELETE FROM seat_locks WHERE show_id = ? AND session_id = ? AND seat_id IN (${placeholders})`).run(showId, sessionId, ...seatIds);
  } else {
    return db.prepare('DELETE FROM seat_locks WHERE show_id = ? AND session_id = ?').run(showId, sessionId);
  }
}

// Start automatic periodic cleanup interval
setInterval(cleanExpiredLocks, 10000);

