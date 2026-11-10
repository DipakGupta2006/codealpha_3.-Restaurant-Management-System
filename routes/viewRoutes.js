const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const tableService = require('../services/tableService');
const { db } = require('../db/database');

// Customer Page: Home
router.get('/', (req, res) => {
  const featuredDishes = db.prepare(`
    SELECT mi.*, c.name as category_name
    FROM menu_items mi
    JOIN categories c ON c.id = mi.category_id
    WHERE mi.is_available = 1
    ORDER BY mi.price DESC
    LIMIT 4
  `).all();

  const stats = {
    totalDishes: db.prepare('SELECT COUNT(*) as c FROM menu_items WHERE is_available = 1').get().c,
    totalTables: db.prepare('SELECT COUNT(*) as c FROM tables').get().c
  };

  res.render('pages/index', {
    pageTitle: 'Gourmet Bistro - Fine Dining & Culinary Art',
    currentPath: '/',
    featuredDishes,
    stats
  });
});

// Customer Page: Menu
router.get('/menu', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY display_order ASC').all();
  const menuItems = db.prepare(`
    SELECT mi.*, c.name as category_name, c.icon as category_icon
    FROM menu_items mi
    JOIN categories c ON c.id = mi.category_id
    WHERE mi.is_available = 1
    ORDER BY c.display_order ASC, mi.name ASC
  `).all();

  res.render('pages/menu', {
    pageTitle: 'Our Menu - Gourmet Bistro',
    currentPath: '/menu',
    categories,
    menuItems
  });
});

// Customer Page: Reserve a Table
router.get('/reserve', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const tables = tableService.getAllTables();

  res.render('pages/reserve', {
    pageTitle: 'Reserve a Table - Gourmet Bistro',
    currentPath: '/reserve',
    today,
    tables
  });
});

// Customer Page: Place Order / Cart Checkout
router.get('/order', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY display_order ASC').all();
  const menuItems = db.prepare(`
    SELECT mi.*, c.name as category_name
    FROM menu_items mi
    JOIN categories c ON c.id = mi.category_id
    WHERE mi.is_available = 1
    ORDER BY c.display_order ASC, mi.name ASC
  `).all();
  const tables = db.prepare('SELECT * FROM tables ORDER BY table_number ASC').all();

  res.render('pages/order', {
    pageTitle: 'Online Ordering & Dine-In - Gourmet Bistro',
    currentPath: '/order',
    categories,
    menuItems,
    tables
  });
});

// Customer Page: Track Order
router.get('/track', (req, res) => {
  const { orderNumber } = req.query;
  res.render('pages/track', {
    pageTitle: 'Track Your Order - Gourmet Bistro',
    currentPath: '/track',
    searchedOrderNumber: orderNumber || ''
  });
});

// Admin Panel Pages
router.get('/admin', (req, res) => adminController.renderDashboard(req, res));
router.get('/admin/orders', (req, res) => adminController.renderOrders(req, res));
router.get('/admin/tables', (req, res) => adminController.renderTables(req, res));
router.get('/admin/reservations', (req, res) => adminController.renderReservations(req, res));
router.get('/admin/menu', (req, res) => adminController.renderMenuManage(req, res));
router.get('/admin/inventory', (req, res) => adminController.renderInventory(req, res));

module.exports = router;
