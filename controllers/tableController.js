const tableService = require('../services/tableService');

class TableController {
  getTables(req, res) {
    try {
      const tables = tableService.getAllTables();
      res.json({ success: true, count: tables.length, data: tables });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  updateTableStatus(req, res) {
    try {
      const { status } = req.body;
      const updated = tableService.setTableStatus(Number(req.params.id), status);
      res.json({ success: true, message: `Table status updated to ${status}`, data: updated });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  createTable(req, res) {
    try {
      const { tableNumber, capacity, location } = req.body;
      if (!tableNumber || !capacity || !location) {
        return res.status(400).json({ success: false, error: 'Table number, capacity, and location are required' });
      }
      const newTable = tableService.createTable({ tableNumber, capacity, location });
      res.status(201).json({ success: true, message: 'Table added successfully', data: newTable });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  deleteTable(req, res) {
    try {
      tableService.deleteTable(Number(req.params.id));
      res.json({ success: true, message: 'Table deleted successfully' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

module.exports = new TableController();
