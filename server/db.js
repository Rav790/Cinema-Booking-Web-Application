import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'cinema.db');

export const db = new DatabaseSync(DB_FILE);

// Enable WAL mode & foreign keys
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seat_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      base_price REAL NOT NULL,
      color TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS concessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      image_url TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS theatres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT NOT NULL,
      amenities TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS screens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      theatre_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      screen_type TEXT NOT NULL,
      sound_system TEXT NOT NULL,
      total_rows INTEGER DEFAULT 8,
      seats_per_row INTEGER DEFAULT 10,
      layout_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (theatre_id) REFERENCES theatres(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      screen_id INTEGER NOT NULL,
      seat_label TEXT NOT NULL,
      row_label TEXT NOT NULL,
      seat_num INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      is_accessible INTEGER DEFAULT 0,
      FOREIGN KEY (screen_id) REFERENCES screens(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES seat_categories(id),
      UNIQUE(screen_id, seat_label)
    );

    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      synopsis TEXT,
      duration_mins INTEGER NOT NULL,
      genre TEXT NOT NULL,
      rating TEXT NOT NULL,
      language TEXT NOT NULL,
      poster_url TEXT,
      backdrop_url TEXT,
      trailer_url TEXT,
      release_date TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      movie_id INTEGER NOT NULL,
      theatre_id INTEGER NOT NULL,
      screen_id INTEGER NOT NULL,
      show_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      format TEXT NOT NULL,
      language TEXT NOT NULL,
      price_multiplier REAL DEFAULT 1.0,
      status TEXT DEFAULT 'SCHEDULED',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
      FOREIGN KEY (theatre_id) REFERENCES theatres(id) ON DELETE CASCADE,
      FOREIGN KEY (screen_id) REFERENCES screens(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS seat_locks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      show_id INTEGER NOT NULL,
      seat_id INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      locked_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE,
      FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE,
      UNIQUE(show_id, seat_id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_reference TEXT UNIQUE NOT NULL,
      validation_token TEXT UNIQUE NOT NULL,
      show_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      seats_summary TEXT NOT NULL,
      total_seats INTEGER NOT NULL,
      base_amount REAL NOT NULL,
      concessions_amount REAL DEFAULT 0.0,
      concessions_json TEXT,
      convenience_fee REAL NOT NULL,
      tax_amount REAL NOT NULL,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      payment_txn_id TEXT,
      booking_status TEXT NOT NULL,
      check_in_at TEXT,
      checked_in_by TEXT,
      cancellation_reason TEXT,
      cancellation_time TEXT,
      refund_amount REAL DEFAULT 0.0,
      refund_txn_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS booking_seats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL,
      show_id INTEGER NOT NULL,
      seat_id INTEGER NOT NULL,
      price_paid REAL NOT NULL,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE,
      FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE,
      UNIQUE(show_id, seat_id)
    );
  `);

  seedDefaultData();
}

function seedDefaultData() {
  const existingConfig = db.prepare('SELECT count(*) as count FROM system_config').get();
  if (existingConfig.count > 0) {
    return; // Already initialized
  }

  console.log('[DB] Seeding initial cinema configuration and realistic data...');

  // 1. System Config
  const configs = [
    { key: 'cancellation_window_hours', value: '2' },
    { key: 'refund_percentage', value: '90' },
    { key: 'hold_duration_seconds', value: '300' }, // 5 mins
    { key: 'convenience_fee_per_ticket', value: '1.50' },
    { key: 'tax_percentage', value: '8.25' },
    { key: 'currency_symbol', value: '$' },
    { key: 'cinema_name', value: 'CineSphere Grand Multiplex' },
  ];

  const insertConfig = db.prepare('INSERT INTO system_config (key, value) VALUES (?, ?)');
  for (const c of configs) {
    insertConfig.run(c.key, c.value);
  }

  // 2. Seat Categories
  const categories = [
    { name: 'Standard', base_price: 12.50, color: '#3b82f6', description: 'Crisp comfort seating in the prime lower section' },
    { name: 'Premium', base_price: 18.00, color: '#8b5cf6', description: 'Extra legroom in the sweet-spot acoustic center' },
    { name: 'VIP Recliner', base_price: 25.00, color: '#f59e0b', description: 'Motorized plush recliners with in-seat table & call service' },
    { name: 'Wheelchair Accessible', base_price: 12.50, color: '#10b981', description: 'Accessible dedicated spaces with companion seating' },
  ];

  const insertCategory = db.prepare('INSERT INTO seat_categories (name, base_price, color, description) VALUES (?, ?, ?, ?)');
  for (const cat of categories) {
    insertCategory.run(cat.name, cat.base_price, cat.color, cat.description);
  }

  // 3. Concessions
  const concessionsList = [
    { name: 'Jumbo Butter Popcorn', category: 'Popcorn', price: 7.50, image_url: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=400&q=80', description: 'Warm freshly popped cinema corn drenched in real golden butter' },
    { name: 'Caramel Crunch Popcorn', category: 'Popcorn', price: 8.50, image_url: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&w=400&q=80', description: 'Handcrafted kettle popcorn coated with deep artisanal caramel' },
    { name: 'Cheesy Fiesta Nachos', category: 'Snacks', price: 6.75, image_url: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=400&q=80', description: 'Crispy stone-ground tortilla chips with warm jalapeño cheese dip' },
    { name: 'Large Fountain Soda', category: 'Beverages', price: 4.50, image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80', description: 'Ice cold refreshing soda (Coca-Cola, Coke Zero, Sprite, Fanta)' },
    { name: 'CineLover Duo Combo', category: 'Combos', price: 14.50, image_url: 'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=400&q=80', description: '1 Jumbo Butter Popcorn + 2 Large Fountain Sodas (Save $2.00!)' },
    { name: 'Movie Candy Pack', category: 'Snacks', price: 4.25, image_url: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?auto=format&fit=crop&w=400&q=80', description: 'Box of assorted gourmet M&Ms, Sour Patch Kids or Twizzlers' },
  ];

  const insertConcession = db.prepare('INSERT INTO concessions (name, category, price, image_url, description) VALUES (?, ?, ?, ?, ?)');
  for (const item of concessionsList) {
    insertConcession.run(item.name, item.category, item.price, item.image_url, item.description);
  }

  // 4. Theatres
  const theatresList = [
    {
      name: 'CineSphere Grand Downtown',
      city: 'Downtown Metro',
      address: '742 Broadway Ave, Entertainment District',
      amenities: 'IMAX Laser 4K, Dolby Atmos, Luxury Leather Recliners, Full Cocktail Bar'
    },
    {
      name: 'Starlight Multiplex & Lounge',
      city: 'Westside Heights',
      address: '109 West Galleria Blvd, Level 3',
      amenities: 'Dolby Cinema, Laser 2D, Gourmet Dining to Seat, Reserved Valet'
    },
    {
      name: 'Apex Cyber 4DX Cinema',
      city: 'Tech Corridor',
      address: '55 Innovation Way, Silicon Square',
      amenities: '4DX Motion & Atmospheric FX, Dual Laser, Arcade & VR Lounge'
    }
  ];

  const insertTheatre = db.prepare('INSERT INTO theatres (name, city, address, amenities) VALUES (?, ?, ?, ?)');
  for (const t of theatresList) {
    insertTheatre.run(t.name, t.city, t.address, t.amenities);
  }

  // 5. Screens & Seats
  // Screen 1: IMAX Laser (Auditorium 1 Downtown) - 8 rows A-H, 10 seats per row = 80 seats
  // Screen 2: Dolby Cinema (Auditorium 2 Downtown) - 7 rows A-G, 10 seats per row = 70 seats
  // Screen 3: Starlight Auditorium 1 (Westside) - 6 rows A-F, 10 seats per row = 60 seats
  // Screen 4: 4DX Immersive (Apex) - 6 rows A-F, 8 seats per row = 48 seats
  const screensList = [
    { theatre_id: 1, name: 'Screen 1 - IMAX with Laser', screen_type: 'IMAX 3D Laser', sound_system: 'IMAX 12-Channel Precision Audio', total_rows: 8, seats_per_row: 10 },
    { theatre_id: 1, name: 'Screen 2 - Dolby Cinema', screen_type: 'Dolby Cinema', sound_system: 'Dolby Atmos 64-Channel Spatial Audio', total_rows: 7, seats_per_row: 10 },
    { theatre_id: 2, name: 'Screen 1 - Prime Lounge', screen_type: 'Laser 2D', sound_system: 'Dolby 7.1 Surround', total_rows: 6, seats_per_row: 10 },
    { theatre_id: 3, name: 'Screen 1 - 4DX Extreme', screen_type: '4DX 3D', sound_system: '4DX Motion & Surround Sound', total_rows: 6, seats_per_row: 8 },
  ];

  const insertScreen = db.prepare('INSERT INTO screens (theatre_id, name, screen_type, sound_system, total_rows, seats_per_row) VALUES (?, ?, ?, ?, ?, ?)');
  const insertSeat = db.prepare('INSERT INTO seats (screen_id, seat_label, row_label, seat_num, category_id, is_accessible) VALUES (?, ?, ?, ?, ?, ?)');

  const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  for (let sIdx = 0; sIdx < screensList.length; sIdx++) {
    const sc = screensList[sIdx];
    const screenRes = insertScreen.run(sc.theatre_id, sc.name, sc.screen_type, sc.sound_system, sc.total_rows, sc.seats_per_row);
    const screenId = Number(screenRes.lastInsertRowid);

    // Populate seats for this screen
    // Rows layout logic:
    // Front rows (A, B): Standard (category 1)
    // Middle rows (C, D, E): Premium (category 2)
    // Back rows (F, G, H): VIP Recliner (category 3)
    // Row A corners (A1, A10 or A8): Wheelchair (category 4)
    for (let r = 0; r < sc.total_rows; r++) {
      const rowLetter = rowLetters[r];
      let catId = 1; // Standard
      if (r >= 2 && r < 5) catId = 2; // Premium
      if (r >= 5) catId = 3; // VIP Recliner

      for (let num = 1; num <= sc.seats_per_row; num++) {
        const label = `${rowLetter}${num}`;
        let isAccess = 0;
        let seatCat = catId;

        // Make A1 and A10 / A8 accessible
        if (rowLetter === 'A' && (num === 1 || num === sc.seats_per_row)) {
          seatCat = 4; // Wheelchair
          isAccess = 1;
        }

        insertSeat.run(screenId, label, rowLetter, num, seatCat, isAccess);
      }
    }
  }

  // 6. Movies
  const moviesList = [
    {
      title: 'Interstellar Odyssey: Beyond Time',
      synopsis: 'A team of explorers travel through a newly discovered cosmic wormhole to find a habitable sanctuary for humanity, uncovering mysteries that defy the laws of space and time.',
      duration_mins: 169,
      genre: 'Sci-Fi, Adventure, Drama',
      rating: 'PG-13',
      language: 'English',
      poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
      backdrop_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
      trailer_url: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
      release_date: '2026-10-15',
      is_active: 1
    },
    {
      title: 'Cyberpunk: Neon Reckoning',
      synopsis: 'In the hyper-electrified sprawl of New Neo Tokyo, an augmented renegade enforcer must bring down a rogue sentient AI cartel before it wipes human memories forever.',
      duration_mins: 142,
      genre: 'Action, Cyberpunk, Thriller',
      rating: 'R',
      language: 'English',
      poster_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
      backdrop_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
      trailer_url: 'https://www.youtube.com/watch?v=8X2kIfS6fb8',
      release_date: '2026-10-28',
      is_active: 1
    },
    {
      title: 'Kingdom of Fire: Dragon Legacy',
      synopsis: 'When an ancient volcano awakens, the last royal dragon rider must unite divided mountain clans to prevent the resurrection of the Primeval Wyrm.',
      duration_mins: 155,
      genre: 'Action, Fantasy, Adventure',
      rating: 'PG-13',
      language: 'English',
      poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
      backdrop_url: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=1200&q=80',
      trailer_url: 'https://www.youtube.com/watch?v=1g3_CFmnU7k',
      release_date: '2026-11-02',
      is_active: 1
    },
    {
      title: 'The Phantom Melody',
      synopsis: 'A brilliant concert pianist discovers a haunted Victorian sheet music manuscript that seems to predict real-world catastrophes whenever its notes are performed.',
      duration_mins: 118,
      genre: 'Mystery, Psychological Thriller',
      rating: 'PG-13',
      language: 'English',
      poster_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
      backdrop_url: 'https://images.unsplash.com/photo-1520523839898-50712825e3a7?auto=format&fit=crop&w=1200&q=80',
      trailer_url: 'https://www.youtube.com/watch?v=TcMBFSGVi1c',
      release_date: '2026-11-08',
      is_active: 1
    },
    {
      title: 'Midnight in Venice',
      synopsis: 'A chance collision along the moonlit Venetian canals sparks an enchanting weekend romance between a starry-eyed architect and a witty art curator on the run.',
      duration_mins: 108,
      genre: 'Romance, Comedy',
      rating: 'PG',
      language: 'English',
      poster_url: 'https://images.unsplash.com/photo-1523906834658-6e2b32c888fe?auto=format&fit=crop&w=600&q=80',
      backdrop_url: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?auto=format&fit=crop&w=1200&q=80',
      trailer_url: 'https://www.youtube.com/watch?v=z02Ie8wKKRg',
      release_date: '2026-10-20',
      is_active: 1
    },
    {
      title: 'Chronicles of the Deep',
      synopsis: 'Deep-sea oceanic research station Mariana-6 detects unprecedented biological seismic signals at 36,000 feet, where daylight has never shone.',
      duration_mins: 124,
      genre: 'Sci-Fi, Horror, Thriller',
      rating: 'R',
      language: 'English',
      poster_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
      backdrop_url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=80',
      trailer_url: 'https://www.youtube.com/watch?v=vM-Bja2Gy04',
      release_date: '2026-11-10',
      is_active: 1
    }
  ];

  const insertMovie = db.prepare(`
    INSERT INTO movies (title, synopsis, duration_mins, genre, rating, language, poster_url, backdrop_url, trailer_url, release_date, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const m of moviesList) {
    insertMovie.run(m.title, m.synopsis, m.duration_mins, m.genre, m.rating, m.language, m.poster_url, m.backdrop_url, m.trailer_url, m.release_date, m.is_active);
  }

  // 7. Shows (Dynamic dates for Today, Tomorrow, and upcoming 4 days!)
  const insertShow = db.prepare(`
    INSERT INTO shows (movie_id, theatre_id, screen_id, show_date, start_time, end_time, format, language, price_multiplier, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = new Date();
  const formatDate = (d) => d.toISOString().split('T')[0];

  const dates = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(formatDate(d));
  }

  const showTemplates = [
    // Today & Future
    { movieId: 1, theatreId: 1, screenId: 1, start: '10:30', end: '13:20', format: 'IMAX 3D Laser', lang: 'English', mult: 1.25 },
    { movieId: 1, theatreId: 1, screenId: 1, start: '14:15', end: '17:05', format: 'IMAX 3D Laser', lang: 'English', mult: 1.35 },
    { movieId: 1, theatreId: 1, screenId: 1, start: '18:30', end: '21:20', format: 'IMAX 3D Laser', lang: 'English', mult: 1.45 },
    { movieId: 1, theatreId: 1, screenId: 1, start: '22:15', end: '01:05', format: 'IMAX 3D Laser', lang: 'English', mult: 1.30 },

    { movieId: 2, theatreId: 1, screenId: 2, start: '11:00', end: '13:25', format: 'Dolby Cinema', lang: 'English', mult: 1.20 },
    { movieId: 2, theatreId: 1, screenId: 2, start: '15:00', end: '17:25', format: 'Dolby Cinema', lang: 'English', mult: 1.30 },
    { movieId: 2, theatreId: 1, screenId: 2, start: '19:15', end: '21:40', format: 'Dolby Cinema', lang: 'English', mult: 1.40 },
    { movieId: 2, theatreId: 1, screenId: 2, start: '22:30', end: '00:55', format: 'Dolby Cinema', lang: 'English', mult: 1.25 },

    { movieId: 3, theatreId: 2, screenId: 3, start: '13:00', end: '15:35', format: 'Laser 2D', lang: 'English', mult: 1.10 },
    { movieId: 3, theatreId: 2, screenId: 3, start: '17:30', end: '20:05', format: 'Laser 2D', lang: 'English', mult: 1.25 },
    { movieId: 4, theatreId: 2, screenId: 3, start: '21:00', end: '23:00', format: 'Laser 2D', lang: 'English', mult: 1.15 },

    { movieId: 2, theatreId: 3, screenId: 4, start: '16:00', end: '18:25', format: '4DX 3D', lang: 'English', mult: 1.50 },
    { movieId: 6, theatreId: 3, screenId: 4, start: '19:45', end: '21:50', format: '4DX 3D', lang: 'English', mult: 1.50 },
    { movieId: 5, theatreId: 2, screenId: 3, start: '10:00', end: '11:50', format: 'Laser 2D', lang: 'English', mult: 1.00 },
  ];

  for (const dateStr of dates) {
    for (const tpl of showTemplates) {
      insertShow.run(tpl.movieId, tpl.theatreId, tpl.screenId, dateStr, tpl.start, tpl.end, tpl.format, tpl.lang, tpl.mult, 'SCHEDULED');
    }
  }

  // 8. Seed some pre-existing Bookings for Demo & Verification
  // Let's create realistic bookings for Show 1 and Show 3
  seedSampleBookings();

  console.log('[DB] Seeding completed successfully.');
}

function seedSampleBookings() {
  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      booking_reference, validation_token, show_id, customer_name, customer_email, customer_phone,
      seats_summary, total_seats, base_amount, concessions_amount, concessions_json,
      convenience_fee, tax_amount, total_amount, payment_method, payment_status, payment_txn_id,
      booking_status, check_in_at, checked_in_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBookingSeat = db.prepare(`
    INSERT INTO booking_seats (booking_id, show_id, seat_id, price_paid)
    VALUES (?, ?, ?, ?)
  `);

  // Sample booking 1: Show 1, Seats D5, D6 (Premium)
  // Let's find seat IDs for screen 1 D5, D6
  const seatD5 = db.prepare("SELECT id FROM seats WHERE screen_id = 1 AND seat_label = 'D5'").get();
  const seatD6 = db.prepare("SELECT id FROM seats WHERE screen_id = 1 AND seat_label = 'D6'").get();
  const seatF4 = db.prepare("SELECT id FROM seats WHERE screen_id = 1 AND seat_label = 'F4'").get();
  const seatF5 = db.prepare("SELECT id FROM seats WHERE screen_id = 1 AND seat_label = 'F5'").get();

  if (seatD5 && seatD6) {
    const res1 = insertBooking.run(
      'CINE-982145',
      'VAL-A872F19E63B0',
      1,
      'Eleanor Vance',
      'eleanor.vance@example.com',
      '+1 (555) 234-5678',
      'D5, D6 (Premium)',
      2,
      45.00,
      14.50,
      JSON.stringify([{ id: 5, name: 'CineLover Duo Combo', qty: 1, price: 14.50 }]),
      3.00,
      5.15,
      67.65,
      'Credit Card (Simulated)',
      'PAID',
      'TXN_SIM_982145001',
      'CONFIRMED',
      null,
      null,
      new Date(Date.now() - 3600000 * 4).toISOString()
    );
    const bId1 = Number(res1.lastInsertRowid);
    insertBookingSeat.run(bId1, 1, seatD5.id, 22.50);
    insertBookingSeat.run(bId1, 1, seatD6.id, 22.50);
  }

  if (seatF4 && seatF5) {
    const res2 = insertBooking.run(
      'CINE-413902',
      'VAL-C901D48A12E7',
      1,
      'Marcus Brody',
      'marcus.brody@example.com',
      '+1 (555) 876-5432',
      'F4, F5 (VIP Recliner)',
      2,
      62.50,
      7.50,
      JSON.stringify([{ id: 1, name: 'Jumbo Butter Popcorn', qty: 1, price: 7.50 }]),
      3.00,
      6.02,
      79.02,
      'UPI / NetBanking (Simulated)',
      'PAID',
      'TXN_SIM_413902002',
      'CHECKED_IN',
      new Date(Date.now() - 3600000).toISOString(),
      'Gate Staff (Agent John)',
      new Date(Date.now() - 3600000 * 8).toISOString()
    );
    const bId2 = Number(res2.lastInsertRowid);
    insertBookingSeat.run(bId2, 1, seatF4.id, 31.25);
    insertBookingSeat.run(bId2, 1, seatF5.id, 31.25);
  }

  // Sample booking 3: Cancelled booking for demo
  const seatB3 = db.prepare("SELECT id FROM seats WHERE screen_id = 1 AND seat_label = 'B3'").get();
  if (seatB3) {
    insertBooking.run(
      'CINE-651873',
      'VAL-B72301FC5499',
      1,
      'David Hassel',
      'david.h@example.com',
      '+1 (555) 345-9871',
      'B3 (Standard)',
      1,
      15.60,
      0.0,
      null,
      1.50,
      1.41,
      18.51,
      'Digital Wallet (Simulated)',
      'REFUNDED',
      'TXN_SIM_651873003',
      'CANCELLED',
      null,
      null,
      new Date(Date.now() - 3600000 * 12).toISOString()
    );
    // Note: since it's cancelled, the seat is NOT in booking_seats so it remains available!
  }
}

