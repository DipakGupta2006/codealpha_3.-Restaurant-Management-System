const express = require('express');
const router = express.Router();

const menuController = require('../controllers/menuController');
const orderController = require('../controllers/orderController');
const tableController = require('../controllers/tableController');
const reservationController = require('../controllers/reservationController');
const inventoryController = require('../controllers/inventoryController');
const adminController = require('../controllers/adminController');

// Menu API
router.get('/menu', (req, res) => menuController.getAllMenuItems(req, res));
router.get('/menu/categories', (req, res) => menuController.getCategories(req, res));
router.get('/menu/:id', (req, res) => menuController.getMenuItemById(req, res));
router.post('/menu', (req, res) => menuController.createMenuItem(req, res));
router.put('/menu/:id', (req, res) => menuController.updateMenuItem(req, res));
router.delete('/menu/:id', (req, res) => menuController.deleteMenuItem(req, res));

// Tables API
router.get('/tables', (req, res) => tableController.getTables(req, res));
router.get('/tables/available', (req, res) => reservationController.checkAvailability(req, res));
router.post('/tables', (req, res) => tableController.createTable(req, res));
router.patch('/tables/:id/status', (req, res) => tableController.updateTableStatus(req, res));
router.delete('/tables/:id', (req, res) => tableController.deleteTable(req, res));

// Reservations API
router.get('/reservations', (req, res) => reservationController.getReservations(req, res));
router.post('/reservations', (req, res) => reservationController.createReservation(req, res));
router.patch('/reservations/:id/status', (req, res) => reservationController.updateReservationStatus(req, res));

// Orders API
router.post('/orders', (req, res) => orderController.createOrder(req, res));
router.get('/orders', (req, res) => orderController.getOrders(req, res));
router.get('/orders/track/:orderNumber', (req, res) => orderController.trackOrderByNumber(req, res));
router.get('/orders/:id', (req, res) => orderController.getOrderById(req, res));
router.patch('/orders/:id/status', (req, res) => orderController.updateOrderStatus(req, res));
router.patch('/orders/:id/payment', (req, res) => orderController.updatePayment(req, res));

// Inventory API
router.get('/inventory', (req, res) => inventoryController.getInventory(req, res));
router.get('/inventory/alerts', (req, res) => inventoryController.getAlerts(req, res));
router.post('/inventory', (req, res) => inventoryController.createItem(req, res));
router.post('/inventory/:id/restock', (req, res) => inventoryController.restockItem(req, res));
router.put('/inventory/:id', (req, res) => inventoryController.updateItem(req, res));
router.delete('/inventory/:id', (req, res) => inventoryController.deleteItem(req, res));

// Reports / Analytics API
router.get('/reports/dashboard', (req, res) => adminController.getStats(req, res));

module.exports = router;
