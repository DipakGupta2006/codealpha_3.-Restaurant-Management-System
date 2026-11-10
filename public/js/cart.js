/**
 * Restaurant Management System - Shopping Cart & Order Checkout
 */

const CART_KEY = 'gourmet_bistro_cart';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateHeaderCartBadge();
  renderCartUI();
}

function addToCart(menuItem) {
  const cart = getCart();
  const existing = cart.find(i => i.menuItemId === menuItem.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: parseFloat(menuItem.price),
      imageUrl: menuItem.imageUrl,
      quantity: 1
    });
  }

  saveCart(cart);
  showToast(`Added "${menuItem.name}" to your order!`, 'success');
}

function updateCartQuantity(menuItemId, change) {
  let cart = getCart();
  const item = cart.find(i => i.menuItemId === menuItemId);
  if (!item) return;

  item.quantity += change;
  if (item.quantity <= 0) {
    cart = cart.filter(i => i.menuItemId !== menuItemId);
  }

  saveCart(cart);
}

function removeFromCart(menuItemId) {
  let cart = getCart();
  cart = cart.filter(i => i.menuItemId !== menuItemId);
  saveCart(cart);
  showToast('Item removed from order', 'info');
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateHeaderCartBadge();
  renderCartUI();
}

function renderCartUI() {
  const cartContainer = document.getElementById('cart-items-container');
  const cartSummary = document.getElementById('cart-summary');
  const cartEmpty = document.getElementById('cart-empty');
  const cartTotalEl = document.getElementById('cart-total-amount');

  if (!cartContainer) return; // not on order page

  const cart = getCart();

  if (cart.length === 0) {
    cartContainer.innerHTML = '';
    if (cartEmpty) cartEmpty.style.display = 'block';
    if (cartSummary) cartSummary.style.display = 'none';
    return;
  }

  if (cartEmpty) cartEmpty.style.display = 'none';
  if (cartSummary) cartSummary.style.display = 'block';

  let total = 0;
  cartContainer.innerHTML = cart.map(item => {
    const subtotal = item.price * item.quantity;
    total += subtotal;
    return `
      <div class="cart-item-row" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid var(--border);">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${item.imageUrl ? `<img src="${item.imageUrl}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover;">` : ''}
          <div>
            <h4 style="font-size: 0.95rem; margin-bottom: 2px;">${item.name}</h4>
            <div style="font-size: 0.85rem; color: var(--primary); font-weight: 600;">$${item.price.toFixed(2)}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="display: flex; align-items: center; background: #e2e8f0; border-radius: 6px;">
            <button class="btn btn-sm" onclick="updateCartQuantity(${item.menuItemId}, -1)" style="padding: 2px 8px;">-</button>
            <span style="padding: 0 8px; font-weight: bold; font-size: 0.88rem;">${item.quantity}</span>
            <button class="btn btn-sm" onclick="updateCartQuantity(${item.menuItemId}, 1)" style="padding: 2px 8px;">+</button>
          </div>
          <div style="font-weight: 700; min-width: 60px; text-align: right;">$${subtotal.toFixed(2)}</div>
          <button class="btn btn-sm btn-danger" onclick="removeFromCart(${item.menuItemId})" style="padding: 4px 8px; font-size: 0.75rem;">✕</button>
        </div>
      </div>
    `;
  }).join('');

  if (cartTotalEl) {
    cartTotalEl.textContent = `$${total.toFixed(2)}`;
  }
}

// Order placement handler
async function handlePlaceOrder(event) {
  event.preventDefault();
  const cart = getCart();

  if (cart.length === 0) {
    showToast('Your cart is empty! Please add some dishes first.', 'warning');
    return;
  }

  const form = event.target;
  const orderType = form.orderType.value;
  const tableId = orderType === 'dine-in' ? form.tableId.value : null;
  const customerName = form.customerName.value.trim();
  const customerPhone = form.customerPhone.value.trim();
  const paymentMethod = form.paymentMethod.value;
  const notes = form.notes ? form.notes.value.trim() : '';

  if (orderType === 'dine-in' && !tableId) {
    showToast('Please select your dining table number', 'warning');
    return;
  }

  if (!customerName) {
    showToast('Please enter your name', 'warning');
    return;
  }

  const items = cart.map(i => ({
    menuItemId: i.menuItemId,
    quantity: i.quantity
  }));

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Placing Order...';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderType,
        tableId,
        customerName,
        customerPhone,
        items,
        paymentMethod,
        notes
      })
    });

    const result = await res.json();

    if (!result.success) {
      showToast(result.error || 'Failed to place order', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      return;
    }

    // Success! Clear cart
    clearCart();

    // Show confirmation modal
    const orderData = result.data;
    const modalContent = document.getElementById('order-success-details');
    if (modalContent) {
      modalContent.innerHTML = `
        <div style="text-align: center; padding: 20px 0;">
          <div style="font-size: 3rem; margin-bottom: 10px;">🎉</div>
          <h3 style="color: var(--dark); margin-bottom: 8px;">Order Confirmed!</h3>
          <p style="color: var(--text-muted); margin-bottom: 16px;">Thank you, <strong>${orderData.customer_name}</strong>. Your order has been routed to our kitchen.</p>
          <div style="background: #f8fafc; border: 1px dashed var(--border); border-radius: 8px; padding: 14px; margin-bottom: 20px;">
            <div style="font-size: 0.85rem; color: #64748b;">ORDER NUMBER</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--primary); letter-spacing: 1px;">${orderData.order_number}</div>
            <div style="margin-top: 6px; font-size: 0.9rem;">
              <span>Type: <strong>${orderData.order_type.toUpperCase()}</strong></span>
              ${orderData.table_number ? ` | <span>Table: <strong>#${orderData.table_number}</strong></span>` : ''}
            </div>
            <div style="font-size: 1.1rem; font-weight: 700; margin-top: 8px;">Total: $${Number(orderData.total_amount).toFixed(2)}</div>
          </div>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <a href="/track?orderNumber=${orderData.order_number}" class="btn btn-primary">Track Order Live 🔍</a>
            <a href="/menu" class="btn btn-secondary">Order More</a>
          </div>
        </div>
      `;
      openModal('order-success-modal');
    } else {
      window.location.href = `/track?orderNumber=${orderData.order_number}`;
    }

  } catch (error) {
    showToast('Network error while placing order. Please try again.', 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderCartUI();

  // Watch order type selector to show/hide table dropdown
  const orderTypeSelect = document.getElementById('orderType');
  const tableGroup = document.getElementById('tableSelectionGroup');
  if (orderTypeSelect && tableGroup) {
    orderTypeSelect.addEventListener('change', (e) => {
      if (e.target.value === 'dine-in') {
        tableGroup.style.display = 'block';
      } else {
        tableGroup.style.display = 'none';
      }
    });
  }

  const orderForm = document.getElementById('checkoutForm');
  if (orderForm) {
    orderForm.addEventListener('submit', handlePlaceOrder);
  }
});
