# CineSphere | Grand Multiplex Cinema Booking Web Application

A full-stack cinema ticket booking and theater management platform designed for modern multiplex operations. Built with a responsive, high-fidelity dark cinema interface, server-enforced atomic seat locks with countdown expiration, dynamic QR code ticket generation, gatekeeper check-in scanner, configurable cancellation policies with simulated refunds, and real-time executive admin analytics.

---

## 🌟 Key Features & Implementation Overview

### 1. 🎬 Cinema Configuration (Admin & Staff Portal)
- **Movies & Assets Management**: Add, update, and archive movie titles, synopses, runtimes, censor ratings (G, PG, PG-13, R, NC-17), languages, promotional poster & backdrop URLs, and YouTube trailer embeds.
- **Multiplex Venues & Screens**: Multi-theater support (e.g. Downtown IMAX, Westside Multiplex, Apex 4DX) with auditorium details, projection specs (IMAX 3D Laser, Dolby Cinema, 4DX 3D, Laser 2D), and spatial audio configurations (Dolby Atmos 64-Channel, 7.1 Surround).
- **Seat Tiers & Pricing**: Configurable seat tiers (Standard, Premium, VIP Motorized Recliner, Wheelchair Accessible) with base prices and show price multipliers (e.g. Matinee vs. Weekend Prime).
- **Visual Seating Plan Viewer**: Review auditorium seat grids, row letters, seat numbers, and tier layouts.
- **Showtime Scheduler**: Conflict-free scheduling engine with automatic collision detection preventing two shows from overlapping on the same screen.

### 2. 🍿 Customer Discovery
- **Hero Showcase**: Featured blockbuster premiere with backdrop imagery, audio/format badges, trailer previews, and quick-book CTA.
- **Interactive Multi-Filter Ribbon**:
  - **Date Selector**: Browse shows for Today, Tomorrow, and upcoming dates.
  - **Instant Search**: Filter by movie title, actor, or genre.
  - **Venue & Format Filters**: Filter by specific multiplexes or premium formats (IMAX 3D Laser, Dolby Cinema, 4DX 3D, Laser 2D).
- **Rich Movie Cards**: Real-time seat availability tags (*"Available"*, *"Filling Fast"*, *"Sold Out"*) and direct time pills grouped by theater.
- **Movie Details Modal**: Full synopsis, cast information, release metadata, and trailer video player.

### 3. 💺 Seat Selection & Concurrency-Safe Temporary Reservation
- **Curved Cinema Screen**: Curved SVG screen representation with top projection glow.
- **Categorized Tier Seating Map**: Color-coded seat tiers with interactive hover tooltips detailing row, seat number, tier name, and final calculated price.
- **Temporary Seat Locks with Expiration**:
  - When a guest selects seats and proceeds to checkout, the backend atomically acquires a temporary reservation hold with an expiry timestamp (default 5 minutes / 300 seconds).
  - Floating live countdown timer displayed to the user (`Seats Held: 04:59`).
  - Background worker automatically purges expired locks every 10 seconds.
- **Race Condition & Double-Booking Prevention**:
  - ACID-compliant transactional locks in SQLite (`BEGIN IMMEDIATE`).
  - If Customer B attempts to select or reserve a seat held by Customer A, Customer B is immediately rejected with HTTP 409 and a conflict notice (*"Seat(s) E5 are temporarily held by another customer at checkout"*).
  - Unique DB index constraint `UNIQUE(show_id, seat_id)` in `booking_seats` guarantees at the database engine level that two confirmed tickets can never be issued for the same seat and show.

### 4. 💳 Sandboxed Payment & Ticket Issuance
- **Concessions & Concession Add-ons**: Add-on gourmet food & beverages (Jumbo Butter Popcorn, Caramel Popcorn, Loaded Nachos, Large Fountain Sodas, Couple Combos) with real-time price calculation.
- **Itemized Fare Summary**: Base seats subtotal, concessions, configurable convenience fee per ticket, and calculated sales taxes.
- **Simulated Payment Gateway**:
  - Supports simulated Credit/Debit Card, UPI / NetBanking, and Digital Wallets.
  - Test sandbox controls:
    - **Confirm & Pay (Simulate Success)**: Finalizes the transaction, records booking, and issues e-Ticket.
    - **Simulate Failure / Decline**: Triggers bank decline simulation, releases seat locks, and demonstrates graceful error recovery.
- **Boarding Pass e-Ticket**:
  - Digital cinema pass with perforated ticket notches.
  - Scannable dynamic QR Code generated on the fly encoding validation security tokens.
  - Unique Booking Reference (e.g. `CINE-982145`) and Alphanumeric Validation Token (`VAL-XXXXXXXXXXXX`).
  - One-click PDF / Print capability.

