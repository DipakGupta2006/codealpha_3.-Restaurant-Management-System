const { db } = require('../db/database');

/**
 * Service handling restaurant inventory operations, stock calculations, and alerts
 */
class InventoryService {
  /**
   * Check if there is enough inventory stock to fulfill the requested order items
   * @param {Array<{menuItemId: number, quantity: number}>} items 
   * @returns {{ canFulfill: boolean, missing: Array<{ item: string, required: number, available: number, unit: string }> }}
   */
  checkStockForOrder(items) {
    if (!items || items.length === 0) {
      return { canFulfill: true, missing: [] };
    }

    // Aggregate total required quantities per inventory item
    const requiredMap = new Map(); // inventory_id -> number

    const getIngredients = db.prepare(`
      SELECT mii.inventory_id, mii.quantity_required, inv.item_name, inv.quantity, inv.unit
      FROM menu_item_ingredients mii
      JOIN inventory inv ON inv.id = mii.inventory_id
      WHERE mii.menu_item_id = ?
    `);

    for (const item of items) {
      const rows = getIngredients.all(item.menuItemId);
      for (const row of rows) {
        const currentReq = requiredMap.get(row.inventory_id) || {
          id: row.inventory_id,
          name: row.item_name,
          unit: row.unit,
          available: Number(row.quantity),
          required: 0
        };
        currentReq.required += Number(row.quantity_required) * Number(item.quantity);
        requiredMap.set(row.inventory_id, currentReq);
      }
    }

    const missing = [];
    for (const [invId, data] of requiredMap.entries()) {
      if (data.available < data.required) {
        missing.push({
          item: data.name,
          required: Number(data.required.toFixed(2)),
          available: Number(data.available.toFixed(2)),
          unit: data.unit
        });
      }
    }

    return {
      canFulfill: missing.length === 0,
      missing
    };
  }

  /**
   * Deduct inventory stock for the placed order
   * NOTE: Must be called inside an active transaction
   * @param {Array<{menuItemId: number, quantity: number}>} items 
   */
  deductStockForOrder(items) {
    const getIngredients = db.prepare(`
      SELECT inventory_id, quantity_required
      FROM menu_item_ingredients
      WHERE menu_item_id = ?
    `);

    const updateInventory = db.prepare(`
      UPDATE inventory
      SET quantity = MAX(0, quantity - ?)
      WHERE id = ?
    `);

    for (const item of items) {
      const rows = getIngredients.all(item.menuItemId);
      for (const ing of rows) {
        const totalDeduct = Number(ing.quantity_required) * Number(item.quantity);
        updateInventory.run(totalDeduct, ing.inventory_id);
      }
    }
  }

  /**
   * Get all inventory items with low-stock flag
   */
  getAllInventory() {
    const stmt = db.prepare(`
      SELECT id, item_name, category, quantity, unit, min_threshold, unit_cost, last_restocked,
             CASE WHEN quantity <= min_threshold THEN 1 ELSE 0 END AS is_low_stock
      FROM inventory
      ORDER BY is_low_stock DESC, category ASC, item_name ASC
    `);
    return stmt.all();
  }

  /**
   * Get items currently at or below minimum threshold
   */
  getLowStockAlerts() {
    const stmt = db.prepare(`
      SELECT id, item_name, category, quantity, unit, min_threshold, unit_cost
      FROM inventory
      WHERE quantity <= min_threshold
      ORDER BY (quantity / min_threshold) ASC
    `);
    return stmt.all();
  }

  /**
   * Restock an inventory item
   */
  restockItem(inventoryId, additionalQuantity) {
    const qty = parseFloat(additionalQuantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Restock quantity must be a positive number');
    }

    const stmt = db.prepare(`
      UPDATE inventory
      SET quantity = quantity + ?,
          last_restocked = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const res = stmt.run(qty, inventoryId);
    if (res.changes === 0) {
      throw new Error('Inventory item not found');
    }
    return this.getItemById(inventoryId);
  }

  /**
   * Update full inventory item properties
   */
  updateItem(id, { itemName, category, quantity, unit, minThreshold, unitCost }) {
    const stmt = db.prepare(`
      UPDATE inventory
      SET item_name = ?,
          category = ?,
          quantity = ?,
          unit = ?,
          min_threshold = ?,
          unit_cost = ?
      WHERE id = ?
    `);
    stmt.run(itemName, category, Number(quantity), unit, Number(minThreshold), Number(unitCost || 0), id);
    return this.getItemById(id);
  }

  /**
   * Add a new inventory item
   */
  addItem({ itemName, category, quantity, unit, minThreshold, unitCost }) {
    const stmt = db.prepare(`
      INSERT INTO inventory (item_name, category, quantity, unit, min_threshold, unit_cost)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(itemName, category, Number(quantity), unit, Number(minThreshold), Number(unitCost || 0));
    return this.getItemById(Number(res.lastInsertRowid));
  }

  /**
   * Delete an inventory item
   */
  deleteItem(id) {
    const stmt = db.prepare('DELETE FROM inventory WHERE id = ?');
    return stmt.run(id);
  }

  getItemById(id) {
    return db.prepare('SELECT * FROM inventory WHERE id = ?').get(id);
  }
}

module.exports = new InventoryService();
