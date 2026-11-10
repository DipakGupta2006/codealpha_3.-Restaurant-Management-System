const { db, runTransaction } = require('../db/database');
const inventoryService = require('./inventoryService');
const tableService = require('./tableService');

class OrderService {
  /**
   * Place a new order with atomic inventory deduction and table status handling
   * @param {Object} data 
   * @param {'dine-in'|'takeaway'|'delivery'} data.orderType
   * @param {number|null} data.tableId
   * @param {string} data.customerName
   * @param {string} data.customerPhone
   * @param {Array<{menuItemId: number, quantity: number, notes?: string}>} data.items
   * @param {string} data.paymentMethod
   * @param {string} data.notes
   */
  createOrder(data) {
    const {
      orderType = 'dine-in',
      tableId = null,
      customerName = 'Guest',
      customerPhone = '',
      items = [],
      paymentMethod = 'cash',
      notes = ''
    } = data;

    if (!items || items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    if (orderType === 'dine-in' && !tableId) {
      throw new Error('Table selection is required for dine-in orders');
    }

    // 1. Fetch menu item details & check availability
    const getMenuItem = db.prepare('SELECT * FROM menu_items WHERE id = ?');
    const orderItemsWithPrices = [];
    let totalAmount = 0;

    for (const item of items) {
      const menuItem = getMenuItem.get(item.menuItemId);
      if (!menuItem) {
        throw new Error(`Menu item with ID ${item.menuItemId} not found`);
      }
      if (menuItem.is_available === 0) {
        throw new Error(`"${menuItem.name}" is currently marked unavailable`);
      }
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`Invalid quantity for ${menuItem.name}`);
      }

      const subtotal = Number((menuItem.price * qty).toFixed(2));
      totalAmount += subtotal;

      orderItemsWithPrices.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity: qty,
        unitPrice: menuItem.price,
        subtotal,
        notes: item.notes || ''
      });
    }

    totalAmount = Number(totalAmount.toFixed(2));

    // 2. Validate inventory stock
    const stockCheck = inventoryService.checkStockForOrder(items);
    if (!stockCheck.canFulfill) {
      const missingDetails = stockCheck.missing
        .map(m => `${m.item} (Need: ${m.required} ${m.unit}, Have: ${m.available} ${m.unit})`)
        .join(', ');
      throw new Error(`Insufficient inventory: ${missingDetails}`);
    }

    // 3. Generate unique order number
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${datePrefix}-${randomSuffix}`;

    // 4. Atomic transaction
    const createdOrder = runTransaction(() => {
      // Deduct inventory stock
      inventoryService.deductStockForOrder(items);

      // Insert order
      const insertOrderStmt = db.prepare(`
        INSERT INTO orders (
          order_number, order_type, table_id, customer_name, customer_phone,
          status, total_amount, payment_status, payment_method, notes
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, 'unpaid', ?, ?)
      `);

      const orderRes = insertOrderStmt.run(
        orderNumber,
        orderType,
        orderType === 'dine-in' ? Number(tableId) : null,
        customerName.trim(),
        customerPhone ? customerPhone.trim() : null,
        totalAmount,
        paymentMethod,
        notes ? notes.trim() : null
      );

      const orderId = Number(orderRes.lastInsertRowid);

      // Insert order items
      const insertItemStmt = db.prepare(`
        INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const oi of orderItemsWithPrices) {
        insertItemStmt.run(orderId, oi.menuItemId, oi.quantity, oi.unitPrice, oi.subtotal, oi.notes);
      }

      // If dine-in, mark table as occupied
      if (orderType === 'dine-in' && tableId) {
        tableService.setTableStatus(Number(tableId), 'occupied');
      }

      return orderId;
    });

    return this.getOrderById(createdOrder);
  }

  /**
   * Update order status
   * Valid transitions: pending -> in-preparation -> ready -> served -> completed / cancelled
   */
  updateOrderStatus(orderId, newStatus) {
    const validStatuses = ['pending', 'in-preparation', 'ready', 'served', 'completed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid order status: ${newStatus}`);
    }

    const order = this.getOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    runTransaction(() => {
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(newStatus, orderId);

      // If completed or cancelled, auto-release table if no other active orders exist for that table
      if (['completed', 'cancelled'].includes(newStatus) && order.table_id) {
        const otherActiveOrders = db.prepare(`
          SELECT COUNT(*) as count FROM orders
          WHERE table_id = ? AND id != ? AND status IN ('pending', 'in-preparation', 'ready', 'served')
        `).get(order.table_id, orderId);

        if (otherActiveOrders.count === 0) {
          tableService.setTableStatus(order.table_id, 'available');
        }
      }
    });

    return this.getOrderById(orderId);
  }

  /**
   * Update payment status and method
   */
  updatePayment(orderId, paymentStatus, paymentMethod) {
    const stmt = db.prepare(`
      UPDATE orders
      SET payment_status = ?,
          payment_method = COALESCE(?, payment_method)
      WHERE id = ?
    `);
    stmt.run(paymentStatus, paymentMethod, orderId);
    return this.getOrderById(orderId);
  }

  /**
   * Get single order by ID with all item details
   */
  getOrderById(id) {
    const order = db.prepare(`
      SELECT o.*, t.table_number, t.location as table_location
      FROM orders o
      LEFT JOIN tables t ON t.id = o.table_id
      WHERE o.id = ?
    `).get(id);

    if (!order) return null;

    order.items = db.prepare(`
      SELECT oi.*, mi.name as item_name, mi.image_url, mi.prep_time_minutes
      FROM order_items oi
      JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE oi.order_id = ?
    `).all(id);

    return order;
  }

  /**
   * Get order by order_number (e.g. for customer tracker)
   */
  getOrderByNumber(orderNumber) {
    const order = db.prepare(`
      SELECT o.*, t.table_number, t.location as table_location
      FROM orders o
      LEFT JOIN tables t ON t.id = o.table_id
      WHERE o.order_number = ?
    `).get(orderNumber.trim().toUpperCase());

    if (!order) return null;

    order.items = db.prepare(`
      SELECT oi.*, mi.name as item_name, mi.image_url, mi.prep_time_minutes
      FROM order_items oi
      JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE oi.order_id = ?
    `).all(order.id);

    return order;
  }

  /**
   * List orders with optional status or date filters
   */
  getOrders({ status, orderType, limit = 50 } = {}) {
    let sql = `
      SELECT o.*, t.table_number,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
      FROM orders o
      LEFT JOIN tables t ON t.id = o.table_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }
    if (orderType) {
      sql += ' AND o.order_type = ?';
      params.push(orderType);
    }

    sql += ' ORDER BY o.created_at DESC LIMIT ?';
    params.push(limit);

    return db.prepare(sql).all(...params);
  }
}

module.exports = new OrderService();
