// ============================================================
// PLAID LINK SETUP — Google Apps Script Web App
//
// SETUP:
// 1. Paste this into a NEW Apps Script project
// 2. Fill in YOUR_NEW_PRODUCTION_SECRET below
// 3. Deploy as Web App → Execute as Me → Anyone can access
// 4. Open the web app URL in Chrome to connect your banks
// ============================================================

var PLAID_CLIENT_ID = 'YOUR_PLAID_CLIENT_ID';
var PLAID_SECRET    = 'YOUR_NEW_PRODUCTION_SECRET';
var PLAID_ENV       = 'production';

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Connect Bank Accounts')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function serverCreateLinkToken() {
  var url = 'https://' + PLAID_ENV + '.plaid.com/link/token/create';
  var payload = JSON.stringify({
    client_id: PLAID_CLIENT_ID,
    secret: PLAID_SECRET,
    client_name: 'My Expense Tracker',
    country_codes: ['US'],
    language: 'en',
    user: { client_user_id: 'expense-tracker-user' },
    products: ['transactions']
  });
  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    muteHttpExceptions: true
  });
  return response.getContentText();
}

function serverExchangeToken(publicToken) {
  var url = 'https://' + PLAID_ENV + '.plaid.com/item/public_token/exchange';
  var payload = JSON.stringify({
    client_id: PLAID_CLIENT_ID,
    secret: PLAID_SECRET,
    public_token: publicToken
  });
  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    muteHttpExceptions: true
  });
  return response.getContentText();
}
