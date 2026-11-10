/**
 * Restaurant Management System - Table Reservation Script
 */

let selectedTableId = null;

async function checkTableAvailability() {
  const dateInput = document.getElementById('resDate');
  const timeInput = document.getElementById('resTime');
  const guestsInput = document.getElementById('resGuests');
  const resultsContainer = document.getElementById('availability-results');

  if (!dateInput || !timeInput || !guestsInput || !resultsContainer) return;

  const date = dateInput.value;
  const time = timeInput.value;
  const guests = guestsInput.value;

  if (!date || !time) return;

  resultsContainer.innerHTML = '<div style="padding: 16px; color: var(--text-muted); text-align: center;">Checking table availability...</div>';

  try {
    const res = await fetch(`/api/tables/available?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}&guests=${encodeURIComponent(guests)}`);
    const result = await res.json();

    if (!result.success) {
      resultsContainer.innerHTML = `<div style="padding: 14px; background: var(--danger-bg); color: var(--danger); border-radius: 8px;">${result.error}</div>`;
      return;
    }

    const availableTables = result.data;
    if (availableTables.length === 0) {
      resultsContainer.innerHTML = `
        <div style="padding: 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; text-align: center;">
          <h4 style="color: #b45309; margin-bottom: 4px;">No Tables Available</h4>
          <p style="font-size: 0.9rem; color: #78350f;">All matching tables are reserved for this time slot. Please try another time or party size.</p>
        </div>
      `;
      selectedTableId = null;
      return;
    }

    // Default select first available table
    if (!selectedTableId || !availableTables.some(t => t.id === selectedTableId)) {
      selectedTableId = availableTables[0].id;
    }

    resultsContainer.innerHTML = `
      <div style="margin-bottom: 12px; font-weight: 600; font-size: 0.95rem; color: var(--success); display: flex; align-items: center; gap: 6px;">
        <span>✅ ${availableTables.length} tables available for ${guests} guests</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px;">
        ${availableTables.map(t => `
          <div class="table-option-card ${t.id === selectedTableId ? 'selected' : ''}" 
               onclick="selectReservationTable(${t.id}, this)"
               style="border: 2px solid ${t.id === selectedTableId ? 'var(--primary)' : 'var(--border)'}; 
                      background: ${t.id === selectedTableId ? 'var(--primary-light)' : '#fff'};
                      padding: 12px; border-radius: 10px; cursor: pointer; transition: all 0.2s;">
            <div style="font-weight: 700; font-size: 1.05rem; color: var(--dark);">Table #${t.table_number}</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${t.location}</div>
            <div style="font-size: 0.82rem; margin-top: 4px; font-weight: 600; color: #475569;">Seats: ${t.capacity} guests</div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    resultsContainer.innerHTML = '<div style="color: var(--danger); padding: 10px;">Failed to check table availability.</div>';
  }
}

function selectReservationTable(tableId, element) {
  selectedTableId = tableId;
  const cards = document.querySelectorAll('.table-option-card');
  cards.forEach(c => {
    c.style.borderColor = 'var(--border)';
    c.style.background = '#fff';
  });
  if (element) {
    element.style.borderColor = 'var(--primary)';
    element.style.background = 'var(--primary-light)';
  }
}

async function handleReservationSubmit(event) {
  event.preventDefault();
  const form = event.target;

  const customerName = form.customerName.value.trim();
  const customerPhone = form.customerPhone.value.trim();
  const customerEmail = form.customerEmail.value.trim();
  const reservationDate = form.reservationDate.value;
  const reservationTime = form.reservationTime.value;
  const guestCount = form.guestCount.value;
  const specialRequests = form.specialRequests ? form.specialRequests.value.trim() : '';

  if (!customerName || !customerPhone || !reservationDate || !reservationTime || !guestCount) {
    showToast('Please fill in all required fields', 'warning');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const origText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Booking Table...';

  try {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName,
        customerPhone,
        customerEmail,
        tableId: selectedTableId,
        guestCount,
        reservationDate,
        reservationTime,
        specialRequests
      })
    });

    const result = await res.json();

    if (!result.success) {
      showToast(result.error || 'Failed to book reservation', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = origText;
      return;
    }

    const resData = result.data;
    const confirmDetails = document.getElementById('reservation-success-details');
    if (confirmDetails) {
      confirmDetails.innerHTML = `
        <div style="text-align: center; padding: 10px 0;">
          <div style="font-size: 3rem; margin-bottom: 8px;">🥂</div>
          <h3 style="color: var(--dark); margin-bottom: 6px;">Table Reserved!</h3>
          <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 16px;">We look forward to hosting you, <strong>${resData.customer_name}</strong>.</p>
          <div style="background: #f8fafc; border: 1px dashed var(--border); border-radius: 8px; padding: 14px; text-align: left; font-size: 0.9rem; margin-bottom: 18px;">
            <div style="margin-bottom: 6px;">📅 Date: <strong>${resData.reservation_date}</strong></div>
            <div style="margin-bottom: 6px;">⏰ Time: <strong>${resData.reservation_time}</strong></div>
            <div style="margin-bottom: 6px;">👥 Guests: <strong>${resData.guest_count} persons</strong></div>
            <div style="margin-bottom: 6px;">🪑 Assigned Table: <strong>Table #${resData.table_number} (${resData.table_location})</strong></div>
            <div>📞 Contact: <strong>${resData.customer_phone}</strong></div>
          </div>
          <button class="btn btn-primary" onclick="closeModal('reservation-success-modal'); window.location.reload();">Done</button>
        </div>
      `;
      openModal('reservation-success-modal');
    } else {
      showToast('Reservation confirmed successfully!', 'success');
      form.reset();
    }
  } catch (error) {
    showToast('Network error while booking table', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = origText;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('reservationForm');
  if (form) {
    form.addEventListener('submit', handleReservationSubmit);

    const dateInput = document.getElementById('resDate');
    const timeInput = document.getElementById('resTime');
    const guestsInput = document.getElementById('resGuests');

    if (dateInput && timeInput && guestsInput) {
      dateInput.addEventListener('change', checkTableAvailability);
      timeInput.addEventListener('change', checkTableAvailability);
      guestsInput.addEventListener('change', checkTableAvailability);

      // Run initial check
      checkTableAvailability();
    }
  }
});
