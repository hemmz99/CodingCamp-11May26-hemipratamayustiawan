# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, categorize spending, and visualize their budget distribution through an interactive pie chart. The application runs entirely in the browser with no backend server, persists data using the browser's Local Storage API, and is built with plain HTML, CSS, and Vanilla JavaScript. It is designed to be simple, fast, and usable as a standalone web page or browser extension.

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category.
- **Category**: A classification label for a transaction. Valid values are: `Food`, `Transport`, and `Fun`.
- **Transaction_List**: The scrollable UI component that displays all stored transactions.
- **Input_Form**: The UI form component used to create new transactions.
- **Balance_Display**: The UI component shown at the top of the page that reflects the total sum of all transaction amounts.
- **Chart**: The pie chart UI component that visualizes spending distribution by category.
- **Local_Storage**: The browser's built-in `localStorage` API used for client-side data persistence.
- **Validator**: The client-side logic responsible for checking that all required form fields are filled before submission.

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to fill in a form with an item name, amount, and category so that I can record a new expense transaction.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a text field for the item name, a numeric field for the amount (accepting values between 0.01 and 999,999,999.99 with at most 2 decimal places), and a dropdown selector for the category (`Food`, `Transport`, `Fun`).
2. WHEN the user submits the Input_Form with the item name field containing at least one non-whitespace character, the amount field containing a valid numeric value within the accepted range, and a category selected from the dropdown, THE App SHALL add a new Transaction to the Transaction_List and persist it to Local_Storage.
3. WHEN the user submits the Input_Form with one or more fields empty, blank, or invalid, THE Validator SHALL prevent submission and display an inline error message identifying each field that failed validation.
4. WHEN a Transaction is successfully added, THE Input_Form SHALL reset the item name field to empty, the amount field to empty, and the category dropdown to its default unselected or first-option state.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see a scrollable list of all my recorded transactions so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all stored transactions, each showing the item name, amount, and category.
2. WHILE transactions exist in Local_Storage, THE Transaction_List SHALL render them on page load without requiring user interaction.
3. IF the total height of all transaction entries exceeds the visible height of the Transaction_List container, THEN THE Transaction_List SHALL become vertically scrollable so that all entries remain accessible.
4. WHEN the user clicks the delete control on a transaction entry, THE App SHALL remove that Transaction from the Transaction_List and from Local_Storage; IF the Local_Storage write fails, THE App SHALL display a non-blocking error message and restore the deleted entry to the Transaction_List.
5. WHILE no transactions exist, THE Transaction_List SHALL display a visible empty-state message indicating that no transactions have been recorded.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total spending balance at the top of the page so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of all transaction amounts, formatted with a currency symbol prefix, exactly 2 decimal places, and comma-separated thousands (e.g., `$1,234.56`).
2. WHEN a new Transaction is added, THE Balance_Display SHALL update to reflect the new total without requiring a page reload.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the reduced total without requiring a page reload.
4. WHILE the Transaction_List is empty, THE Balance_Display SHALL show a total of `$0.00`.
5. IF the sum of all transaction amounts results in a negative value, THE Balance_Display SHALL display the negative total using a leading minus sign (e.g., `$-50.00`).

---

### Requirement 4: Spending Distribution Chart

**User Story:** As a user, I want to see a pie chart of my spending by category so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL render as a pie chart where each segment represents a category (`Food`, `Transport`, `Fun`), sized proportionally to that category's share of the total sum of transaction amounts, with each segment labeled with its category name.
2. WHEN a new Transaction is added, THE Chart SHALL update automatically to reflect the new category distribution within 1 second and without requiring a page reload.
3. WHEN a Transaction is deleted, THE Chart SHALL update automatically to reflect the revised category distribution within 1 second and without requiring a page reload.
4. WHILE only one category has transactions, THE Chart SHALL render a full single-segment pie representing 100% of spending.
5. WHILE no transactions exist, THE Chart SHALL render an empty state with no segments displayed.
6. WHEN all transactions belonging to a category are deleted, THE Chart SHALL remove that category's segment entirely so that only categories with a non-zero total remain visible.

---

### Requirement 5: Client-Side Data Persistence

**User Story:** As a user, I want my transactions to be saved between sessions so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL synchronously write the updated transaction list to Local_Storage before returning control to the user interface.
2. WHEN a Transaction is deleted, THE App SHALL synchronously write the updated transaction list to Local_Storage before returning control to the user interface.
3. WHEN the App is loaded and Local_Storage contains a valid, non-null transaction list, THE App SHALL read all transactions from Local_Storage and restore the Transaction_List, Balance_Display, and Chart to reflect the stored transactions.
4. WHEN the App is loaded and Local_Storage contains no entry or a null value for the transaction key, THE App SHALL initialize with an empty transaction list and render the Transaction_List, Balance_Display, and Chart in their default empty state.
5. IF Local_Storage is unavailable or reading the transaction key produces a parse error, THEN THE App SHALL initialize with an empty transaction list and display a non-blocking warning message to the user indicating that saved data could not be loaded.

---

### Requirement 6: Browser Compatibility

**User Story:** As a user, I want the application to work correctly in any modern browser so that I can use it regardless of my preferred browser.

#### Acceptance Criteria

1. THE App SHALL function correctly in the current stable releases of Chrome, Firefox, Edge, and Safari.
2. THE App SHALL use only standard Web APIs and ES6+ JavaScript features supported natively by the browsers listed in criterion 1.
3. THE App SHALL require no installation, build step, or server to run — opening `index.html` directly in a browser SHALL be sufficient to use the App.
4. THE App SHALL not use any browser-specific prefixed CSS properties or JavaScript APIs that are not available across all four listed browsers.

---

### Requirement 7: Performance and Responsiveness

**User Story:** As a user, I want the application to respond instantly to my interactions so that using it feels smooth and efficient.

#### Acceptance Criteria

1. WHEN the App is loaded on a device with a broadband connection of at least 10 Mbps, THE App SHALL render all UI components (Input_Form, Transaction_List, Balance_Display, and Chart) in a visible and interactive state within 2 seconds.
2. WHEN the user adds or deletes a Transaction, THE App SHALL update the Transaction_List, Balance_Display, and Chart within 100 milliseconds.
3. THE App SHALL maintain a responsive layout such that at viewport widths of 320px and above, all UI components are fully visible without horizontal scrolling, no components overlap each other, and all interactive controls remain operable.

---

### Requirement 8: Code and File Structure

**User Story:** As a developer, I want the project to follow a clean, minimal file structure so that the codebase is easy to read and maintain.

#### Acceptance Criteria

1. THE App SHALL be structured with exactly one HTML file (`index.html`) at the project root, exactly one CSS file inside a `css/` directory, and exactly one JavaScript file inside a `js/` directory.
2. THE App SHALL use no JavaScript frameworks (such as React, Vue, or Angular), no build tools (such as Webpack, Vite, or Parcel), and no package managers — only Vanilla JavaScript; any charting library SHALL be loaded exclusively via a `<script>` tag pointing to a CDN URL.
3. THE App SHALL contain no files matching the patterns `*.test.js`, `*.spec.js`, `test-*.js`, `*.test.html`, or `test-*.html` anywhere in the project directory.
4. THE project directory SHALL contain only the following permitted entries: `index.html`, `css/` (containing exactly one `.css` file), `js/` (containing exactly one `.js` file), and optionally a `README.md` file; no other files or directories are permitted.
