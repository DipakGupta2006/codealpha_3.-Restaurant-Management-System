const reportService = require('../services/reportService');
const orderService = require('../services/orderService');
const tableService = require('../services/tableService');
const inventoryService = require('../services/inventoryService');
const { db } = require('../db/database');

class AdminController {
  /**
   * Return JSON dashboard report
   */
  getStats(req, res) {
    try {
      const stats = reportService.getDashboardStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Render Admin Dashboard page
   */
  renderDashboard(req, res) {
    try {
      const stats = reportService.getDashboardStats();
      res.render('pages/admin/dashboard', {
        pageTitle: 'Admin Dashboard & Reports',
        currentPath: '/admin',
        stats
      });
    } catch (error) {
      res.status(500).send(`Server Error: ${error.message}`);
    }
  }

  /**
   * Render Live Orders / Kitchen POS page
   */
  renderOrders(req, res) {
    try {
      const { status } = req.query;
      const orders = orderService.getOrders({ status, limit: 100 });
      // Fetch details with items for each
      const ordersWithItems = orders.map(o => orderService.getOrderById(o.id));

      res.render('pages/admin/orders', {
        pageTitle: 'Kitchen & Order Operations',
        currentPath: '/admin/orders',
        orders: ordersWithItems,
        filterStatus: status || 'all'
      });
    } catch (error) {
      res.status(500).send(`Server Error: ${error.message}`);
    }
  }

  /**
   * Render Tables & Floor Plan
   */
  renderTables(req, res) {
    try {
      const tables = tableService.getAllTables();
      res.render('pages/admin/tables', {
        pageTitle: 'Table Management & Floor Plan',
        currentPath: '/admin/tables',
        tables
      });
    } catch (error) {
      res.status(500).send(`Server Error: ${error.message}`);
    }
  }

  /**
   * Render Reservations List
   */
  renderReservations(req, res) {
    try {
      const { date } = req.query;
      const filterDate = date || new Date().toISOString().split('T')[0];

      const reservations = db.prepare(`
        SELECT r.*, t.table_number, t.location as table_location
        FROM reservations r
        JOIN tables t ON t.id = r.table_id
        WHERE r.reservation_date = ?
        ORDER BY r.reservation_time ASC
      `).all(filterDate);

      const allDates = db.prepare(`
        SELECT DISTINCT reservation_date
        FROM reservations
        ORDER BY reservation_date DESC
        LIMIT 10
      `).all().map(r => r.reservation_date);

      res.render('pages/admin/reservations', {
        pageTitle: 'Reservations Book',
        currentPath: '/admin/reservations',
        reservations,
        filterDate,
        allDates
      });
    } catch (error) {
      res.status(500).send(`Server Error: ${error.message}`);
    }
  }

  /**
   * Render Menu Items Management
   */
  renderMenuManage(req, res) {
    try {
      const categories = db.prepare('SELECT * FROM categories ORDER BY display_order ASC').all();
      const menuItems = db.prepare(`
        SELECT mi.*, c.name as category_name
        FROM menu_items mi
        LEFT JOIN categories c ON c.id = mi.category_id
        ORDER BY c.display_order ASC, mi.name ASC
      `).all();

      const inventory = inventoryService.getAllInventory();

      res.render('pages/admin/menu-manage', {
        pageTitle: 'Menu Management',
        currentPath: '/admin/menu',
        menuItems,
        categories,
        inventory
      });
    } catch (error) {
      res.status(500).send(`Server Error: ${error.message}`);
    }
  }

  /**
   * Render Inventory Management & Stock Alerts
   */
  renderInventory(req, res) {
    try {
      const inventory = inventoryService.getAllInventory();
      const lowStockAlerts = inventoryService.getLowStockAlerts();

      res.render('pages/admin/inventory', {
        pageTitle: 'Inventory & Stock Alerts',
        currentPath: '/admin/inventory',
        inventory,
        lowStockAlerts
      });
    } catch (error) {
      res.status(500).send(`Server Error: ${error.message}`);
    }
  }
}

module.exports = new AdminController();
