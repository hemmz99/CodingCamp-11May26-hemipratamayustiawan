// js/app.js — Expense & Budget Visualizer

// =============================================================================
// Formatter Module
// =============================================================================

/**
 * Formats a numeric amount as a currency string.
 * Positive/zero: '$X,XXX.XX'  (e.g. $1,234.56, $0.00)
 * Negative:      '$-X,XXX.XX' (e.g. $-50.00)
 *
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  const negative = amount < 0;
  const abs = Math.abs(amount);
  // Format the absolute value with exactly 2 decimal places and thousands separators
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return negative ? '$-' + formatted : '$' + formatted;
}

/**
 * Returns the arithmetic sum of all `amount` fields in the transactions array.
 * Returns 0 for an empty array.
 *
 * @param {Array<{id: string, name: string, amount: number, category: string}>} transactions
 * @returns {number}
 */
function computeTotal(transactions) {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Computes per-category totals from the transactions array.
 * Only categories with a total greater than 0 are included in the returned object.
 * Valid categories are: 'Food', 'Transport', 'Fun'.
 *
 * @param {Array<{id: string, name: string, amount: number, category: string}>} transactions
 * @returns {{ Food?: number, Transport?: number, Fun?: number }}
 */
function computeCategoryTotals(transactions) {
  const totals = { Food: 0, Transport: 0, Fun: 0 };

  for (const tx of transactions) {
    if (tx.category in totals) {
      totals[tx.category] += tx.amount;
    }
  }

  // Only include categories with a total > 0 (for chart data)
  const result = {};
  for (const category of Object.keys(totals)) {
    if (totals[category] > 0) {
      result[category] = totals[category];
    }
  }

  return result;
}

// =============================================================================
// Validator Module
// =============================================================================

/**
 * Validates the item name field.
 * Trims whitespace from the value; fails if the result is empty.
 *
 * @param {string} value
 * @returns {{ valid: true } | { valid: false, message: string }}
 */
function validateName(value) {
  const trimmed = String(value).trim();
  if (trimmed === '') {
    return { valid: false, message: 'Item name is required.' };
  }
  return { valid: true };
}

/**
 * Validates the transaction amount field.
 * Parses the value as a float; fails if:
 *   - the result is NaN (non-numeric input)
 *   - the value is less than 0.01
 *   - the value is greater than 999,999,999.99
 *   - the value has more than 2 decimal places
 *
 * @param {string|number} value
 * @returns {{ valid: true } | { valid: false, message: string }}
 */
function validateAmount(value) {
  const num = parseFloat(value);

  if (isNaN(num)) {
    return { valid: false, message: 'Amount must be a valid number.' };
  }

  if (num < 0.01) {
    return { valid: false, message: 'Amount must be at least $0.01.' };
  }

  if (num > 999999999.99) {
    return { valid: false, message: 'Amount must not exceed $999,999,999.99.' };
  }

  // Check for more than 2 decimal places by inspecting the string representation.
  // Convert to string and look for a decimal point; if present, count digits after it.
  const str = String(value).trim();
  const dotIndex = str.indexOf('.');
  if (dotIndex !== -1 && str.length - dotIndex - 1 > 2) {
    return { valid: false, message: 'Amount must have at most 2 decimal places.' };
  }

  return { valid: true };
}

/**
 * Validates the transaction category field.
 * Fails if the value is not exactly one of: 'Food', 'Transport', 'Fun'.
 *
 * @param {string} value
 * @returns {{ valid: true } | { valid: false, message: string }}
 */
function validateCategory(value) {
  const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];
  if (!VALID_CATEGORIES.includes(value)) {
    return { valid: false, message: 'Please select a valid category (Food, Transport, or Fun).' };
  }
  return { valid: true };
}

// =============================================================================
// Storage Module
// =============================================================================

/** The localStorage key used to persist transactions. */
const STORAGE_KEY = 'expense_transactions';

/**
 * Serializes the transactions array to JSON and writes it to localStorage.
 * Never throws — all errors are caught and returned as a structured result.
 *
 * @param {Array<{id: string, name: string, amount: number, category: string}>} transactions
 * @returns {{ ok: true } | { ok: false, error: Error }}
 */
