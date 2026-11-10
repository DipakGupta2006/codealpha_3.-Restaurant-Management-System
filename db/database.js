const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const DB_PATH = path.join(__dirname, '..', 'restaurant.db');
const db = new DatabaseSync(DB_PATH);

// Enable foreign keys and WAL mode for reliability and performance
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Initialize all database tables if they do not exist
 */
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT DEFAULT '🍽️',
      display_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image_url TEXT,
      is_available INTEGER DEFAULT 1,
      prep_time_minutes INTEGER DEFAULT 15,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number INTEGER NOT NULL UNIQUE,
      capacity INTEGER NOT NULL,
      location TEXT NOT NULL,
      status TEXT DEFAULT 'available' -- 'available', 'occupied', 'reserved'
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      table_id INTEGER REFERENCES tables(id) ON DELETE RESTRICT,
      guest_count INTEGER NOT NULL,
      reservation_date TEXT NOT NULL, -- 'YYYY-MM-DD'
      reservation_time TEXT NOT NULL, -- 'HH:MM'
      status TEXT DEFAULT 'confirmed', -- 'confirmed', 'seated', 'completed', 'cancelled'
      special_requests TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL,
      min_threshold REAL NOT NULL DEFAULT 5,
      unit_cost REAL DEFAULT 0,
      last_restocked DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS menu_item_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
      quantity_required REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      order_type TEXT NOT NULL, -- 'dine-in', 'takeaway', 'delivery'
      table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      status TEXT DEFAULT 'pending', -- 'pending', 'in-preparation', 'ready', 'served', 'completed', 'cancelled'
      total_amount REAL NOT NULL DEFAULT 0,
      payment_status TEXT DEFAULT 'unpaid', -- 'unpaid', 'paid'
      payment_method TEXT DEFAULT 'cash', -- 'cash', 'card', 'online'
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      notes TEXT
    );
  `);
}

/**
 * Execute a function within a SQLite transaction
 * @param {Function} callback
 * @returns {*} result
 */
function runTransaction(callback) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = callback();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// Auto-run schema initialization
initSchema();

module.exports = {
  db,
  initSchema,
  runTransaction
};
