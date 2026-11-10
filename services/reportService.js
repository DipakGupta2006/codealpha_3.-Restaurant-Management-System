const { db } = require('../db/database');
const inventoryService = require('./inventoryService');

class ReportService {
  /**
   * Get restaurant operational and financial KPIs
   */
  getDashboardStats() {
    const today = new Date().toISOString().split('T')[0];

    // Today's total sales
    const todaySales = db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(*) as total_orders
      FROM orders
      WHERE DATE(created_at, 'localtime') = ?
        AND status != 'cancelled'
    `).get(today);

    // All-time sales
    const allTimeSales = db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(*) as total_orders
      FROM orders
      WHERE status != 'cancelled'
    `).get();

    // Active orders in kitchen (pending, in-preparation, ready)
    const activeOrders = db.prepare(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE status IN ('pending', 'in-preparation', 'ready')
    `).get().count;

    // Table occupancy
    const tableStats = db.prepare(`
      SELECT 
        COUNT(*) as total_tables,
        SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied_tables,
        SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved_tables,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_tables
      FROM tables
    `).get();

    // Today's confirmed reservations
    const todayReservations = db.prepare(`
      SELECT COUNT(*) as count
      FROM reservations
      WHERE reservation_date = ?
        AND status IN ('confirmed', 'seated')
    `).get(today).count;

    // Low stock alerts
    const lowStockAlerts = inventoryService.getLowStockAlerts();

    // Top 5 popular menu items
    const popularItems = db.prepare(`
      SELECT mi.name, mi.price, mi.image_url,
             SUM(oi.quantity) as units_sold,
             SUM(oi.subtotal) as total_generated
      FROM order_items oi
      JOIN menu_items mi ON mi.id = oi.menu_item_id
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status != 'cancelled'
      GROUP BY mi.id
      ORDER BY units_sold DESC
      LIMIT 5
    `).all();

    // Recent orders
    const recentOrders = db.prepare(`
      SELECT o.*, t.table_number
      FROM orders o
      LEFT JOIN tables t ON t.id = o.table_id
      ORDER BY o.created_at DESC
      LIMIT 6
    `).all();

    return {
      todayRevenue: Number(todaySales.total_revenue).toFixed(2),
      todayOrders: todaySales.total_orders,
      allTimeRevenue: Number(allTimeSales.total_revenue).toFixed(2),
      allTimeOrders: allTimeSales.total_orders,
      activeOrders,
      tableStats: {
        total: tableStats.total_tables || 0,
        occupied: tableStats.occupied_tables || 0,
        reserved: tableStats.reserved_tables || 0,
        available: tableStats.available_tables || 0,
        occupancyRate: tableStats.total_tables 
          ? Math.round(((tableStats.occupied_tables || 0) / tableStats.total_tables) * 100) 
          : 0
      },
      todayReservations,
      lowStockAlerts,
      popularItems,
      recentOrders
    };
  }
}

module.exports = new ReportService();