function saveTransactions(transactions) {
  try {
    const json = JSON.stringify(transactions);
    localStorage.setItem(STORAGE_KEY, json);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Reads and parses the transactions array from localStorage.
 * Never throws — all errors are caught and returned as a structured result.
 *
 * - Returns `{ data: Transaction[] }` when the key exists and parses successfully.
 * - Returns `{ data: null }` when the key is absent (localStorage returns null).
 * - Returns `{ data: null, error: Error }` when JSON parsing fails (corrupted data).
 *
 * @returns {{ data: Array<{id: string, name: string, amount: number, category: string}> | null, error?: Error }}
 */
function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    // Key is absent — localStorage.getItem returns null for missing keys
    if (raw === null) {
      return { data: null };
    }

    // Key exists — attempt to parse
    const parsed = JSON.parse(raw);
    return { data: parsed };
  } catch (err) {
    // JSON.parse threw (corrupted / non-JSON data)
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// =============================================================================
// State Module
// =============================================================================

/**
 * @typedef {Object} Transaction
 * @property {string} id        - Unique identifier; generated via crypto.randomUUID()
 *                                or Date.now().toString() as a fallback.
 * @property {string} name      - Item name; trimmed, non-empty string.
 * @property {number} amount    - Positive float with at most 2 decimal places
 *                                (range: 0.01 – 999,999,999.99).
 * @property {string} category  - One of: 'Food' | 'Transport' | 'Fun'.
 */

/**
 * In-memory store of all recorded transactions.
 * This array is the single source of truth for the current session.
 * It is populated on page load from localStorage and mutated by
 * addTransaction / deleteTransaction.
 *
 * @type {Transaction[]}
 */
let transactions = [];

// =============================================================================
// Transaction Controller
// =============================================================================

/**
 * Adds a new transaction to the in-memory state, persists it to localStorage,
 * and re-renders all dependent UI components.
 *
 * Steps:
 *  1. Generate a unique id using crypto.randomUUID() when available, falling
 *     back to Date.now().toString() for environments that do not support it.
 *  2. Coerce `amount` to a number via parseFloat so the stored value is always
 *     a numeric type regardless of how the caller passes it.
 *  3. Append the new Transaction object to the in-memory `transactions` array.
 *  4. Synchronously write the updated array to localStorage via saveTransactions.
 *  5. Re-render Transaction_List, Balance_Display, and Chart.
 *
 * Note: renderTransactionList, renderBalance, and renderChart are defined in
 * the Render Module (a later section of this file) and will be available at
 * call time because all functions are hoisted / declared before the first
 * user interaction triggers this function.
 *
 * @param {string} name       - Item name (trimmed, non-empty).
 * @param {number|string} amount - Positive numeric amount (0.01 – 999,999,999.99).
 * @param {string} category   - One of: 'Food' | 'Transport' | 'Fun'.
 * @returns {void}
 */
function addTransaction(name, amount, category) {
  // Step 1: Generate a unique id
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Date.now().toString();

  // Step 2: Ensure amount is stored as a number
  const numericAmount = parseFloat(amount);

  // Step 3: Build the Transaction object and append it to the array
  const transaction = {
    id,
    name: String(name).trim(),
    amount: numericAmount,
    category,
  };

  transactions.push(transaction);

  // Step 4: Synchronously persist to localStorage
  saveTransactions(transactions);

  // Step 5: Re-render all dependent UI components
  renderTransactionList();
  renderBalance();
  renderChart();
}

/**
 * Displays a non-blocking error banner at the top of the page.
 * The banner auto-dismisses after 5 seconds and can be closed manually.
 * Uses a simple DOM-based toast/banner approach — no alert() dialogs.
 *
 * @param {string} message - The error message to display.
 * @returns {void}
 */
function showNonBlockingError(message) {
  // Remove any existing error banner to avoid stacking
  const existing = document.getElementById('nb-error-banner');
  if (existing) {
    existing.remove();
  }

  const banner = document.createElement('div');
  banner.id = 'nb-error-banner';
  banner.setAttribute('role', 'alert');
  banner.setAttribute('aria-live', 'assertive');
  banner.style.cssText = [
    'position: fixed',
    'top: 16px',
    'left: 50%',
    'transform: translateX(-50%)',
    'background: #c0392b',
    'color: #fff',
    'padding: 12px 20px',
    'border-radius: 6px',
    'box-shadow: 0 2px 8px rgba(0,0,0,0.25)',
    'z-index: 9999',
    'font-size: 14px',
    'max-width: 90vw',
    'display: flex',
    'align-items: center',
    'gap: 12px',
  ].join(';');

  const text = document.createElement('span');
  text.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'Dismiss error');
  closeBtn.style.cssText = [
    'background: none',
    'border: none',
    'color: #fff',
    'cursor: pointer',
    'font-size: 16px',
    'padding: 0',
    'line-height: 1',
  ].join(';');
  closeBtn.addEventListener('click', () => banner.remove());

  banner.appendChild(text);
  banner.appendChild(closeBtn);
  document.body.appendChild(banner);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (banner.parentNode) {
      banner.remove();
    }
  }, 5000);
}

