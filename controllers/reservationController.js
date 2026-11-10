const { db, runTransaction } = require('../db/database');
const tableService = require('../services/tableService');

class ReservationController {
  /**
   * Check table availability for date, time, and guests
   */
  checkAvailability(req, res) {
    try {
      const { date, time, guests } = req.query;

      if (!date || !time) {
        return res.status(400).json({
          success: false,
          error: 'Please provide both date (YYYY-MM-DD) and time (HH:MM)'
        });
      }

      const availableTables = tableService.getAvailableTables(date, time, parseInt(guests, 10) || 2);

      res.json({
        success: true,
        date,
        time,
        guests: parseInt(guests, 10) || 2,
        count: availableTables.length,
        data: availableTables
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Reserve a table
   */
  createReservation(req, res) {
    try {
      const {
        customerName,
        customerPhone,
        customerEmail,
        tableId,
        guestCount,
        reservationDate,
        reservationTime,
        specialRequests
      } = req.body;

      if (!customerName || !customerPhone || !reservationDate || !reservationTime || !guestCount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required reservation fields'
        });
      }

      const guests = parseInt(guestCount, 10);
      let selectedTableId = tableId ? Number(tableId) : null;

      // Verify availability
      const availableTables = tableService.getAvailableTables(reservationDate, reservationTime, guests);

      if (availableTables.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Sorry, no tables are available for the selected date, time, and party size.'
        });
      }

      // If specific table selected, verify it is among available
      if (selectedTableId) {
        const isTableValid = availableTables.some(t => t.id === selectedTableId);
        if (!isTableValid) {
          return res.status(400).json({
            success: false,
            error: 'Selected table is no longer available for this time slot. Please choose another table.'
          });
        }
      } else {
        // Auto-assign best-fit table (closest capacity >= guests)
        selectedTableId = availableTables[0].id;
      }

      const insertStmt = db.prepare(`
        INSERT INTO reservations (
          customer_name, customer_phone, customer_email, table_id,
          guest_count, reservation_date, reservation_time, status, special_requests
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
      `);

      const result = insertStmt.run(
        customerName.trim(),
        customerPhone.trim(),
        customerEmail ? customerEmail.trim() : null,
        selectedTableId,
        guests,
        reservationDate,
        reservationTime,
        specialRequests ? specialRequests.trim() : null
      );

      const reservationId = Number(result.lastInsertRowid);
      const newReservation = db.prepare(`
        SELECT r.*, t.table_number, t.location as table_location
        FROM reservations r
        JOIN tables t ON t.id = r.table_id
        WHERE r.id = ?
      `).get(reservationId);

      res.status(201).json({
        success: true,
        message: 'Table reservation confirmed successfully!',
        data: newReservation
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * List reservations
   */
  getReservations(req, res) {
    try {
      const { date, status } = req.query;
      let sql = `
        SELECT r.*, t.table_number, t.location as table_location
        FROM reservations r
        JOIN tables t ON t.id = r.table_id
        WHERE 1=1
      `;
      const params = [];

      if (date) {
        sql += ' AND r.reservation_date = ?';
        params.push(date);
      }

      if (status) {
        sql += ' AND r.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY r.reservation_date DESC, r.reservation_time ASC';

      const reservations = db.prepare(sql).all(...params);
      res.json({ success: true, count: reservations.length, data: reservations });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Update reservation status ('seated', 'completed', 'cancelled')
   */
  updateReservationStatus(req, res) {
    try {
      const id = req.params.id;
      const { status } = req.body;
      const validStatuses = ['confirmed', 'seated', 'completed', 'cancelled'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: `Invalid status: ${status}` });
      }

      const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(id);
      if (!reservation) {
        return res.status(404).json({ success: false, error: 'Reservation not found' });
      }

      runTransaction(() => {
        db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run(status, id);

        // If seated, update table status to occupied
        if (status === 'seated') {
          tableService.setTableStatus(reservation.table_id, 'occupied');
        } else if (['completed', 'cancelled'].includes(status)) {
          // If table was occupied/reserved for this, free it if no active order is currently on it
          const activeOrder = db.prepare(`
            SELECT COUNT(*) as count FROM orders
            WHERE table_id = ? AND status IN ('pending', 'in-preparation', 'ready', 'served')
          `).get(reservation.table_id);

          if (activeOrder.count === 0) {
            tableService.setTableStatus(reservation.table_id, 'available');
          }
        }
      });

      const updated = db.prepare(`
        SELECT r.*, t.table_number
        FROM reservations r
        JOIN tables t ON t.id = r.table_id
        WHERE r.id = ?
      `).get(id);

      res.json({ success: true, message: `Reservation marked as ${status}`, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new ReservationController();
