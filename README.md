# 📊 Personal Tracker — Expenses & Commute

A mobile-first web app for logging expenses and commute times directly to Google Sheets, with automatic daily bank transaction sync via Plaid.

---

## Features

- **Expense Tracker** — manually log expenses from your iPhone with category, description, merchant, payment type, and date
- **Commute Tracker** — log daily drive times including departure, ETA, and actual arrival
- **Plaid Auto-Sync** — automatically pulls transactions daily from Chase, Capital One, SoFi, and Schwab into Google Sheets
- **Swipe navigation** — slide between Expense and Commute screens
- **Add to Home Screen** — works as a standalone iPhone app via Safari

---

## Files

| File | Description |
|---|---|
| `expense-tracker.html` | Main iPhone web app — hosted on GitHub Pages |
| `plaid-sync.gs` | Google Apps Script — Plaid sync + commute logging backend |

---

## Setup

### 1. Google Apps Script

1. Open your Google Sheet → **Extensions → Apps Script**
2. Create a **new project** and paste the contents of `plaid-sync.gs`
3. Fill in the credentials at the top:
   ```javascript
   var PLAID_CLIENT_ID = 'your_client_id';
   var PLAID_SECRET    = 'your_production_secret';
   var PLAID_ENV       = 'production';
   var SHEET_NAME      = 'All EXPENSES';
   var SPREADSHEET_ID  = 'your_spreadsheet_id';
   ```
4. Deploy as **Web App** → Execute as Me → Anyone can access
5. Copy the `/exec` URL

### 2. iPhone App

1. Open `https://yourusername.github.io/expenses/expense-tracker.html` in Safari
2. Tap **Share → Add to Home Screen**
3. Open the app → tap ⚙️ → paste your Apps Script URL → tap Save

### 3. Plaid Auto-Sync

1. Sign up at [dashboard.plaid.com](https://dashboard.plaid.com)
2. Connect each bank via the Plaid Link setup page to get access tokens
3. Paste tokens into the `ACCESS_TOKENS` array in `plaid-sync.gs`
4. Update `TOKEN_PAYMENT_TYPES` and `TOKEN_ACCOUNT_NAMES` to match
5. Run `createDailyTrigger()` once in Apps Script to enable daily 6am sync

---

## Google Sheet Structure

### All EXPENSES tab
| Col | Field |
|---|---|
| A | Full Date (M/D/YYYY) |
| B | Month (formula) |
| C | Day (formula) |
| D | Year (formula) |
| E | *(blank)* |
| F | Category |
| G | Expense Description |
| H | Where |
| I | Cost |
| J | Payment Type |
| K | Transaction ID *(hide this column — used for dedup)* |
| L | Account |

### Drive Time tab
| Col | Field |
|---|---|
| A | Day |
| B | Time Leave |
| C | ETA Arrive |
| D | Actual Arrive |

---

## Expense Categories

**Quick buttons:** Food, Misc, Groceries, Roth IRA, Donation, House

**Dropdown:** Gas, Bills, Travel, Card, Rental, Clothing, Investment, Doctor, Car, Mom, Hair, Medicine, Parking, Souvenir, Shoes, Dad, Loan, Insurance, 529 Plan

---

## Payment Types

**Quick buttons:** Credit, Apple Pay, Venmo, Cash

**Dropdown:** Check, Debit, PayPal, Checking

---

## Notes

- Plaid skips **pending transactions** to avoid duplicates — charges appear 1-3 days after posting
- Transaction IDs in column K prevent duplicate entries on daily sync
- The `syncDateRange()` function can be used for one-time historical imports — update `START_DATE` and `END_DATE` at the top of the function