/**
 * Removes a transaction from the in-memory state by its id, synchronously
 * persists the updated array to localStorage, and re-renders all dependent
 * UI components.
 *
 * Steps:
 *  1. Find the index of the transaction with the given id.
 *  2. If not found, return early (no-op).
 *  3. Remove the transaction from the array using splice (saves a copy first
 *     so it can be restored on storage failure).
 *  4. Synchronously write the updated array to localStorage via saveTransactions.
 *  5. If saveTransactions returns { ok: false }, restore the entry at its
 *     original index and show a non-blocking error message.
 *  6. If saveTransactions returns { ok: true }, re-render Transaction_List,
 *     Balance_Display, and Chart.
 *
 * @param {string} id - The unique identifier of the transaction to delete.
 * @returns {void}
 */
function deleteTransaction(id) {
  // Step 1: Find the index of the transaction
  const index = transactions.findIndex((tx) => tx.id === id);

  // Step 2: If not found, nothing to do
  if (index === -1) {
    return;
  }

  // Step 3: Remove the transaction, keeping a copy for potential restoration
  const [removed] = transactions.splice(index, 1);

  // Step 4: Synchronously persist to localStorage
  const result = saveTransactions(transactions);

  // Step 5: Storage failed — restore the entry and show a non-blocking error
  if (!result.ok) {
    transactions.splice(index, 0, removed);
    showNonBlockingError(
      'Could not save changes. Your transaction was not deleted. Please try again.'
    );
    return;
  }

  // Step 6: Storage succeeded — re-render all dependent UI components
  renderTransactionList();
  renderBalance();
  renderChart();
}

// =============================================================================
// Chart Module
// =============================================================================

/**
 * Module-level Chart.js instance.
 * Initialized once by initChart() and updated by updateChart().
 * @type {Chart|null}
 */
let chartInstance = null;

/**
 * Fixed color palette for the three spending categories.
 * Index order matches the category order: Food, Transport, Fun.
 */
const CATEGORY_COLORS = {
  Food:      '#FF6384',
  Transport: '#36A2EB',
  Fun:       '#FFCE56',
};

/**
 * Creates a Chart.js pie chart on the given canvas element and stores the
 * instance in the module-level `chartInstance` variable.
 *
 * The chart is initialized with empty data; call `updateChart(data)` to
 * populate it with real values.
 *
 * @param {HTMLCanvasElement} canvasEl - The <canvas> element to render the chart on.
 * @returns {void}
 */
