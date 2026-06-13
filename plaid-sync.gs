// ============================================================
// PLAID → GOOGLE SHEETS AUTO SYNC
// ============================================================
// Credentials are stored securely in Apps Script Properties.
// Run setupCredentials() once to save them, then delete it.
// ============================================================

// ============================================================
// ACCESS TOKENS — order must match TOKEN_PAYMENT_TYPES and
// TOKEN_ACCOUNT_NAMES arrays below
// ============================================================
const ACCESS_TOKENS = [
  'Bank-1-Access-token', // Bank/Credit Card #1
  'Bank-2-Access-token', // Bank/Credit Card #2
  'Bank-3-Access-token', // Bank/Credit Card #3
];

// ============================================================
// PAYMENT TYPES — same order as ACCESS_TOKENS
// ============================================================
const TOKEN_PAYMENT_TYPES = [
  'Credit',    // Credit Card Account (ie Chase, Capital One, Amex, etc)
  'Credit',    // Credit Card Account (ie Chase, Capital One, Amex, etc)
  'Checking',  // Checking Account (ie Chase, Wells Fargo, SoFi, Bank of America, etc)
];

// ============================================================
// ACCOUNT NAMES — same order as ACCESS_TOKENS
// ============================================================
const TOKEN_ACCOUNT_NAMES = [
  'Credit',    // Credit Card Account Name (ie Chase, Capital One, Amex, etc)
  'Credit',    // Credit Card Account Name (ie Chase, Capital One, Amex, etc)
  'Checking',  // Checking Account Name (ie Chase, Wells Fargo, SoFi, Bank of America, etc)
];

// ============================================================
// GET CONFIG — reads from top-level variables above
// ============================================================
function getConfig() {
  return {
    PLAID_CLIENT_ID: PLAID_CLIENT_ID,
    PLAID_SECRET:    PLAID_SECRET,
    PLAID_ENV:       PLAID_ENV || 'production',
    SHEET_NAME:      SHEET_NAME,
    SPREADSHEET_ID:  SPREADSHEET_ID,
  };
}

// ============================================================
// CREDENTIALS — fill in your values here
// ============================================================
var PLAID_CLIENT_ID = 'YOUR_PLAID_CLIENT_ID';
var PLAID_SECRET    = 'YOUR_PRODUCTION_SECRET';   // paste your production secret
var PLAID_ENV       = 'production';
var SHEET_NAME      = 'YOUR_GOOGLE_SHEET_NAME';
var SPREADSHEET_ID  = 'YOUR_SPREADSHEET_ID';      // paste your spreadsheet ID


// ============================================================
// CATEGORY MAPPING — Plaid personal_finance_category → Your categories
// ============================================================
function mapCategory(pfc) {
  if (!pfc) return 'Misc';

  const primary  = (pfc.primary  || '').toUpperCase();
  const detailed = (pfc.detailed || '').toUpperCase();

  // Skip income and transfers
  if (primary === 'INCOME')             return null;
  if (primary === 'TRANSFER_IN')        return null;
  if (primary === 'LOAN_DISBURSEMENTS') return null;
  if (detailed.includes('TRANSFER_OUT_ACCOUNT_TRANSFER')) return null;
  if (detailed.includes('TRANSFER_OUT_SAVINGS'))          return null;

  // Groceries
  if (detailed.includes('GROCERY') || detailed.includes('SUPERSTORE') || detailed.includes('SUPERSTORES')) return 'Groceries';

  // Food & Drink
  if (primary === 'FOOD_AND_DRINK') return 'Food';

  // Gas
  if (detailed.includes('GAS') || detailed.includes('FUEL')) return 'Gas';

  // Transport / Car
  if (detailed.includes('PARKING')) return 'Parking';
  if (detailed.includes('AUTO_MAINTENANCE') || detailed.includes('CAR_RENTAL') || detailed.includes('CAR_WASH')) return 'Car';
  if (primary === 'TRANSPORTATION') return 'Car';

  // Travel
  if (primary === 'TRAVEL') return 'Travel';

  // Health
  if (detailed.includes('PHARMACIES') || detailed.includes('PHARMACY')) return 'Medicine';
  if (primary === 'MEDICAL') return 'Doctor';

  // Bills & Utilities
  if (primary === 'RENT_AND_UTILITIES') return 'Bills';
  if (detailed.includes('INSURANCE')) return 'Insurance';
  if (detailed.includes('LOAN')) return 'Loan';

  // Shopping
  if (detailed.includes('CLOTHING') || detailed.includes('APPAREL')) return 'Clothing';
  if (detailed.includes('SHOES') || detailed.includes('FOOTWEAR')) return 'Shoes';
  if (detailed.includes('HAIR') || detailed.includes('SALON') || detailed.includes('BARBER') || detailed.includes('PERSONAL_CARE_HAIR')) return 'Hair';
  if (detailed.includes('DONATION') || detailed.includes('CHARITY')) return 'Donation';
  if (detailed.includes('SOUVENIR') || detailed.includes('GIFT')) return 'Souvenir';

  // Home
  if (detailed.includes('HOME_IMPROVEMENT') || detailed.includes('HARDWARE') || detailed.includes('FURNITURE')) return 'House';
  if (primary === 'HOME_IMPROVEMENT') return 'House';

  // Investments / Retirement
  if (detailed.includes('RETIREMENT') || detailed.includes('ROTH') || detailed.includes('IRA')) return 'Roth IRA';
  if (detailed.includes('529') || detailed.includes('EDUCATION')) return '529 Plan';
  if (primary === 'INVESTMENTS') return 'Investment';

  // Entertainment / General
  if (primary === 'ENTERTAINMENT')       return 'Misc';
  if (primary === 'GENERAL_MERCHANDISE') return 'Misc';

  return 'Misc';
}

