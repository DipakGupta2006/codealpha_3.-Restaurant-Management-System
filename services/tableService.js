const { db } = require('../db/database');

/**
 * Helper to convert "HH:MM" string to minutes from midnight
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h * 60) + (m || 0);
}

class TableService {
  /**
   * Get all tables with real-time operational context
   */
  getAllTables() {
    const stmt = db.prepare(`
      SELECT t.*,
        (SELECT o.order_number FROM orders o 
         WHERE o.table_id = t.id AND o.status IN ('pending', 'in-preparation', 'ready', 'served') 
         ORDER BY o.created_at DESC LIMIT 1) as active_order_number,
        (SELECT o.total_amount FROM orders o 
         WHERE o.table_id = t.id AND o.status IN ('pending', 'in-preparation', 'ready', 'served') 
         ORDER BY o.created_at DESC LIMIT 1) as active_order_amount,
        (SELECT r.customer_name FROM reservations r 
         WHERE r.table_id = t.id AND r.status = 'confirmed' AND r.reservation_date = DATE('now', 'localtime') 
         ORDER BY r.reservation_time ASC LIMIT 1) as upcoming_reservation_name,
        (SELECT r.reservation_time FROM reservations r 
         WHERE r.table_id = t.id AND r.status = 'confirmed' AND r.reservation_date = DATE('now', 'localtime') 
         ORDER BY r.reservation_time ASC LIMIT 1) as upcoming_reservation_time
      FROM tables t
      ORDER BY t.table_number ASC
    `);
    return stmt.all();
  }

  /**
   * Find available tables for a target date, time, and guest count
   * Assumes a 90-minute dining window per reservation
   * @param {string} date YYYY-MM-DD
   * @param {string} time HH:MM
   * @param {number} guestCount
   */
  getAvailableTables(date, time, guestCount) {
    const guests = parseInt(guestCount, 10) || 1;
    const reqMinutes = timeToMinutes(time);
    const SLOT_DURATION_MINUTES = 90;

    // Get all candidate tables that fit the party size
    const candidateTables = db.prepare(`
      SELECT * FROM tables
      WHERE capacity >= ?
      ORDER BY capacity ASC, table_number ASC
    `).all(guests);

    // Get all active reservations on that date
    const existingReservations = db.prepare(`
      SELECT table_id, reservation_time
      FROM reservations
      WHERE reservation_date = ?
        AND status IN ('confirmed', 'seated')
    `).all(date);

    // Filter tables that don't have overlapping reservations
    const availableTables = candidateTables.filter(tbl => {
      const conflicts = existingReservations.filter(res => {
        if (res.table_id !== tbl.id) return false;
        const resMinutes = timeToMinutes(res.reservation_time);
        // Overlap if absolute difference is less than slot duration
        return Math.abs(reqMinutes - resMinutes) < SLOT_DURATION_MINUTES;
      });

      return conflicts.length === 0;
    });

    return availableTables;
  }

  /**
   * Update table status
   * @param {number} tableId 
   * @param {'available' | 'occupied' | 'reserved'} status 
   */
  setTableStatus(tableId, status) {
    const validStatuses = ['available', 'occupied', 'reserved'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid table status: ${status}`);
    }
    const stmt = db.prepare('UPDATE tables SET status = ? WHERE id = ?');
    stmt.run(status, tableId);
    return db.prepare('SELECT * FROM tables WHERE id = ?').get(tableId);
  }

  /**
   * Get table by ID
   */
  getTableById(id) {
    return db.prepare('SELECT * FROM tables WHERE id = ?').get(id);
  }

  /**
   * Add a new table
   */
  createTable({ tableNumber, capacity, location }) {
    const stmt = db.prepare(`
      INSERT INTO tables (table_number, capacity, location, status)
      VALUES (?, ?, ?, 'available')
    `);
    const res = stmt.run(Number(tableNumber), Number(capacity), location);
    return this.getTableById(Number(res.lastInsertRowid));
  }

  /**
   * Delete a table
   */
  deleteTable(id) {
    const stmt = db.prepare('DELETE FROM tables WHERE id = ?');
    return stmt.run(id);
  }
}

module.exports = new TableService();
