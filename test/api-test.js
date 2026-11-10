const http = require('node:http');
const app = require('../server');
const { db } = require('../db/database');

const PORT = 3001;
let server;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = null;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json || data
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Restaurant Management System automated verification suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  server = app.listen(PORT);
  // Give server 500ms to spin up
  await new Promise(r => setTimeout(r, 500));

  try {
    // Test 1: Fetch Menu
    console.log('1. Testing Menu API...');
    const menuRes = await request('GET', '/api/menu');
    assert(menuRes.status === 200 && menuRes.data.success, 'GET /api/menu returns 200 with success: true');
    assert(Array.isArray(menuRes.data.data) && menuRes.data.data.length >= 8, `Menu items count is ${menuRes.data.data.length} (>= 8)`);

    // Test 2: Check Table Availability
    console.log('\n2. Testing Table Availability API...');
    const today = new Date().toISOString().split('T')[0];
    const availRes = await request('GET', `/api/tables/available?date=${today}&time=19:00&guests=2`);
    assert(availRes.status === 200 && availRes.data.success, 'GET /api/tables/available returns 200');
    assert(Array.isArray(availRes.data.data) && availRes.data.data.length > 0, `Found ${availRes.data.data.length} available tables for 2 guests`);

    // Pick a table that is currently 'available'
    const targetTable = availRes.data.data.find(t => t.status === 'available');
    assert(targetTable !== undefined, `Found available table #${targetTable ? targetTable.table_number : 'none'}`);

    // Test 3: Record inventory levels before order
    console.log('\n3. Testing Inventory Auto-Update Logic...');
    // We will order Margherita Classica (Menu Item #3) which requires Mozzarella Cheese (id 2) and Pizza Flour (id 1)
    const mozBefore = db.prepare('SELECT quantity FROM inventory WHERE id = 2').get().quantity;
    console.log(`  ℹ️ Mozzarella stock before order: ${mozBefore} kg`);

    // Test 4: Place Order
    console.log('\n4. Testing Order Creation & Inventory Auto-Deduction...');
    const orderPayload = {
      orderType: 'dine-in',
      tableId: targetTable.id,
      customerName: 'Inspector Ramsey',
      customerPhone: '+1 555-0999',
      items: [
        { menuItemId: 3, quantity: 2 } // 2x Margherita Classica (uses 2 * 0.15 = 0.30 kg Mozzarella)
      ],
      paymentMethod: 'card',
      notes: 'Extra crispy crust'
    };

    const orderRes = await request('POST', '/api/orders', orderPayload);
    assert(orderRes.status === 201 && orderRes.data.success, 'POST /api/orders successfully created order');
    const createdOrder = orderRes.data.data;
    assert(createdOrder.order_number.startsWith('ORD-'), `Generated order number: ${createdOrder.order_number}`);

    // Verify inventory deduction
    const mozAfter = db.prepare('SELECT quantity FROM inventory WHERE id = 2').get().quantity;
    console.log(`  ℹ️ Mozzarella stock after order: ${mozAfter} kg`);
    assert(Number((mozBefore - mozAfter).toFixed(2)) === 0.30, `Mozzarella accurately deducted by 0.30 kg (${mozBefore} -> ${mozAfter})`);

    // Verify table status is now occupied
    const tableCheck = db.prepare('SELECT status FROM tables WHERE id = ?').get(targetTable.id);
    assert(tableCheck.status === 'occupied', `Table #${targetTable.table_number} status updated to "occupied"`);

    // Test 5: Order status lifecycle and table auto-free
    console.log('\n5. Testing Order Status Transitions & Table Release...');
    const updateRes1 = await request('PATCH', `/api/orders/${createdOrder.id}/status`, { status: 'in-preparation' });
    assert(updateRes1.status === 200 && updateRes1.data.data.status === 'in-preparation', 'Order transitioned to "in-preparation"');

    const updateRes2 = await request('PATCH', `/api/orders/${createdOrder.id}/status`, { status: 'ready' });
    assert(updateRes2.status === 200 && updateRes2.data.data.status === 'ready', 'Order transitioned to "ready"');

    const updateRes3 = await request('PATCH', `/api/orders/${createdOrder.id}/status`, { status: 'completed' });
    assert(updateRes3.status === 200 && updateRes3.data.data.status === 'completed', 'Order transitioned to "completed"');

    // Verify table was automatically freed
    const tableFreed = db.prepare('SELECT status FROM tables WHERE id = ?').get(targetTable.id);
    assert(tableFreed.status === 'available', `Table #${targetTable.table_number} automatically freed back to "available"`);

    // Test 6: Table Reservation
    console.log('\n6. Testing Table Reservation Booking...');
    const availForBooking = await request('GET', `/api/tables/available?date=${today}&time=17:00&guests=2`);
    const freeTable = availForBooking.data.data[0];

    const resPayload = {
      customerName: 'Lord Grantham',
      customerPhone: '+1 555-4321',
      customerEmail: 'grantham@estate.com',
      tableId: freeTable.id,
      guestCount: 2,
      reservationDate: today,
      reservationTime: '17:00',
      specialRequests: 'Quiet table'
    };
    const resResult = await request('POST', '/api/reservations', resPayload);
    assert(resResult.status === 201 && resResult.data.success, 'POST /api/reservations confirmed booking');
    assert(resResult.data.data.table_number === freeTable.table_number, `Reserved assigned to Table #${freeTable.table_number}`);

    // Test 7: Inventory Restocking
    console.log('\n7. Testing Inventory Restocking...');
    const restockRes = await request('POST', '/api/inventory/2/restock', { quantity: 10 });
    assert(restockRes.status === 200 && restockRes.data.success, 'POST /api/inventory/2/restock succeeded');
    const mozRestocked = db.prepare('SELECT quantity FROM inventory WHERE id = 2').get().quantity;
    assert(Number(mozRestocked.toFixed(2)) === Number((mozAfter + 10).toFixed(2)), `Stock increased accurately to ${mozRestocked} kg`);

    // Test 8: Reporting & Analytics API
    console.log('\n8. Testing Reporting & Dashboard KPIs...');
    const statsRes = await request('GET', '/api/reports/dashboard');
    assert(statsRes.status === 200 && statsRes.data.success, 'GET /api/reports/dashboard returns 200');
    assert(parseFloat(statsRes.data.data.allTimeRevenue) > 0, `All-time revenue tracked: $${statsRes.data.data.allTimeRevenue}`);
    assert(statsRes.data.data.tableStats.total > 0, `Total tables in system: ${statsRes.data.data.tableStats.total}`);

    // Test 9: HTML Page Rendering (Customer & Admin Views)
    console.log('\n9. Testing Server-Rendered EJS Views...');
    const routesToTest = [
      '/',
      '/menu',
      '/reserve',
      '/order',
      `/track?orderNumber=${createdOrder.order_number}`,
      '/admin',
      '/admin/orders',
      '/admin/tables',
      '/admin/reservations',
      '/admin/menu',
      '/admin/inventory'
    ];

    for (const r of routesToTest) {
      const pageRes = await request('GET', r);
      assert(pageRes.status === 200, `Page route "${r}" rendered with HTTP 200`);
    }

    console.log(`\n=============================================================`);
    console.log(`TEST SUITE RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log(`=============================================================\n`);

  } catch (err) {
    console.error('Test suite crashed with error:', err);
    failed++;
  } finally {
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