function initChart(canvasEl) {
  chartInstance = new Chart(canvasEl, {
    type: 'pie',
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 16,
            font: { size: 14 },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const total = context.dataset.data.reduce((sum, v) => sum + v, 0);
              const value = context.parsed;
              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
              return ` ${context.label}: ${formatCurrency(value)} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

/**
 * Updates the Chart.js instance with new category data.
 *
 * - When `values` is empty or every value is zero: hides the canvas element
 *   and shows the #chart-empty empty-state message.
 * - Otherwise: shows the canvas, hides #chart-empty, updates the chart's
 *   labels, data, and background colors, then calls `chartInstance.update()`.
 *
 * @param {{ labels: string[], values: number[] }} data
 *   `labels` — category names (e.g. ['Food', 'Transport'])
 *   `values` — matching totals per category (e.g. [12.50, 8.00])
 * @returns {void}
 */
function updateChart(data) {
  const canvasEl   = document.getElementById('spending-chart');
  const emptyEl    = document.getElementById('chart-empty');
  const { labels, values } = data;

  // Determine whether there is anything meaningful to display
  const hasData = values.length > 0 && values.some((v) => v > 0);

  if (!hasData) {
    // Empty state: hide chart canvas, show placeholder message
    if (canvasEl) canvasEl.style.display = 'none';
    if (emptyEl)  emptyEl.style.display  = '';
    return;
  }

  // Data present: show canvas, hide placeholder message
  if (canvasEl) canvasEl.style.display = '';
  if (emptyEl)  emptyEl.style.display  = 'none';

  // Map each label to its designated color; fall back to a neutral grey
  const backgroundColors = labels.map(
    (label) => CATEGORY_COLORS[label] || '#CCCCCC'
  );

  // Update the chart instance in-place and trigger a re-render
  chartInstance.data.labels                        = labels;
  chartInstance.data.datasets[0].data              = values;
  chartInstance.data.datasets[0].backgroundColor   = backgroundColors;
  chartInstance.update();
}

// =============================================================================
// Render Module
// =============================================================================

/**
 * Rebuilds the #transaction-list <ul> DOM completely from the in-memory
 * `transactions` array.
 *
 * - Each <li> shows the item name, formatted amount, and category.
 * - Each <li> includes a delete button wired to deleteTransaction(id).
 * - When `transactions` is empty: clears the list and shows #transaction-list-empty.
 * - When `transactions` has entries: hides #transaction-list-empty.
 *
 * @returns {void}
 */
function renderTransactionList() {
  const listEl  = document.getElementById('transaction-list');
  const emptyEl = document.getElementById('transaction-list-empty');

  if (!listEl) return;

  // Clear existing list items
  listEl.innerHTML = '';

  if (transactions.length === 0) {
    // Empty state
    if (emptyEl) emptyEl.style.display = '';
    return;
  }

  // Has transactions — hide empty-state message
  if (emptyEl) emptyEl.style.display = 'none';

  for (const tx of transactions) {
    const li = document.createElement('li');
    li.dataset.id = tx.id;

    // Info container
    const infoDiv = document.createElement('div');
    infoDiv.className = 'transaction-info';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'transaction-name';
    nameSpan.textContent = tx.name;

    const amountSpan = document.createElement('span');
    amountSpan.className = 'transaction-amount';
    amountSpan.textContent = formatCurrency(tx.amount);

    const categorySpan = document.createElement('span');
    categorySpan.className = 'transaction-category';
    categorySpan.textContent = tx.category;

    infoDiv.appendChild(nameSpan);
    infoDiv.appendChild(amountSpan);
    infoDiv.appendChild(categorySpan);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.dataset.id = tx.id;
    deleteBtn.setAttribute('aria-label', 'Delete ' + tx.name);
    deleteBtn.addEventListener('click', function () {
      deleteTransaction(tx.id);
    });

    li.appendChild(infoDiv);
    li.appendChild(deleteBtn);
    listEl.appendChild(li);
  }
}

/**
 * Computes the running total from the `transactions` array, formats it as
 * currency, and updates the text content of #balance-amount.
 *
 * @returns {void}
 */
function renderBalance() {
  const balanceEl = document.getElementById('balance-amount');
  if (!balanceEl) return;

  const total = computeTotal(transactions);
  balanceEl.textContent = formatCurrency(total);
}

/**
 * Computes per-category totals from the `transactions` array and passes the
 * resulting labels and values to updateChart().
 *
 * @returns {void}
 */
function renderChart() {
  const categoryTotals = computeCategoryTotals(transactions);

  const labels = Object.keys(categoryTotals);
  const values = labels.map((label) => categoryTotals[label]);

  updateChart({ labels, values });
}

// =============================================================================
// Form Controller
// =============================================================================

/**
 * Maps an input field id to its corresponding error span id.
 * @type {Object.<string, string>}
 */
const FIELD_ERROR_MAP = {
  'item-name':     'name-error',
  'item-amount':   'amount-error',
  'item-category': 'category-error',
};

/**
 * Handles the Input_Form submit event.
 *
 * Steps:
 *  1. Prevent the default form submission.
 *  2. Clear all existing inline field errors.
 *  3. Read values from #item-name, #item-amount, and #item-category.
 *  4. Run validateName, validateAmount, and validateCategory on each value.
 *  5. If any validation fails: show the inline error for each failing field
 *     and do NOT add a transaction.
 *  6. If all validations pass: call addTransaction(name, parseFloat(amount), category)
 *     then resetForm().
 *
 * @param {Event} event - The form submit event.
 * @returns {void}
 */
function handleFormSubmit(event) {
  event.preventDefault();
  clearFieldErrors();

  const name     = document.getElementById('item-name')     ? document.getElementById('item-name').value     : '';
  const amount   = document.getElementById('item-amount')   ? document.getElementById('item-amount').value   : '';
  const category = document.getElementById('item-category') ? document.getElementById('item-category').value : '';

  const nameResult     = validateName(name);
  const amountResult   = validateAmount(amount);
  const categoryResult = validateCategory(category);

  let hasError = false;

  if (!nameResult.valid) {
    showFieldError('item-name', nameResult.message);
    hasError = true;
  }

  if (!amountResult.valid) {
    showFieldError('item-amount', amountResult.message);
    hasError = true;
  }

  if (!categoryResult.valid) {
    showFieldError('item-category', categoryResult.message);
    hasError = true;
  }

  if (hasError) return;

  addTransaction(name.trim(), parseFloat(amount), category);
  resetForm();
}

/**
 * Resets all Input_Form fields to their default (empty) state.
 *
 * - Clears #item-name value to ''.
 * - Clears #item-amount value to ''.
 * - Resets #item-category to its default option (value = '').
 *
 * @returns {void}
 */
function resetForm() {
  const nameEl     = document.getElementById('item-name');
  const amountEl   = document.getElementById('item-amount');
  const categoryEl = document.getElementById('item-category');

  if (nameEl)     nameEl.value     = '';
  if (amountEl)   amountEl.value   = '';
  if (categoryEl) categoryEl.value = '';
}

/**
 * Renders an inline error message beneath the specified form field.
 *
 * The fieldId is the input element's id (e.g. 'item-name'). The function
 * maps it to the corresponding error span id using FIELD_ERROR_MAP and sets
 * the span's textContent to the provided message.
 *
 * @param {string} fieldId - The id of the input field (e.g. 'item-name').
 * @param {string} message - The error message to display.
 * @returns {void}
 */
function showFieldError(fieldId, message) {
  const errorId = FIELD_ERROR_MAP[fieldId];
  if (!errorId) return;

  const errorEl = document.getElementById(errorId);
  if (errorEl) {
    errorEl.textContent = message;
  }
}

/**
 * Clears all inline field error messages by setting the textContent of
 * #name-error, #amount-error, and #category-error to empty strings.
 *
 * Called at the start of each form submit attempt.
 *
 * @returns {void}
 */
function clearFieldErrors() {
  const nameError     = document.getElementById('name-error');
  const amountError   = document.getElementById('amount-error');
  const categoryError = document.getElementById('category-error');

  if (nameError)     nameError.textContent     = '';
  if (amountError)   amountError.textContent   = '';
  if (categoryError) categoryError.textContent = '';
}

// =============================================================================
// Initialization
// =============================================================================

document.addEventListener('DOMContentLoaded', function () {
  // Task 10.1 — Initialize the Chart.js pie chart on the canvas element
  const canvasEl = document.getElementById('spending-chart');
  initChart(canvasEl);

  // Task 10.2 — Load persisted transactions from localStorage
  const result = loadTransactions();

  if (result.data !== null && Array.isArray(result.data)) {
    // Valid data found — restore the in-memory state
    transactions = result.data;
  } else if (result.data === null && result.error) {
    // Parse error (corrupted data) — start empty and warn the user
    transactions = [];
    showNonBlockingError(
      'Could not load saved data. Starting with an empty list.'
    );
  } else {
    // Key simply absent — start empty silently
    transactions = [];
  }

  // Task 10.3 — Restore the full UI from the loaded state
  renderTransactionList();
  renderBalance();
  renderChart();

  // Task 10.4 — Wire up the form submit handler
  const formEl = document.getElementById('input-form');
  if (formEl) {
    formEl.addEventListener('submit', handleFormSubmit);
  }
});
