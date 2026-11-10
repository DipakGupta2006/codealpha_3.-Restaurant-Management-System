const inventoryService = require('../services/inventoryService');

class InventoryController {
  getInventory(req, res) {
    try {
      const items = inventoryService.getAllInventory();
      res.json({ success: true, count: items.length, data: items });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  getAlerts(req, res) {
    try {
      const alerts = inventoryService.getLowStockAlerts();
      res.json({ success: true, count: alerts.length, data: alerts });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  restockItem(req, res) {
    try {
      const { quantity } = req.body;
      const updated = inventoryService.restockItem(req.params.id, quantity);
      res.json({
        success: true,
        message: `Successfully restocked ${updated.item_name} with +${quantity} ${updated.unit}`,
        data: updated
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  createItem(req, res) {
    try {
      const { itemName, category, quantity, unit, minThreshold, unitCost } = req.body;
      if (!itemName || !category || !unit) {
        return res.status(400).json({ success: false, error: 'Item name, category, and unit are required' });
      }
      const item = inventoryService.addItem({ itemName, category, quantity, unit, minThreshold, unitCost });
      res.status(201).json({ success: true, message: 'Inventory item added', data: item });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  updateItem(req, res) {
    try {
      const { itemName, category, quantity, unit, minThreshold, unitCost } = req.body;
      const item = inventoryService.updateItem(req.params.id, { itemName, category, quantity, unit, minThreshold, unitCost });
      res.json({ success: true, message: 'Inventory item updated', data: item });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  deleteItem(req, res) {
    try {
      inventoryService.deleteItem(req.params.id);
      res.json({ success: true, message: 'Inventory item deleted' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

module.exports = new InventoryController();