// ============================================================
// HELPERS
// ============================================================
function mapPaymentType(tokenIndex) {
  return TOKEN_PAYMENT_TYPES[tokenIndex] || 'Credit';
}

function mapAccountName(tokenIndex) {
  return TOKEN_ACCOUNT_NAMES[tokenIndex] || 'Unknown';
}

function formatDate(plaidDate) {
  const parts = plaidDate.split('-');
  return parseInt(parts[1]) + '/' + parseInt(parts[2]) + '/' + parts[0];
}

function plaidRequest(endpoint, payload) {
  const config = getConfig();
  const url = `https://${config.PLAID_ENV}.plaid.com${endpoint}`;
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      client_id: config.PLAID_CLIENT_ID,
      secret:    config.PLAID_SECRET,
      ...payload
    }),
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}

function getExistingTransactionIds(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return new Set();
  const ids = sheet.getRange(2, 11, lastRow - 1, 1).getValues();
  return new Set(ids.map(r => r[0]).filter(Boolean));
}

function getNextRow(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 2;
  const colA = sheet.getRange(1, 1, lastRow).getValues();
  for (let i = lastRow - 1; i >= 0; i--) {
    if (colA[i][0] !== '') return i + 2;
  }
  return 2;
}

function writeRows(sheet, newRows) {
  if (newRows.length === 0) {
    Logger.log('No new transactions found.');
    return;
  }
  newRows.sort((a, b) => new Date(a[0]) - new Date(b[0]));
  let nextRow = getNextRow(sheet);
  for (const row of newRows) {
    sheet.getRange(nextRow, 1, 1, 12).setValues([row]);
    if (nextRow > 2) {
      sheet.getRange(nextRow - 1, 2, 1, 3).copyTo(
        sheet.getRange(nextRow, 2, 1, 3)
      );
    }
    nextRow++;
  }
  Logger.log(`✓ Added ${newRows.length} new transactions.`);
}

// ============================================================
// BUILD ROW — skips pending, credits, and income/transfers
// ============================================================
function buildRow(tx, tokenIndex) {
  if (tx.pending === true) return null;  // skip pending transactions
  if (tx.amount < 0)       return null;  // skip refunds/credits
  const category = mapCategory(tx.personal_finance_category);
  if (category === null)   return null;  // skip income/transfers

  return [
    formatDate(tx.date),               // A - Full Date
    '', '', '', '',                    // B,C,D - Month/Day/Year (formula), E - blank
    category,                          // F - Category
    tx.name || '',                     // G - Expense Description
    tx.merchant_name || tx.name || '', // H - Where
    parseFloat(tx.amount.toFixed(2)),  // I - Cost
    mapPaymentType(tokenIndex),        // J - Payment Type
    tx.transaction_id,                 // K - Transaction ID (hidden, for dedup)
    mapAccountName(tokenIndex),        // L - Account
  ];
}

