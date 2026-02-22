const API_URL = 'api/transactions.php';

const transactionForm = document.getElementById('transactionForm');
const formMessage = document.getElementById('formMessage');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const saveBtn = document.getElementById('saveBtn');
const tableBody = document.getElementById('transactionTableBody');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const balanceEl = document.getElementById('balance');
const filterFromEl = document.getElementById('filterFrom');
const filterToEl = document.getElementById('filterTo');
const includeCancelledEl = document.getElementById('includeCancelled');
const applyFilterBtn = document.getElementById('applyFilterBtn');
const printBtn = document.getElementById('printBtn');

let editId = null;
let currentRows = [];

const currencyFormatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const dateTimeFormatter = new Intl.DateTimeFormat('de-AT', { dateStyle: 'short', timeStyle: 'short' });

function setToday() {
  const dateInput = document.getElementById('date');
  if (!dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

function showMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.style.color = isError ? '#ff8a8a' : '#9ee6a7';
}

function getFormData() {
  const data = {
    invoice_no: document.getElementById('invoice_no').value.trim(),
    type: document.getElementById('type').value,
    description: document.getElementById('description').value.trim(),
    created_by: document.getElementById('created_by').value.trim(),
    amount: Number.parseFloat(document.getElementById('amount').value),
    date: document.getElementById('date').value
  };

  if (!data.invoice_no || !data.type || !data.description || !data.created_by || !data.date) {
    throw new Error('Bitte alle Pflichtfelder ausfüllen.');
  }

  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error('Der Betrag muss größer als 0 sein.');
  }

  return data;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || 'Unbekannter API-Fehler');
  }

  return result;
}

function getFilterQuery() {
  const params = new URLSearchParams();
  if (filterFromEl.value) params.set('from', filterFromEl.value);
  if (filterToEl.value) params.set('to', filterToEl.value);
  params.set('include_cancelled', includeCancelledEl.checked ? '1' : '0');
  return params.toString();
}

function renderRows(rows) {
  tableBody.innerHTML = '';

  if (!rows.length) {
    tableBody.innerHTML = '<tr><td colspan="9">Keine Buchungen vorhanden.</td></tr>';
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement('tr');
    const isCancelled = row.status === 'cancelled';
    if (isCancelled) tr.classList.add('row-cancelled');

    const statusText = isCancelled
      ? `Storniert${row.cancelled_at ? ` (${dateTimeFormatter.format(new Date(row.cancelled_at))})` : ''}`
      : 'Aktiv';

    const cancelInfo = isCancelled
      ? `<div class="cancel-meta">${row.cancelled_by || '-'}${row.cancel_reason ? ` · ${row.cancel_reason}` : ''}</div>`
      : '';

    tr.innerHTML = `
      <td>${row.id}</td>
      <td>${row.invoice_no}</td>
      <td><span class="type-badge ${row.type}">${row.type === 'income' ? 'Einnahme' : 'Ausgabe'}</span></td>
      <td>${row.description}</td>
      <td>${currencyFormatter.format(Number.parseFloat(row.amount))}</td>
      <td>${row.date}</td>
      <td>${row.created_by}</td>
      <td><span class="status-badge ${row.status}">${statusText}</span>${cancelInfo}</td>
      <td>
        <div class="actions">
          <button type="button" data-action="edit" data-id="${row.id}" ${isCancelled ? 'disabled' : ''}>Bearbeiten</button>
          <button type="button" data-action="cancel" data-id="${row.id}" ${isCancelled ? 'disabled' : ''}>Stornieren</button>
          <button type="button" data-action="delete" data-id="${row.id}">Löschen</button>
        </div>
      </td>
    `;

    tableBody.appendChild(tr);
  });
}

function updateStats(rows) {
  const activeRows = rows.filter((row) => row.status === 'active');
  const totals = activeRows.reduce((acc, row) => {
    const amount = Number.parseFloat(row.amount);
    if (row.type === 'income') acc.income += amount;
    else acc.expense += amount;
    return acc;
  }, { income: 0, expense: 0 });

  totalIncomeEl.textContent = currencyFormatter.format(totals.income);
  totalExpenseEl.textContent = currencyFormatter.format(totals.expense);
  balanceEl.textContent = currencyFormatter.format(totals.income - totals.expense);
}

async function loadTransactions() {
  try {
    const query = getFilterQuery();
    const rows = await request(`${API_URL}?${query}`);
    currentRows = rows;
    renderRows(rows);
    updateStats(rows);
  } catch (error) {
    showMessage(`Fehler beim Laden: ${error.message}`, true);
  }
}

function resetForm() {
  editId = null;
  transactionForm.reset();
  setToday();
  saveBtn.textContent = 'Speichern';
  cancelEditBtn.classList.add('hidden');
}

