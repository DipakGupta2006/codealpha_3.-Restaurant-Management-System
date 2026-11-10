/**
 * Restaurant Management System - Live Order Tracker
 */

let pollInterval = null;

async function trackOrder(orderNumber) {
  const num = orderNumber || document.getElementById('orderNumberInput').value.trim();
  const container = document.getElementById('tracking-result-container');

  if (!num) {
    showToast('Please enter an order number', 'warning');
    return;
  }

  container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">Fetching order status...</div>';

  try {
    const res = await fetch(`/api/orders/track/${encodeURIComponent(num)}`);
    const result = await res.json();

    if (!result.success) {
      container.innerHTML = `
        <div style="background: #fff; border-radius: 12px; padding: 30px; border: 1px solid var(--border); text-align: center; box-shadow: var(--shadow-sm);">
          <div style="font-size: 2.5rem; margin-bottom: 10px;">🔍</div>
          <h3 style="color: var(--dark); margin-bottom: 6px;">Order Not Found</h3>
          <p style="color: var(--text-muted); font-size: 0.95rem;">We couldn't find any order matching "<strong>${num}</strong>". Please check your receipt.</p>
        </div>
      `;
      if (pollInterval) clearInterval(pollInterval);
      return;
    }

    const order = result.data;
    renderTrackingView(order, container);

    // Auto refresh active orders
    if (['pending', 'in-preparation', 'ready'].includes(order.status)) {
      if (!pollInterval) {
        pollInterval = setInterval(() => trackOrder(order.order_number), 10000);
      }
    } else {
      if (pollInterval) clearInterval(pollInterval);
    }

  } catch (error) {
    container.innerHTML = '<div style="color: var(--danger); text-align: center; padding: 20px;">Failed to load order. Please try again.</div>';
  }
}

function renderTrackingView(order, container) {
  const steps = [
    { key: 'pending', label: 'Order Received', desc: 'Sent to kitchen display' },
    { key: 'in-preparation', label: 'In Kitchen', desc: 'Chefs are preparing your dishes' },
    { key: 'ready', label: 'Ready', desc: order.order_type === 'dine-in' ? 'Plated & ready for server' : 'Packed for pickup' },
    { key: 'completed', label: 'Served / Done', desc: 'Enjoy your meal!' }
  ];

  const statusOrder = ['pending', 'in-preparation', 'ready', 'served', 'completed'];
  let currentIdx = statusOrder.indexOf(order.status);
  if (order.status === 'served') currentIdx = 3; // map served to completed step

  const isCancelled = order.status === 'cancelled';

  container.innerHTML = `
    <div style="background: #fff; border-radius: 16px; border: 1px solid var(--border); box-shadow: var(--shadow-md); padding: 30px; max-width: 800px; margin: 0 auto;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border); padding-bottom: 20px; margin-bottom: 24px;">
        <div>
          <span style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Tracking Order</span>
          <h2 style="font-size: 1.8rem; color: var(--dark); font-weight: 800; margin-top: 2px;">#${order.order_number}</h2>
          <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">
            Placed on ${new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • 
            <strong style="text-transform: capitalize;">${order.order_type}</strong>
            ${order.table_number ? ` • Table <strong>#${order.table_number}</strong>` : ''}
          </div>
        </div>
        <div style="text-align: right;">
          <span class="badge badge-${order.status}" style="font-size: 0.85rem; padding: 6px 14px;">${order.status.replace('-', ' ')}</span>
          <div style="margin-top: 8px; font-size: 0.85rem; color: #64748b;">
            Payment: <strong style="color: ${order.payment_status === 'paid' ? 'var(--success)' : 'var(--warning)'}; text-transform: uppercase;">${order.payment_status}</strong>
          </div>
        </div>
      </div>

      <!-- Stepper Progress -->
      ${isCancelled ? `
        <div style="background: var(--danger-bg); border: 1px solid #fecaca; color: #991b1b; padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
          <strong>Order Cancelled</strong>: This order was cancelled by the kitchen or guest.
        </div>
      ` : `
        <div style="display: flex; justify-content: space-between; margin-bottom: 35px; position: relative; padding: 0 10px;">
          ${steps.map((s, idx) => {
            const isDone = currentIdx >= idx;
            const isCurrent = currentIdx === idx;
            return `
              <div style="flex: 1; text-align: center; position: relative;">
                <div style="
                  width: 38px; height: 38px; border-radius: 50%; margin: 0 auto 8px;
                  background: ${isDone ? 'var(--primary)' : '#e2e8f0'};
                  color: ${isDone ? '#fff' : '#64748b'};
                  display: flex; align-items: center; justify-content: center;
                  font-weight: bold; font-size: 1rem;
                  box-shadow: ${isCurrent ? '0 0 0 4px var(--primary-light)' : 'none'};
                  transition: all 0.3s;
                ">
                  ${isDone ? '✓' : idx + 1}
                </div>
                <div style="font-weight: ${isDone ? '700' : '500'}; font-size: 0.88rem; color: ${isDone ? 'var(--dark)' : '#94a3b8'};">
                  ${s.label}
                </div>
                <div style="font-size: 0.75rem; color: #94a3b8; display: none; sm:block;">
                  ${s.desc}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}

      <!-- Ordered Items -->
      <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--dark); margin-bottom: 14px;">Items in this Order</h4>
      <div style="border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 20px;">
        ${order.items.map(item => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; border-bottom: 1px solid var(--border); background: #fff;">
            <div style="display: flex; align-items: center; gap: 12px;">
              ${item.image_url ? `<img src="${item.image_url}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">` : ''}
              <div>
                <strong style="font-size: 0.95rem; color: var(--dark);">${item.item_name}</strong>
                <div style="font-size: 0.82rem; color: var(--text-muted);">${item.quantity} × $${item.unit_price.toFixed(2)}</div>
              </div>
            </div>
            <div style="font-weight: 700; font-size: 0.95rem; color: var(--dark);">$${item.subtotal.toFixed(2)}</div>
          </div>
        `).join('')}
        <div style="display: flex; justify-content: space-between; padding: 14px 18px; background: #f8fafc; font-weight: 800; font-size: 1.1rem; color: var(--dark);">
          <span>Total Amount</span>
          <span style="color: var(--primary);">$${order.total_amount.toFixed(2)}</span>
        </div>
      </div>

      <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        ⚡ Auto-updating status in real time. Need assistance? Speak with our restaurant host.
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('trackOrderForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      trackOrder();
    });

    // Check if initial order number passed via URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderNumber = urlParams.get('orderNumber');
    if (orderNumber) {
      const input = document.getElementById('orderNumberInput');
      if (input) input.value = orderNumber;
      trackOrder(orderNumber);
    }
  }
});
