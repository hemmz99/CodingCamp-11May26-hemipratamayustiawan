# Implementation Plan: Expense & Budget Visualizer

## Overview

This plan implements the Expense & Budget Visualizer as a single-page, client-side web application using plain HTML, CSS, and Vanilla JavaScript with Chart.js loaded from a CDN. The work is organized into twelve tasks that follow the unidirectional data flow described in the design: project scaffolding → pure utility modules → state and controllers → UI rendering → initialization → tests.

## Tasks

- [x] 1. Set up project file structure
  - [x] 1.1 Create `index.html` at the project root with the base HTML boilerplate, linking `css/style.css` and `js/app.js`, and loading Chart.js from a CDN `<script>` tag
  - [x] 1.2 Create `css/style.css` with an empty stylesheet
  - [x] 1.3 Create `js/app.js` with an empty script file
  - **Requirements:** 8.1, 8.2, 8.3, 8.4, 6.3

- [x] 2. Implement the Formatter Module
  - [x] 2.1 Implement `formatCurrency(amount)` — returns a string starting with `$`, exactly 2 decimal places, comma-separated thousands; negative amounts use `$-X,XXX.XX` format
  - [x] 2.2 Implement `computeTotal(transactions)` — returns the arithmetic sum of all `amount` fields
  - [x] 2.3 Implement `computeCategoryTotals(transactions)` — returns an object with per-category sums; only categories with total > 0 are included in chart data
  - **Requirements:** 3.1, 3.5, 4.1, 4.6

- [x] 3. Implement the Storage Module
  - [x] 3.1 Implement `saveTransactions(transactions)` — serializes the array to JSON and writes to `localStorage` key `'expense_transactions'`; returns `{ ok: boolean, error? }` and never throws
  - [x] 3.2 Implement `loadTransactions()` — reads and parses the key; returns `{ data: Transaction[] | null, error? }`; returns `null` data on missing key or parse failure; never throws
  - **Requirements:** 5.1, 5.2, 5.3, 5.4, 5.5

- [x] 4. Implement the Validator Module
  - [x] 4.1 Implement `validateName(value)` — trims whitespace; returns `{ valid: false, message }` if result is empty
  - [x] 4.2 Implement `validateAmount(value)` — parses as float; returns `{ valid: false, message }` if NaN, < 0.01, > 999,999,999.99, or has more than 2 decimal places
  - [x] 4.3 Implement `validateCategory(value)` — returns `{ valid: false, message }` if value is not one of `'Food'`, `'Transport'`, `'Fun'`
  - **Requirements:** 1.1, 1.3

- [x] 5. Implement the State Module and Transaction Controller
  - [x] 5.1 Define the in-memory `transactions` array and the `Transaction` shape (`id`, `name`, `amount`, `category`)
  - [x] 5.2 Implement `addTransaction(name, amount, category)` — appends a new transaction with a unique `id`, synchronously writes to `localStorage`, then re-renders Transaction_List, Balance_Display, and Chart
  - [x] 5.3 Implement `deleteTransaction(id)` — removes the transaction from the array, synchronously writes to `localStorage`; on storage failure, restores the entry and shows a non-blocking error; on success, re-renders all UI components
  - **Requirements:** 1.2, 2.4, 5.1, 5.2

- [ ] 6. Build the HTML layout and CSS styles
  - [x] 6.1 Add the `Input_Form` markup to `index.html` — text field for item name, numeric field for amount, category dropdown (`Food`, `Transport`, `Fun`), submit button, and placeholder elements for inline field error messages
  - [x] 6.2 Add the `Balance_Display` markup — a visible element at the top of the page that will show the formatted total
  - [x] 6.3 Add the `Transaction_List` markup — a scrollable container for transaction entries and an empty-state message element
  - [ ] 6.4 Add the `Chart` markup — a `<canvas>` element for the Chart.js pie chart and an empty-state message element
  - [~] 6.5 Write CSS to make the layout responsive at viewport widths of 320px and above — no horizontal scrolling, no overlapping components, all controls operable; add overflow scrolling to the Transaction_List container
  - **Requirements:** 1.1, 2.3, 2.5, 4.5, 7.3

- [ ] 7. Implement the Chart Module
  - [~] 7.1 Implement `initChart(canvasEl)` — creates and stores a Chart.js pie chart instance on the given canvas element
  - [~] 7.2 Implement `updateChart(data)` — accepts `{ labels, values }`, updates the Chart.js instance datasets and labels, and calls `chart.update()`; hides the canvas and shows the empty-state message when `values` is empty; shows the canvas and hides the empty-state message otherwise
  - **Requirements:** 4.1, 4.4, 4.5, 4.6

- [ ] 8. Implement the Render Module
  - [~] 8.1 Implement `renderTransactionList()` — reads from the `transactions` array and rebuilds the list DOM; each entry shows item name, amount, and category plus a delete button wired to `deleteTransaction(id)`; shows the empty-state message when the array is empty
  - [~] 8.2 Implement `renderBalance()` — computes the total via `computeTotal`, formats it via `formatCurrency`, and updates the Balance_Display element
  - [~] 8.3 Implement `renderChart()` — computes category totals via `computeCategoryTotals` and calls `updateChart` with the resulting labels and values
  - **Requirements:** 2.1, 2.5, 3.1, 3.4, 3.5, 4.1, 4.5, 4.6