// ============================================================
// MAIN DAILY SYNC — runs automatically each morning
// ============================================================
function syncTransactions() {
  if (ACCESS_TOKENS.length === 0) {
    Logger.log('No access tokens configured.');
    return;
  }

  const config = getConfig();
  const ss     = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet  = ss.getSheetByName(config.SHEET_NAME);
  if (!sheet) { Logger.log(`Sheet "${config.SHEET_NAME}" not found.`); return; }

  const existingIds = getExistingTransactionIds(sheet);
  const newRows     = [];

  const endDate   = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 2);
  const fmt = d => d.toISOString().split('T')[0];

  for (let tokenIndex = 0; tokenIndex < ACCESS_TOKENS.length; tokenIndex++) {
    const token = ACCESS_TOKENS[tokenIndex];
    try {
      const data = plaidRequest('/transactions/get', {
        access_token: token,
        start_date:   fmt(startDate),
        end_date:     fmt(endDate),
        options: { count: 100, offset: 0 }
      });

      if (data.error_code) {
        Logger.log(`Error for token ${tokenIndex}: ${data.error_message}`);
        continue;
      }

      for (const tx of data.transactions) {
        if (existingIds.has(tx.transaction_id)) continue;
        const row = buildRow(tx, tokenIndex);
        if (row) newRows.push(row);
      }
    } catch (e) {
      Logger.log(`Exception for token ${tokenIndex}: ${e.toString()}`);
    }
  }

  writeRows(sheet, newRows);
}

// ============================================================
// ONE-TIME DATE RANGE SYNC
// Change START_DATE and END_DATE then run this function
// ============================================================
function syncDateRange() {
  const START_DATE = '2025-02-01';
  const END_DATE   = '2025-04-30';

  if (ACCESS_TOKENS.length === 0) {
    Logger.log('No access tokens configured.');
    return;
  }

  const config = getConfig();
  const ss     = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet  = ss.getSheetByName(config.SHEET_NAME);
  if (!sheet) { Logger.log('Sheet not found.'); return; }

  const existingIds = getExistingTransactionIds(sheet);
  const newRows     = [];

  for (let tokenIndex = 0; tokenIndex < ACCESS_TOKENS.length; tokenIndex++) {
    const token = ACCESS_TOKENS[tokenIndex];
    try {
      let offset = 0;
      while (true) {
        const data = plaidRequest('/transactions/get', {
          access_token: token,
          start_date: START_DATE,
          end_date:   END_DATE,
          options: { count: 500, offset: offset }
        });

        if (data.error_code) {
          Logger.log(`Error: ${data.error_message}`);
          break;
        }

        for (const tx of data.transactions) {
          if (existingIds.has(tx.transaction_id)) continue;
          const row = buildRow(tx, tokenIndex);
          if (row) newRows.push(row);
        }

        offset += data.transactions.length;
        if (offset >= data.total_transactions) break;
      }
    } catch (e) {
      Logger.log(`Exception: ${e.toString()}`);
    }
  }

  writeRows(sheet, newRows);
}

// ============================================================
// DEBUG — check what categories Plaid is sending
// ============================================================
function debugCategories() {
  const token = ACCESS_TOKENS[0];
  const today = new Date().toISOString().split('T')[0];
  const week  = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0];
  const data  = plaidRequest('/transactions/get', {
    access_token: token,
    start_date: week,
    end_date: today,
    options: { count: 10, offset: 0 }
  });
  data.transactions.forEach(tx => {
    Logger.log(`${tx.name} | pending: ${tx.pending} | ${JSON.stringify(tx.personal_finance_category)}`);
  });
}

// ============================================================
// SET UP DAILY TRIGGER — run once manually
// ============================================================
function createDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'syncTransactions') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('syncTransactions')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
  Logger.log('✓ Daily trigger created — syncs every day at 6am.');
}

// ============================================================
// COMMUTE TRACKER — logs to a separate sheet tab
// ============================================================
function doGet(e) {
  const action = e && e.parameter && e.parameter.action;

  if (action === 'log_commute') {
    return logCommute(e.parameter);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function logCommute(params) {
  try {
    const config = getConfig();
    const ss     = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    const sheet  = ss.getSheetByName('YOUR_GOOGLE_SHEET_NAME');
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: 'Drive Time sheet not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Find the next empty row based on column A
    const lastRow = sheet.getLastRow();
    let nextRow = lastRow + 1;
    const colA = sheet.getRange(1, 1, lastRow).getValues();
    for (let i = lastRow - 1; i >= 0; i--) {
      if (colA[i][0] !== '') { nextRow = i + 2; break; }
    }

    sheet.getRange(nextRow, 1, 1, 4).setValues([[
      params.day,
      params.timeLeave,
      params.etaArrive,
      params.actualArrive
    ]]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(e) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