### 5. 📱 Gate Staff Check-In Scanner
- **Turnstile Verification Terminal**: Staff can scan or enter a booking reference or QR validation token.
- **Instant Gate Status**:
  - 🟢 **VALID TICKET**: Displays movie, screen, seats, guest name, and 1-click **"CHECK IN & ADMIT PATRON"** button.
  - 🟡 **ALREADY ADMITTED**: Displays admission timestamp and staff name who admitted them, preventing reuse of tickets.
  - 🔴 **CANCELLED / REFUNDED**: Flags cancelled tickets and denies turnstile entry.
- **Quick Test Buttons**: One-click demo buttons to simulate scanning Valid, Already Admitted, and Cancelled tickets.

### 6. 🔄 Configurable Cancellation & Simulated Refunds
- **Customer Booking History**: View past, confirmed, checked-in, and cancelled reservations.
- **Configurable Cancellation Policy**:
  - Admin-configurable cancellation cutoff window (e.g. allowed up to 2 hours before showtime).
  - Configurable refund percentage (e.g. 90% refund on ticket fare + 100% on unused concessions).
- **Simulated Refund Processing**: Calculates refund amount, issues refund transaction ID (`REF_SIM_XXXXX`), marks status as `CANCELLED`, and immediately releases the seats back into the available pool for other customers.

### 7. 📊 Executive Operations & Sales Dashboard
- **Key KPIs**: Total Net Box Office Revenue, Total Tickets Issued, Active Scheduled Shows, Total Cancellations & Refunds.
- **Screen Occupancy Progress**: Visual capacity utilization bars per auditorium.
- **Box Office by Title**: Revenue breakdown and ticket velocity per movie.
- **Recent Bookings Audit Log**: Real-time transaction stream with status badges.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4 | Dark cinematic UI, Lucide icons, Canvas Confetti |
| **Backend** | Node.js (v24+), Express 5 | Modular REST API, atomic locking manager, static file server |
| **Database** | Built-in `node:sqlite` (SQLite 3) | ACID transactions (`BEGIN IMMEDIATE`), WAL mode, zero external binary dependency |
| **QR Engine** | `qrcode` | Dynamic high-density QR code data URLs |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v22.5.0 or higher (v24 recommended; includes native `node:sqlite`)
- npm v10+

### Installation & Run
1. Clone or navigate to the project directory:
   ```bash
   cd cinema
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server (runs backend and Vite in parallel):
   ```bash
   npm run dev
   ```
   - **Frontend (Vite)**: `http://localhost:5173`
   - **Backend API**: `http://localhost:5000/api`

4. Or run the production server:
   ```bash
   npm run build
   npm start
   ```
   Open `http://localhost:5000` in your web browser.

---

## 🧪 Automated End-to-End Test Suite

An automated test suite is included that exercises all 10 core requirements:
```bash
node server/test_e2e.js
```
The test suite validates:
1. Movies API & catalog retrieval
2. Shows schedule and screen allocations
3. Live seat availability and category tiers
4. Temporary seat locking with expiration
5. Concurrency lock collision handling (rejection with HTTP 409)
6. Booking confirmation with simulated payment & QR generation
7. Staff QR code validation
8. Patron check-in and admission
9. Duplicate ticket scan detection (ALREADY_CHECKED_IN)
10. Admin analytics and screen occupancy computation

---

## 👥 Reviewer Walkthrough Guide

1. **Customer Journey**:
   - Navigate to `http://localhost:5000`.
   - Browse the featured movie or use the date ribbon and filters.
   - Click **"Select Seats"** on any showtime.
   - Notice the curved screen and tier legend (Standard, Premium, VIP Recliner).
   - Select 2 seats and click **"Lock Seats & Checkout"**.
   - Observe the live countdown timer (`Seats Held: 04:59`).
   - Add a popcorn or beverage concession.
   - Click **"Confirm & Pay"** (or test **"Simulate Failure"** to view graceful decline handling).
   - View your boarding pass e-Ticket with dynamic QR code!

2. **Staff Validation**:
   - On the ticket view, click **"Test Staff Scanner"** (or switch to the **Staff Scanner** tab).
   - Click **"Scan / Validate Ticket"** -> notice the green **VALID TICKET** card.
   - Click **"CHECK IN & ADMIT PATRON"** -> status updates to **ADMITTED**.
   - Click validate again -> notice the amber **ALREADY ADMITTED / USED** warning preventing reuse.

3. **Cancellation & Refund**:
   - Go to the **"My Tickets"** tab.
   - Select a confirmed booking and click **"Cancel & Refund"**.
   - Review the policy terms and calculated refund amount.
   - Click **"Confirm Cancellation"** -> simulated refund transaction ID is issued and seats are instantly freed.

4. **Admin Operations**:
   - Switch to the **"Admin"** tab.
   - View real-time revenue KPIs, occupancy graphs, and recent booking logs.
   - Visit **"Movies & Assets"** to add or edit movies.
   - Visit **"Showtimes & Screens"** to schedule shows with collision protection.
   - Visit **"Policies & Pricing"** to adjust cancellation cutoff hours, refund percentage, or seat hold duration.

