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
| `plaid-link-appscript.gs` | Google Apps Script — one-time setup tool to connect banks and get Plaid access tokens |
| `plaid-sync.gs` | Google Apps Script — daily Plaid transaction sync + commute logging backend |

---

## Setup Overview

There are three pieces to set up. Do them in this order:

1. **Plaid Link** — connect your banks and get access tokens *(one time only)*
2. **Plaid Sync** — paste tokens in and deploy the main backend script
3. **iPhone App** — add to your home screen and paste the script URL

---

## Step 1 — Plaid Link Setup (`plaid-link-appscript.gs`)

This is a one-time tool used to connect each bank account to Plaid and generate access tokens.

1. Sign up at [dashboard.plaid.com](https://dashboard.plaid.com) and get approved
2. Go to **Team Settings → Keys** and copy your `client_id` and `production` secret
3. Go to [script.google.com](https://script.google.com) → **New project**
4. Paste the contents of `plaid-link-appscript.gs`
5. Fill in your credentials at the top:
   ```javascript
   var PLAID_CLIENT_ID = 'your_client_id';
   var PLAID_SECRET    = 'your_production_secret';
   var PLAID_ENV       = 'production';
   ```
6. Deploy as **Web App** → Execute as Me → Anyone can access
7. Open the web app URL in **Chrome** (must be Chrome, not Firefox)
8. Enter a nickname for each bank (e.g. "Chase") → click **Connect a Bank**
9. Log into each institution in the Plaid window that opens
10. Repeat for every bank — each gives you one access token
11. Copy the generated `ACCESS_TOKENS` block shown at the bottom of the page

**Banks to connect:** Chase, Capital One, SoFi, Schwab *(Schwab requires additional Plaid registration — see Notes)*

---

## Step 2 — Plaid Sync Script (`plaid-sync.gs`)

This is the main backend that runs daily to pull transactions and handles commute logging.

1. Open your Google Sheet → **Extensions → Apps Script**
2. Paste the contents of `plaid-sync.gs`
3. Fill in credentials and config at the top:
   ```javascript
   var PLAID_CLIENT_ID = 'your_client_id';
   var PLAID_SECRET    = 'your_production_secret';
   var PLAID_ENV       = 'production';
   var SHEET_NAME      = 'YOUR_SHEET_NAME';
   var SPREADSHEET_ID  = 'your_spreadsheet_id'; // from Google Sheet URL
   ```
4. Paste your access tokens from Step 1:
   ```javascript
   const ACCESS_TOKENS = [
     'access-production-xxx', // Chase
     'access-production-xxx', // Capital One
     'access-production-xxx', // SoFi
   ];
   ```
5. Update payment types and account names to match token order:
   ```javascript
   const TOKEN_PAYMENT_TYPES = ['Credit', 'Credit', 'Checking'];
   const TOKEN_ACCOUNT_NAMES = ['Chase', 'Capital One', 'SoFi'];
   ```
6. Deploy as **Web App** → Execute as Me → Anyone can access → copy the `/exec` URL
7. Run **`createDailyTrigger()`** once to enable automatic 6am daily sync
8. Run **`syncTransactions()`** to test — check your sheet for new rows

**One-time historical import:** Update `START_DATE` and `END_DATE` inside `syncDateRange()` then run it to pull a specific date range.

---

## Step 3 — iPhone App (`expense-tracker.html`)

1. Upload `expense-tracker.html` to your GitHub repo
2. Enable GitHub Pages: **Settings → Pages → Branch: main → Save**
3. Open `https://yourusername.github.io/expenses/expense-tracker.html` in **Safari on iPhone**
4. Tap **Share → Add to Home Screen**
5. Open the app → tap ⚙️ (top right) → paste your Apps Script URL from Step 2 → tap Save
6. Do the same for the Commute tab settings — use the same Apps Script URL

---

## Managing the Daily Trigger

To **change the sync time** or **disable/delete** the trigger:
1. In Apps Script → click the **clock icon ⏰** in the left sidebar (Triggers)
2. Find `syncTransactions` → click the three dots to Edit, Disable, or Delete
3. To re-enable: run `createDailyTrigger()` again from the script

---

## Google Sheet Structure
NOTE: You should use your own google sheet structure

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

## Connected Banks (Plaid)

| Bank | Type | Status |
|---|---|---|
| Chase | Credit | ✅ Connected |
| Capital One | Credit | ✅ Connected |
| SoFi | Checking | ✅ Connected |
| Schwab | Checking | ⏳ Pending Plaid registration |

---

## Notes

- Plaid skips **pending transactions** to avoid duplicates — charges appear 1-3 days after posting
- Transaction IDs prevent duplicate entries on daily sync — you can hide this column
- **Regenerate your Plaid secret** if you ever share it accidentally — Plaid Dashboard → Team Settings → Keys → Regenerate
- The Plaid Link app script (`plaid-link-appscript.gs`) only needs to be run once per bank. After getting your tokens you can leave it deployed or delete it.