function openPrintView() {
  const rows = currentRows;
  const activeRows = rows.filter((row) => row.status === 'active');
  const totals = activeRows.reduce((acc, row) => {
    const amount = Number.parseFloat(row.amount);
    if (row.type === 'income') acc.income += amount;
    else acc.expense += amount;
    return acc;
  }, { income: 0, expense: 0 });

  const titlePeriod = `${filterFromEl.value || 'Beginn'} bis ${filterToEl.value || 'Heute'}`;
  const lines = rows.map((row) => `
    <tr>
      <td>${row.id}</td>
      <td>${row.date}</td>
      <td>${row.invoice_no}</td>
      <td>${row.type === 'income' ? 'Einnahme' : 'Ausgabe'}</td>
      <td>${row.description}</td>
      <td>${currencyFormatter.format(Number.parseFloat(row.amount))}</td>
      <td>${row.created_by}</td>
      <td>${row.status === 'cancelled' ? 'Storniert' : 'Aktiv'}</td>
    </tr>
  `).join('');

  const popup = window.open('', '_blank', 'width=1200,height=900');
  if (!popup) {
    showMessage('Popup blockiert. Bitte Popups erlauben.', true);
    return;
  }

  popup.document.write(`<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>Kassenbuch Ausdruck</title>
<style>
body{font-family:Arial,sans-serif;padding:24px;color:#111}
h1{margin:0 0 4px;font-size:26px} h2{margin:0 0 16px;font-size:20px;color:#444}
.meta{margin-bottom:16px}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px}
.summary{margin-top:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.summary div{border:1px solid #ccc;padding:10px}
</style></head><body>
<h1>Finanzverwaltung</h1>
<h2>Feuerwehr Wiener Neustadt · Kassenbuch</h2>
<div class="meta"><strong>Zeitraum:</strong> ${titlePeriod}</div>
<table><thead><tr><th>ID</th><th>Datum</th><th>Rechnung</th><th>Typ</th><th>Beschreibung</th><th>Betrag</th><th>Erstellt von</th><th>Status</th></tr></thead>
<tbody>${lines}</tbody></table>
<div class="summary">
  <div><strong>Gesamteinnahmen</strong><br>${currencyFormatter.format(totals.income)}</div>
  <div><strong>Gesamtausgaben</strong><br>${currencyFormatter.format(totals.expense)}</div>
  <div><strong>Kontostand</strong><br>${currencyFormatter.format(totals.income - totals.expense)}</div>
</div>
</body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

transactionForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const payload = getFormData();
    if (editId) {
      await request(`${API_URL}?id=${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
      showMessage('Buchung aktualisiert.');
    } else {
      await request(API_URL, { method: 'POST', body: JSON.stringify(payload) });
      showMessage('Buchung gespeichert.');
    }

    resetForm();
    await loadTransactions();
  } catch (error) {
    showMessage(error.message, true);
  }
});

cancelEditBtn.addEventListener('click', () => {
  resetForm();
  showMessage('Bearbeitung abgebrochen.');
});

applyFilterBtn.addEventListener('click', loadTransactions);
printBtn.addEventListener('click', openPrintView);

tableBody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  try {
    if (action === 'delete') {
      await request(`${API_URL}?id=${id}`, { method: 'DELETE' });
      showMessage('Buchung gelöscht.');
      await loadTransactions();
      return;
    }

    if (action === 'cancel') {
      const cancelledBy = prompt('Wer storniert den Eintrag?', document.getElementById('created_by').value || '');
      if (!cancelledBy) return;
      const cancelReason = prompt('Storno-Grund (optional):', '') || '';

      await request(`${API_URL}?id=${id}&action=cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ cancelled_by: cancelledBy.trim(), cancel_reason: cancelReason.trim() })
      });
      showMessage('Eintrag wurde storniert.');
      await loadTransactions();
      return;
    }

    const row = currentRows.find((item) => String(item.id) === String(id));
    if (!row || row.status === 'cancelled') {
      throw new Error('Stornierte Einträge können nicht bearbeitet werden.');
    }

    document.getElementById('invoice_no').value = row.invoice_no;
    document.getElementById('type').value = row.type;
    document.getElementById('description').value = row.description;
    document.getElementById('amount').value = Number.parseFloat(row.amount).toFixed(2);
    document.getElementById('created_by').value = row.created_by;
    document.getElementById('date').value = row.date;

    editId = id;
    saveBtn.textContent = 'Änderungen speichern';
    cancelEditBtn.classList.remove('hidden');
    showMessage(`Bearbeitung für ID ${id} aktiv.`);
  } catch (error) {
    showMessage(error.message, true);
  }
});

setToday();
loadTransactions();
