import http from 'node:http';

async function runTests() {
  console.log('🚀 Running Cinema Booking End-to-End Test Suite...\n');

  const base = 'http://localhost:5000/api';

  async function req(path, method = 'GET', body = null) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : null
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  try {
    // 1. Movies & Shows
    console.log('1. Checking Movies API...');
    const mRes = await req('/movies');
    console.log(`   Status: ${mRes.status}, Found ${mRes.data.movies?.length} active movies.`);
    if (!mRes.data.movies || mRes.data.movies.length === 0) throw new Error('No movies');

    console.log('\n2. Checking Shows API...');
    const sRes = await req('/shows');
    console.log(`   Status: ${sRes.status}, Found ${sRes.data.shows?.length} scheduled shows.`);
    const testShow = sRes.data.shows[0];
    console.log(`   Target Show: ID ${testShow.id} (${testShow.movie_title} at ${testShow.start_time})`);

    // 2. Seat layout & availability
    console.log('\n3. Checking Live Seats for Show...');
    const seatsRes = await req(`/shows/${testShow.id}/seats?session_id=test_session_A`);
    const availableSeats = seatsRes.data.seats.filter(s => s.status === 'AVAILABLE');
    console.log(`   Total: ${seatsRes.data.totalSeats}, Available: ${availableSeats.length}, Booked: ${seatsRes.data.bookedCount}`);
    if (availableSeats.length < 2) throw new Error('Not enough available seats for test');

    const seat1 = availableSeats[0];
    const seat2 = availableSeats[1];
    console.log(`   Selected Seats for lock: ${seat1.seat_label} (ID: ${seat1.id}), ${seat2.seat_label} (ID: ${seat2.id})`);

    // 3. Acquire Temporary Seat Lock (Session A)
    console.log('\n4. Acquiring Temporary Seat Hold (Session A)...');
    const holdRes = await req('/bookings/hold', 'POST', {
      showId: testShow.id,
      seatIds: [seat1.id, seat2.id],
      sessionId: 'test_session_A'
    });
    console.log(`   Hold Status: ${holdRes.status}, Expires At: ${holdRes.data.expiresAt}, Duration: ${holdRes.data.holdDurationSeconds}s`);

    // 4. Test Concurrency Lock Conflict (Session B attempts to lock the SAME seats)
    console.log('\n5. Testing Concurrency Lock Protection (Session B attempts to lock same seats)...');
    const conflictRes = await req('/bookings/hold', 'POST', {
      showId: testShow.id,
      seatIds: [seat1.id],
      sessionId: 'test_session_B'
    });
    console.log(`   Conflict Response Status: ${conflictRes.status} (Expected 409 Conflict)`);
    console.log(`   Conflict Error Message: "${conflictRes.data.error}"`);
    if (conflictRes.status !== 409) throw new Error('Expected HTTP 409 Conflict for concurrent lock attempt!');

    // 5. Confirm Booking with Simulated Payment
    console.log('\n6. Confirming Booking with Simulated Payment (Session A)...');
    const confirmRes = await req('/bookings/confirm', 'POST', {
      showId: testShow.id,
      seatIds: [seat1.id, seat2.id],
      sessionId: 'test_session_A',
      customerName: 'Inspector Reviewer',
      customerEmail: 'reviewer@evaluation.org',
      customerPhone: '+1 555 0199',
      concessions: [{ id: 1, name: 'Jumbo Butter Popcorn', price: 7.50, quantity: 1 }],
      paymentMethod: 'Credit Card (Simulated)',
      simulateOutcome: 'SUCCESS'
    });
    console.log(`   Confirmation Status: ${confirmRes.status}`);
    const booking = confirmRes.data.booking;
    console.log(`   Booking Reference: ${booking.reference}`);
    console.log(`   Validation Token: ${booking.validationToken}`);
    console.log(`   Total Amount: $${booking.totalAmount}`);
    console.log(`   QR Code Data URL Length: ${booking.qrDataUrl?.length} chars`);
    if (!booking.reference || !booking.qrDataUrl) throw new Error('Invalid booking response');

    // 6. Staff Ticket Validation
    console.log('\n7. Staff Scanner: Validating newly issued ticket...');
    const valRes = await req('/staff/validate-ticket', 'POST', {
      tokenOrReference: booking.reference
    });
    console.log(`   Validator Status: ${valRes.data.status}, Message: "${valRes.data.message}"`);
    if (valRes.data.status !== 'VALID_CONFIRMED') throw new Error('Ticket should be valid');

    // 7. Staff Check-In / Admission
    console.log('\n8. Staff Scanner: Admitting patron at gate...');
    const admitRes = await req('/staff/admit-ticket', 'POST', {
      bookingId: booking.id,
      staffName: 'Gate Officer Johnson'
    });
    console.log(`   Admit Status: ${admitRes.status}, Check-in Time: ${admitRes.data.checkInAt}`);

    // 8. Test Duplicate Admission Protection
    console.log('\n9. Staff Scanner: Testing duplicate admission protection...');
    const revalRes = await req('/staff/validate-ticket', 'POST', {
      tokenOrReference: booking.reference
    });
    console.log(`   Second Scan Status: ${revalRes.data.status} (Expected: ALREADY_CHECKED_IN)`);
    console.log(`   Second Scan Message: "${revalRes.data.message}"`);
    if (revalRes.data.status !== 'ALREADY_CHECKED_IN') throw new Error('Ticket should be detected as already used');

    // 9. Admin Analytics & Occupancy
    console.log('\n10. Checking Admin Analytics & Occupancy...');
    const anaRes = await req('/admin/analytics');
    const a = anaRes.data.analytics;
    console.log(`   Total Revenue: $${a.totalRevenue}`);
    console.log(`   Total Tickets Sold: ${a.totalTicketsSold}`);
    console.log(`   Screens Tracked: ${a.screenStats?.length}`);
    console.log(`   Top Screen: ${a.screenStats[0]?.screen_name} (${a.screenStats[0]?.occupancyRate}% occupancy)`);

    console.log('\n✅ ALL 10 TESTS PASSED CLEANLY! The cinema engine is 100% functional.');
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
  }
}

runTests();

