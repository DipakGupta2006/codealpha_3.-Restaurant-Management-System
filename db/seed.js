const { db, runTransaction } = require('./database');

function seedDatabase() {
  console.log('🌱 Starting restaurant database seeding...');

  // Check if already seeded
  const check = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (check.count > 0) {
    console.log('⚡ Database already seeded. Skipping initial seed.');
    return;
  }

  runTransaction(() => {
    // 1. Categories
    const insertCategory = db.prepare('INSERT INTO categories (name, icon, display_order) VALUES (?, ?, ?)');
    const catMap = {};
    const categories = [
      { name: 'Appetizers & Starters', icon: '🥗', order: 1 },
      { name: 'Main Courses', icon: '🍲', order: 2 },
      { name: 'Wood-Fired Pizzas', icon: '🍕', order: 3 },
      { name: 'Artisan Burgers', icon: '🍔', order: 4 },
      { name: 'Desserts & Sweets', icon: '🍰', order: 5 },
      { name: 'Beverages & Mocktails', icon: '🍹', order: 6 }
    ];

    for (const cat of categories) {
      const res = insertCategory.run(cat.name, cat.icon, cat.order);
      catMap[cat.name] = Number(res.lastInsertRowid);
    }

    // 2. Tables
    const insertTable = db.prepare('INSERT INTO tables (table_number, capacity, location, status) VALUES (?, ?, ?, ?)');
    const tables = [
      { num: 1, cap: 2, loc: 'Window Bay View', status: 'available' },
      { num: 2, cap: 2, loc: 'Window Bay View', status: 'available' },
      { num: 3, cap: 4, loc: 'Main Dining Hall', status: 'available' },
      { num: 4, cap: 4, loc: 'Main Dining Hall', status: 'available' },
      { num: 5, cap: 6, loc: 'Main Dining Hall', status: 'available' },
      { num: 6, cap: 4, loc: 'Garden Patio', status: 'available' },
      { num: 7, cap: 4, loc: 'Garden Patio', status: 'available' },
      { num: 8, cap: 8, loc: 'Private Dining Booth', status: 'available' },
      { num: 9, cap: 2, loc: 'Balcony Terrace', status: 'available' },
      { num: 10, cap: 6, loc: 'Balcony Terrace', status: 'available' }
    ];
    const tableIdMap = {};
    for (const t of tables) {
      const res = insertTable.run(t.num, t.cap, t.loc, t.status);
      tableIdMap[t.num] = Number(res.lastInsertRowid);
    }

    // 3. Inventory Items
    const insertInventory = db.prepare(`
      INSERT INTO inventory (item_name, category, quantity, unit, min_threshold, unit_cost)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const invMap = {};
    const inventoryItems = [
      { name: 'Pizza Dough / Flour', category: 'Bakery', qty: 25.0, unit: 'kg', min: 5.0, cost: 2.5 },
      { name: 'Mozzarella Cheese', category: 'Dairy', qty: 18.5, unit: 'kg', min: 4.0, cost: 8.0 },
      { name: 'San Marzano Tomato Sauce', category: 'Produce', qty: 30.0, unit: 'liters', min: 6.0, cost: 3.2 },
      { name: 'Fresh Basil', category: 'Produce', qty: 3.0, unit: 'kg', min: 1.0, cost: 4.5 },
      { name: 'Chicken Breast', category: 'Meat', qty: 20.0, unit: 'kg', min: 5.0, cost: 9.0 },
      { name: 'Ground Beef Patties', category: 'Meat', qty: 40.0, unit: 'units', min: 10.0, cost: 3.5 },
      { name: 'Brioche Buns', category: 'Bakery', qty: 50.0, unit: 'units', min: 15.0, cost: 0.8 },
      { name: 'Cheddar Cheese Slices', category: 'Dairy', qty: 45.0, unit: 'units', min: 10.0, cost: 0.5 },
      { name: 'Potatoes (Fries)', category: 'Produce', qty: 35.0, unit: 'kg', min: 10.0, cost: 1.2 },
      { name: 'Romaine Lettuce', category: 'Produce', qty: 12.0, unit: 'kg', min: 3.0, cost: 2.0 },
      { name: 'Parmesan Cheese', category: 'Dairy', qty: 8.0, unit: 'kg', min: 2.0, cost: 12.0 },
      { name: 'Olive Oil', category: 'Spices & Pantry', qty: 15.0, unit: 'liters', min: 3.0, cost: 7.0 },
      { name: 'Heavy Cream', category: 'Dairy', qty: 10.0, unit: 'liters', min: 2.5, cost: 4.0 },
      { name: 'Fettuccine Pasta', category: 'Bakery', qty: 15.0, unit: 'kg', min: 4.0, cost: 2.8 },
      { name: 'Chocolate Ganache / Lava', category: 'Bakery', qty: 14.0, unit: 'units', min: 5.0, cost: 2.0 },
      { name: 'Vanilla Ice Cream', category: 'Dairy', qty: 8.0, unit: 'liters', min: 2.0, cost: 5.0 },
      { name: 'Fresh Lemons & Mint', category: 'Produce', qty: 15.0, unit: 'kg', min: 3.0, cost: 3.0 },
      { name: 'Club Soda / Tonic', category: 'Beverages', qty: 60.0, unit: 'cans', min: 15.0, cost: 0.6 },
      { name: 'Espresso Coffee Beans', category: 'Beverages', qty: 9.0, unit: 'kg', min: 2.0, cost: 14.0 },
      { name: 'Avocado', category: 'Produce', qty: 4.0, unit: 'kg', min: 5.0, cost: 6.0 } // intentionally close to low stock for demo!
    ];

    for (const item of inventoryItems) {
      const res = insertInventory.run(item.name, item.category, item.qty, item.unit, item.min, item.cost);
      invMap[item.name] = Number(res.lastInsertRowid);
    }

    // 4. Menu Items
    const insertMenu = db.prepare(`
      INSERT INTO menu_items (category_id, name, description, price, image_url, is_available, prep_time_minutes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const menuItems = [
      {
        cat: 'Appetizers & Starters',
        name: 'Classic Caesar Salad',
        desc: 'Crisp romaine lettuce, house-made herb croutons, aged Parmesan crisps and creamy Caesar dressing.',
        price: 8.99,
        img: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&auto=format&fit=crop&q=80',
        prep: 10,
        ingredients: [
          { inv: 'Romaine Lettuce', qty: 0.2 },
          { inv: 'Parmesan Cheese', qty: 0.05 },
          { inv: 'Olive Oil', qty: 0.02 }
        ]
      },
      {
        cat: 'Appetizers & Starters',
        name: 'Crispy Truffle Herb Fries',
        desc: 'Golden crisp hand-cut potato fries tossed with fragrant truffle oil, rosemary, sea salt and grated parmesan.',
        price: 6.99,
        img: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80',
        prep: 12,
        ingredients: [
          { inv: 'Potatoes (Fries)', qty: 0.35 },
          { inv: 'Parmesan Cheese', qty: 0.03 },
          { inv: 'Olive Oil', qty: 0.03 }
        ]
      },
      {
        cat: 'Wood-Fired Pizzas',
        name: 'Margherita Classica',
        desc: 'Authentic San Marzano tomato sauce, fresh creamy mozzarella fior di latte, aromatic basil and extra virgin olive oil.',
        price: 13.99,
        img: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&auto=format&fit=crop&q=80',
        prep: 15,
        ingredients: [
          { inv: 'Pizza Dough / Flour', qty: 0.25 },
          { inv: 'Mozzarella Cheese', qty: 0.15 },
          { inv: 'San Marzano Tomato Sauce', qty: 0.1 },
          { inv: 'Fresh Basil', qty: 0.02 },
          { inv: 'Olive Oil', qty: 0.015 }
        ]
      },
      {
        cat: 'Wood-Fired Pizzas',
        name: 'Rustic Roasted Chicken Pizza',
        desc: 'Seasoned grilled chicken breast, caramelized onions, smoked cheese, mozzarella and herb tomato coulis.',
        price: 15.99,
        img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
        prep: 18,
        ingredients: [
          { inv: 'Pizza Dough / Flour', qty: 0.25 },
          { inv: 'Mozzarella Cheese', qty: 0.15 },
          { inv: 'Chicken Breast', qty: 0.15 },
          { inv: 'San Marzano Tomato Sauce', qty: 0.1 }
        ]
      },
      {
        cat: 'Artisan Burgers',
        name: 'The Signature Gourmet Cheeseburger',
        desc: 'Prime Angus beef patty, aged cheddar, butter lettuce, ripe tomato, house burger sauce on a toasted brioche bun.',
        price: 14.50,
        img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
        prep: 15,
        ingredients: [
          { inv: 'Ground Beef Patties', qty: 1.0 },
          { inv: 'Brioche Buns', qty: 1.0 },
          { inv: 'Cheddar Cheese Slices', qty: 1.0 },
          { inv: 'Romaine Lettuce', qty: 0.05 },
          { inv: 'Potatoes (Fries)', qty: 0.15 }
        ]
      },
      {
        cat: 'Main Courses',
        name: 'Creamy Fettuccine Alfredo',
        desc: 'Fresh handmade pasta ribbons swirled in velvety rich parmesan and garlic cream sauce with pan-seared chicken breast.',
        price: 16.50,
        img: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600&auto=format&fit=crop&q=80',
        prep: 20,
        ingredients: [
          { inv: 'Fettuccine Pasta', qty: 0.2 },
          { inv: 'Heavy Cream', qty: 0.15 },
          { inv: 'Parmesan Cheese', qty: 0.05 },
          { inv: 'Chicken Breast', qty: 0.15 }
        ]
      },
      {
        cat: 'Desserts & Sweets',
        name: 'Molten Belgian Chocolate Lava Cake',
        desc: 'Decadent dark chocolate soufflé with a warm flowing molten center, paired with a scoop of bourbon vanilla bean ice cream.',
        price: 7.99,
        img: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
        prep: 12,
        ingredients: [
          { inv: 'Chocolate Ganache / Lava', qty: 1.0 },
          { inv: 'Vanilla Ice Cream', qty: 0.1 }
        ]
      },
      {
        cat: 'Beverages & Mocktails',
        name: 'Zesty Sparkling Mint Mojito',
        desc: 'Muddled fresh garden mint, tangy Tahitian lime wedges, cane sugar syrup and bubbling chilled club soda.',
        price: 5.50,
        img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
        prep: 5,
        ingredients: [
          { inv: 'Fresh Lemons & Mint', qty: 0.05 },
          { inv: 'Club Soda / Tonic', qty: 1.0 }
        ]
      },
      {
        cat: 'Beverages & Mocktails',
        name: 'Artisan Vanilla Iced Latte',
        desc: 'Double shot of freshly roasted organic espresso pulled over creamy whole milk and natural vanilla syrup.',
        price: 4.95,
        img: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80',
        prep: 5,
        ingredients: [
          { inv: 'Espresso Coffee Beans', qty: 0.02 },
          { inv: 'Heavy Cream', qty: 0.05 }
        ]
      }
    ];

    const insertRecipe = db.prepare(`
      INSERT INTO menu_item_ingredients (menu_item_id, inventory_id, quantity_required)
      VALUES (?, ?, ?)
    `);

    for (const item of menuItems) {
      const catId = catMap[item.cat];
      const res = insertMenu.run(catId, item.name, item.desc, item.price, item.img, 1, item.prep);
      const menuId = Number(res.lastInsertRowid);

      if (item.ingredients) {
        for (const ing of item.ingredients) {
          const invId = invMap[ing.inv];
          if (invId) {
            insertRecipe.run(menuId, invId, ing.qty);
          }
        }
      }
    }

    // 5. Initial Sample Reservations
    const insertRes = db.prepare(`
      INSERT INTO reservations (customer_name, customer_phone, customer_email, table_id, guest_count, reservation_date, reservation_time, status, special_requests)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const today = new Date().toISOString().split('T')[0];
    insertRes.run('David Miller', '+1 555-0192', 'david@example.com', tableIdMap[3], 4, today, '19:00', 'confirmed', 'Window side preferred if possible');
    insertRes.run('Sarah Connor', '+1 555-0144', 'sarah@example.com', tableIdMap[1], 2, today, '20:30', 'confirmed', 'Anniversary celebration');

    // 6. Initial Sample Orders (demonstrating sales history & active orders)
    const insertOrder = db.prepare(`
      INSERT INTO orders (order_number, order_type, table_id, customer_name, customer_phone, status, total_amount, payment_status, payment_method, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Sample completed order
    const o1 = insertOrder.run('ORD-1001', 'dine-in', tableIdMap[4], 'Alex Rivera', '+1 555-0123', 'completed', 33.48, 'paid', 'card', 'Table 4 lunch');
    insertOrderItem.run(Number(o1.lastInsertRowid), 1, 1, 8.99, 8.99); // Caesar Salad
    insertOrderItem.run(Number(o1.lastInsertRowid), 3, 1, 13.99, 13.99); // Margherita
    insertOrderItem.run(Number(o1.lastInsertRowid), 8, 1, 5.50, 5.50); // Mojito
    insertOrderItem.run(Number(o1.lastInsertRowid), 9, 1, 4.95, 4.95); // Latte

    // Sample in-preparation order
    const o2 = insertOrder.run('ORD-1002', 'dine-in', tableIdMap[5], 'Michael Scott', '+1 555-0199', 'in-preparation', 44.99, 'unpaid', 'cash', 'Extra crispy fries');
    insertOrderItem.run(Number(o2.lastInsertRowid), 5, 2, 14.50, 29.00); // Burgers
    insertOrderItem.run(Number(o2.lastInsertRowid), 7, 2, 7.99, 15.98); // Lava Cakes
    // Mark table 5 as occupied
    db.prepare('UPDATE tables SET status = ? WHERE id = ?').run('occupied', tableIdMap[5]);

    // Sample takeaway order
    const o3 = insertOrder.run('ORD-1003', 'takeaway', null, 'Emma Watson', '+1 555-0177', 'ready', 22.98, 'paid', 'online', 'Takeaway bag with cutlery');
    insertOrderItem.run(Number(o3.lastInsertRowid), 3, 1, 13.99, 13.99); // Margherita
    insertOrderItem.run(Number(o3.lastInsertRowid), 2, 1, 6.99, 6.99); // Truffle Fries
  });

  console.log('✅ Restaurant database seeded successfully with tables, menu, inventory, recipes, and sample orders!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
