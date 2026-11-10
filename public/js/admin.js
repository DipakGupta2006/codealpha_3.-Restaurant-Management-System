/**
 * Restaurant Management System - Admin Panel Interactivity
 */

function toggleAdminSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
}

// 1. Order Status Updates
async function updateOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const result = await res.json();
    if (result.success) {
      showToast(`Order #${result.data.order_number} marked as ${newStatus}`, 'success');
      setTimeout(() => window.location.reload(), 600);
    } else {
      showToast(result.error || 'Failed to update order status', 'error');
    }
  } catch (err) {
    showToast('Network error updating order status', 'error');
  }
}

// 2. Order Payment Update
async function markOrderPaid(orderId, method = 'cash') {
  try {
    const res = await fetch(`/api/orders/${orderId}/payment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentStatus: 'paid', paymentMethod: method })
    });
    const result = await res.json();
    if (result.success) {
      showToast('Payment marked as PAID', 'success');
      setTimeout(() => window.location.reload(), 600);
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Error updating payment', 'error');
  }
}

// 3. Table Status Updates
async function updateTableStatus(tableId, status) {
  try {
    const res = await fetch(`/api/tables/${tableId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const result = await res.json();
    if (result.success) {
      showToast(`Table #${result.data.table_number} is now ${status}`, 'success');
      setTimeout(() => window.location.reload(), 600);
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Error updating table status', 'error');
  }
}

// 4. Reservation Status Updates
async function updateReservationStatus(reservationId, status) {
  try {
    const res = await fetch(`/api/reservations/${reservationId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const result = await res.json();
    if (result.success) {
      showToast(`Reservation marked as ${status}`, 'success');
      setTimeout(() => window.location.reload(), 600);
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Error updating reservation', 'error');
  }
}

// 5. Inventory Restock
let currentRestockInvId = null;

function openRestockModal(id, name, unit) {
  currentRestockInvId = id;
  const label = document.getElementById('restockItemName');
  const unitLabel = document.getElementById('restockUnitLabel');
  if (label) label.textContent = name;
  if (unitLabel) unitLabel.textContent = unit;
  openModal('restockModal');
}

async function submitRestock(event) {
  event.preventDefault();
  const qtyInput = document.getElementById('restockQuantity');
  const qty = parseFloat(qtyInput.value);

  if (isNaN(qty) || qty <= 0) {
    showToast('Please enter a valid positive quantity', 'warning');
    return;
  }

  try {
    const res = await fetch(`/api/inventory/${currentRestockInvId}/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: qty })
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
      closeModal('restockModal');
      setTimeout(() => window.location.reload(), 600);
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Failed to restock item', 'error');
  }
}

// 6. Menu Item Toggle Availability
async function toggleMenuItemAvailability(id, currentStatus) {
  try {
    const newStatus = currentStatus === 1 ? 0 : 1;
    const res = await fetch(`/api/menu/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: newStatus })
    });
    const result = await res.json();
    if (result.success) {
      showToast(`Item availability updated`, 'success');
      setTimeout(() => window.location.reload(), 500);
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Error updating availability', 'error');
  }
}

// 7. Delete Menu Item
async function deleteMenuItem(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}" from the menu?`)) return;

  try {
    const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast(`Deleted "${name}"`, 'success');
      setTimeout(() => window.location.reload(), 600);
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Error deleting item', 'error');
  }
}

// 8. Add Menu Item Form
async function submitNewMenuItem(event) {
  event.preventDefault();
  const form = event.target;

  const categoryId = form.categoryId.value;
  const name = form.name.value.trim();
  const price = form.price.value;
  const description = form.description.value.trim();
  const imageUrl = form.imageUrl.value.trim();
  const prepTimeMinutes = form.prepTimeMinutes.value;

  try {
    const res = await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId,
        name,
        price,
        description,
        imageUrl,
        prepTimeMinutes
      })
    });
    const result = await res.json();
    if (result.success) {
      showToast(`Added "${name}" to menu!`, 'success');
      closeModal('addMenuItemModal');
      setTimeout(() => window.location.reload(), 600);
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Error creating menu item', 'error');
  }
}

// 9. Add Inventory Item Form
async function submitNewInventoryItem(event) {
  event.preventDefault();
  const form = event.target;

  const itemName = form.itemName.value.trim();
  const category = form.category.value.trim();
  const quantity = form.quantity.value;
  const unit = form.unit.value.trim();
  const minThreshold = form.minThreshold.value;
  const unitCost = form.unitCost.value;

  try {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemName,
        category,
        quantity,
        unit,
        minThreshold,
        unitCost
      })
    });
    const result = await res.json();
    if (result.success) {
      showToast(`Added "${itemName}" to inventory!`, 'success');
      closeModal('addInventoryModal');
      setTimeout(() => window.location.reload(), 600);
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Error creating inventory item', 'error');
  }
}

// 10. Add New Table Form
async function submitNewTable(event) {
  event.preventDefault();
  const form = event.target;
  const tableNumber = form.tableNumber.value;
  const capacity = form.capacity.value;
  const location = form.location.value.trim();

  try {
    const res = await fetch('/api/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNumber, capacity, location })
    });
    const result = await res.json();
    if (result.success) {
      showToast(`Table #${tableNumber} added!`, 'success');
      closeModal('addTableModal');
      setTimeout(() => window.location.reload(), 600);
    } else {
      showToast(result.error, 'error');
    }
  } catch (err) {
    showToast('Error adding table', 'error');
  }
}
