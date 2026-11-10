const { db, runTransaction } = require('../db/database');

class MenuController {
  /**
   * Get all menu items with category and ingredient count
   */
  getAllMenuItems(req, res) {
    try {
      const { category, search, availableOnly } = req.query;
      let sql = `
        SELECT mi.*, c.name as category_name, c.icon as category_icon
        FROM menu_items mi
        LEFT JOIN categories c ON c.id = mi.category_id
        WHERE 1=1
      `;
      const params = [];

      if (category) {
        sql += ' AND (c.name = ? OR mi.category_id = ?)';
        params.push(category, category);
      }

      if (search) {
        sql += ' AND (mi.name LIKE ? OR mi.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      if (availableOnly === 'true' || availableOnly === '1') {
        sql += ' AND mi.is_available = 1';
      }

      sql += ' ORDER BY c.display_order ASC, mi.name ASC';

      const items = db.prepare(sql).all(...params);
      res.json({ success: true, count: items.length, data: items });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get categories list
   */
  getCategories(req, res) {
    try {
      const categories = db.prepare(`
        SELECT c.*, COUNT(mi.id) as item_count
        FROM categories c
        LEFT JOIN menu_items mi ON mi.category_id = c.id
        GROUP BY c.id
        ORDER BY c.display_order ASC
      `).all();
      res.json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get single menu item with recipe ingredients
   */
  getMenuItemById(req, res) {
    try {
      const id = req.params.id;
      const item = db.prepare(`
        SELECT mi.*, c.name as category_name
        FROM menu_items mi
        LEFT JOIN categories c ON c.id = mi.category_id
        WHERE mi.id = ?
      `).get(id);

      if (!item) {
        return res.status(404).json({ success: false, error: 'Menu item not found' });
      }

      item.ingredients = db.prepare(`
        SELECT mii.id as recipe_id, mii.quantity_required, inv.id as inventory_id, inv.item_name, inv.unit, inv.quantity as stock_quantity
        FROM menu_item_ingredients mii
        JOIN inventory inv ON inv.id = mii.inventory_id
        WHERE mii.menu_item_id = ?
      `).all(id);

      res.json({ success: true, data: item });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Create new menu item
   */
  createMenuItem(req, res) {
    try {
      const { categoryId, name, description, price, imageUrl, prepTimeMinutes, ingredients } = req.body;

      if (!name || !price || !categoryId) {
        return res.status(400).json({ success: false, error: 'Name, price, and category are required' });
      }

      const resultId = runTransaction(() => {
        const stmt = db.prepare(`
          INSERT INTO menu_items (category_id, name, description, price, image_url, is_available, prep_time_minutes)
          VALUES (?, ?, ?, ?, ?, 1, ?)
        `);
        const result = stmt.run(
          Number(categoryId),
          name.trim(),
          description ? description.trim() : '',
          parseFloat(price),
          imageUrl ? imageUrl.trim() : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
          parseInt(prepTimeMinutes, 10) || 15
        );

        const menuItemId = Number(result.lastInsertRowid);

        if (Array.isArray(ingredients)) {
          const insertIng = db.prepare(`
            INSERT INTO menu_item_ingredients (menu_item_id, inventory_id, quantity_required)
            VALUES (?, ?, ?)
          `);
          for (const ing of ingredients) {
            if (ing.inventoryId && ing.quantityRequired > 0) {
              insertIng.run(menuItemId, Number(ing.inventoryId), parseFloat(ing.quantityRequired));
            }
          }
        }

        return menuItemId;
      });

      const newItem = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(resultId);
      res.status(201).json({ success: true, message: 'Menu item created successfully', data: newItem });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Update menu item or toggle availability
   */
  updateMenuItem(req, res) {
    try {
      const id = req.params.id;
      const { categoryId, name, description, price, imageUrl, isAvailable, prepTimeMinutes } = req.body;

      const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Menu item not found' });
      }

      const stmt = db.prepare(`
        UPDATE menu_items
        SET category_id = COALESCE(?, category_id),
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            price = COALESCE(?, price),
            image_url = COALESCE(?, image_url),
            is_available = COALESCE(?, is_available),
            prep_time_minutes = COALESCE(?, prep_time_minutes)
        WHERE id = ?
      `);

      stmt.run(
        categoryId ? Number(categoryId) : null,
        name !== undefined ? name.trim() : null,
        description !== undefined ? description.trim() : null,
        price !== undefined ? parseFloat(price) : null,
        imageUrl !== undefined ? imageUrl.trim() : null,
        isAvailable !== undefined ? (isAvailable ? 1 : 0) : null,
        prepTimeMinutes !== undefined ? parseInt(prepTimeMinutes, 10) : null,
        id
      );

      const updated = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
      res.json({ success: true, message: 'Menu item updated', data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Delete menu item
   */
  deleteMenuItem(req, res) {
    try {
      const id = req.params.id;
      const stmt = db.prepare('DELETE FROM menu_items WHERE id = ?');
      const resDb = stmt.run(id);

      if (resDb.changes === 0) {
        return res.status(404).json({ success: false, error: 'Menu item not found' });
      }

      res.json({ success: true, message: 'Menu item deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new MenuController();