- [ ] 9. Implement the Form Controller
  - [~] 9.1 Implement `handleFormSubmit(event)` — reads field values, runs all three validators, shows inline errors for any failures via `showFieldError`, or calls `addTransaction` and then `resetForm` on full success
  - [~] 9.2 Implement `resetForm()` — clears the name field, clears the amount field, and resets the category dropdown to its default state
  - [~] 9.3 Implement `showFieldError(fieldId, message)` — renders an inline error message beneath the specified field
  - [~] 9.4 Implement `clearFieldErrors()` — removes all inline error messages before each submit attempt
  - **Requirements:** 1.2, 1.3, 1.4

- [ ] 10. Implement page load initialization
  - [~] 10.1 On `DOMContentLoaded`, call `initChart` on the chart canvas element
  - [~] 10.2 Call `loadTransactions()`; if data is valid and non-null, populate the `transactions` array; if data is null or a parse error occurred, initialize with an empty array and display a non-blocking warning banner
  - [~] 10.3 Call `renderTransactionList()`, `renderBalance()`, and `renderChart()` to restore the full UI from loaded state
  - [~] 10.4 Attach the `handleFormSubmit` listener to the Input_Form's submit event
  - **Requirements:** 2.2, 5.3, 5.4, 5.5

- [ ] 11. Write property-based tests
  - [~] 11.1 Write property test for P1 — valid transaction addition grows the list by exactly one and the new transaction is retrievable by id
    - **Validates: Requirements 1.2, 2.1**
  - [~] 11.2 Write property test for P2 — whitespace-only names are rejected by the Validator and the transaction list remains unchanged
    - **Validates: Requirements 1.3**
  - [~] 11.3 Write property test for P3 — out-of-range and malformed amounts are rejected by the Validator
    - **Validates: Requirements 1.3**
  - [~] 11.4 Write property test for P4 — localStorage round-trip preserves all transaction fields exactly
    - **Validates: Requirements 5.1, 5.2, 5.3**
  - [~] 11.5 Write property test for P5 — Balance_Display value equals the arithmetic sum of all transaction amounts
    - **Validates: Requirements 3.1, 3.2, 3.3**
  - [~] 11.6 Write property test for P6 — chart segment proportions match category totals; zero-total categories are excluded
    - **Validates: Requirements 4.1, 4.6**
  - [~] 11.7 Write property test for P7 — delete then re-add is idempotent on list length and total balance
    - **Validates: Requirements 2.4, 3.3**
  - [~] 11.8 Write property test for P8 — `formatCurrency` returns a correctly formatted string for any numeric amount
    - **Validates: Requirements 3.1, 3.4, 3.5**
  - **Requirements:** 1.2, 1.3, 2.1, 2.4, 3.1, 3.3, 3.4, 3.5, 4.1, 4.6, 5.1, 5.2, 5.3

- [ ] 12. Write unit and example-based tests
  - [~] 12.1 Test: form submit with all valid fields → transaction added, form reset, list and balance updated
  - [~] 12.2 Test: form submit with empty name → inline error shown, list unchanged
  - [~] 12.3 Test: form submit with invalid amount (e.g., 0, negative, too many decimals) → inline error shown, list unchanged
  - [~] 12.4 Test: page load with valid localStorage data → list, balance, and chart all restored correctly
  - [~] 12.5 Test: page load with no localStorage data → empty state rendered for list, balance shows `$0.00`, chart shows empty state
  - [~] 12.6 Test: page load with corrupted localStorage → warning shown, empty state rendered
  - [~] 12.7 Test: delete with localStorage failure → entry restored in list, non-blocking error shown
  - [~] 12.8 Test: single-category chart → full 100% single-segment pie rendered
  - [~] 12.9 Test: empty chart → canvas hidden, empty-state message visible
  - [~] 12.10 Test: full add → delete cycle → localStorage, list, balance, and chart all stay consistent
  - **Requirements:** 1.2, 1.3, 1.4, 2.2, 2.4, 2.5, 3.1, 3.4, 4.4, 4.5, 5.3, 5.4, 5.5

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2", "3", "4"] },
    { "wave": 3, "tasks": ["5"] },
    { "wave": 4, "tasks": ["6", "7"] },
    { "wave": 5, "tasks": ["8", "9"] },
    { "wave": 6, "tasks": ["10"] },
    { "wave": 7, "tasks": ["11", "12"] }
  ]
}
```

Tasks 2–4 are pure utility modules with no DOM dependencies and can be developed and tested in isolation. Tasks 5–10 build on each other in sequence. Tasks 11 and 12 depend on all implementation tasks being complete.

## Notes

- The project must contain no test files matching `*.test.js`, `*.spec.js`, `test-*.js`, `*.test.html`, or `test-*.html` inside the project directory (Requirement 8.3). Property-based and unit tests should be run from an external test harness or a separate directory outside the project root.
- Chart.js must be loaded exclusively via a CDN `<script>` tag — no npm, no bundler (Requirement 8.2).
- All `localStorage` access must be wrapped in `try/catch`; the app must remain functional in the current session even when storage is unavailable (Requirements 5.1, 5.2, 5.5).
- The `fast-check` library is used for property-based testing as specified in the design. Each PBT runs a minimum of 100 iterations.
- Currency formatting for negative totals uses the `$-X,XXX.XX` pattern (e.g., `$-50.00`), not `(-$50.00)` (Requirement 3.5).
