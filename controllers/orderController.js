const orderService = require('../services/orderService');

class OrderController {
  /**
   * Place an order
   */
  createOrder(req, res) {
    try {
      const { orderType, tableId, customerName, customerPhone, items, paymentMethod, notes } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Order must include at least one item' });
      }

      if (!customerName) {
        return res.status(400).json({ success: false, error: 'Customer name is required' });
      }

      const order = orderService.createOrder({
        orderType,
        tableId,
        customerName,
        customerPhone,
        items,
        paymentMethod,
        notes
      });

      res.status(201).json({
        success: true,
        message: 'Order placed successfully!',
        data: order
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * List orders with optional filters
   */
  getOrders(req, res) {
    try {
      const { status, orderType, limit } = req.query;
      const orders = orderService.getOrders({
        status,
        orderType,
        limit: limit ? parseInt(limit, 10) : 50
      });
      res.json({ success: true, count: orders.length, data: orders });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get order by ID
   */
  getOrderById(req, res) {
    try {
      const order = orderService.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      res.json({ success: true, data: order });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Track order by human-readable order number (e.g. ORD-20261110-1001)
   */
  trackOrderByNumber(req, res) {
    try {
      const orderNumber = req.params.orderNumber;
      const order = orderService.getOrderByNumber(orderNumber);
      if (!order) {
        return res.status(404).json({ success: false, error: `Order #${orderNumber} not found` });
      }
      res.json({ success: true, data: order });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Update order status
   */
  updateOrderStatus(req, res) {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }
      const updated = orderService.updateOrderStatus(req.params.id, status);
      res.json({
        success: true,
        message: `Order status updated to "${status}"`,
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * Update payment status
   */
  updatePayment(req, res) {
    try {
      const { paymentStatus, paymentMethod } = req.body;
      const updated = orderService.updatePayment(req.params.id, paymentStatus, paymentMethod);
      res.json({
        success: true,
        message: 'Payment information updated',
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

module.exports = new OrderController();
