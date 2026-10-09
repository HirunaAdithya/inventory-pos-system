# RetailFlow — Complete MERN Inventory & POS Demo

This is a functional general retail shop internship demonstration using MongoDB, Express, React and Node.js. Currency: Sri Lankan rupees (LKR). See limitations before using with real customers.

## Features

| Module | Features |
|---|---|
| Authentication | Admin and cashier login, hashed passwords, JWT sessions, enable/disable accounts, login rate limiting |
| Dashboard | Active products, low-stock count, today's revenue in Sri Lanka time |
| Inventory | Product create/edit/archive/search, SKU or barcode, category, supplier, selling/cost price, quantity, low-stock threshold |
| Stock | Stock in/out adjustments, insufficient-stock checks, movement logs for adjustments and POS sales |
| Management | Categories, suppliers, cashier accounts |
| POS | Barcode/SKU search, cart, cash and demo-card checkout, configurable tax, atomic sale and stock deduction |
| Receipts | Browser-printable receipt after successful cash sale |
| Refunds | Admin-only partial/full returns, optional restocking, refund history and net revenue |
| Reports | Sales history (last 100), gross/net revenue, refunds, transaction count, estimated gross profit |
| Security | Helmet headers, login/API rate limiting, role checks, audit log |

## Requirements

- Node.js 22.12+ and npm
- MongoDB Atlas cluster or replica set supporting transactions
- Modern Chromium-based browser
- Optional USB/Bluetooth barcode scanner that acts as a keyboard and sends Enter

## Setup on a new computer

1. Extract the ZIP and open its `inventory-pos-system` folder in VS Code.
2. From the project root run `npm.cmd run install:all`.
3. Copy `server/.env.example` to `server/.env`.
4. Set `MONGODB_URI` to your Atlas connection string and replace `JWT_SECRET` with a secure random 32+ character value. `VAT_RATE_BPS=1800` represents a demo standard rate of 18%; set each product to Standard, Zero or Exempt. Tax is calculated on top of the selling price. Do not treat this as a legally approved tax configuration. Generate a JWT secret using:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

5. Create the first administrator:

   ```powershell
   npm.cmd run create:admin --prefix server
   ```

   Password entry in this script is visible on the terminal, so perform this privately; do not share screenshots showing credentials.

6. Start the app: `npm.cmd run dev`.
7. Open http://localhost:5173 and sign in. API health: http://localhost:5000/api/health.

## Updating the existing Step 1–4 project

If you already have your `inventory-pos-system` folder connected to GitHub:

1. Back it up before merging.
2. Extract this ZIP separately.
3. Copy `client`, `server`, root `package.json`, `.gitignore`, `README.md` and `SETUP_FULL.md` into your existing project, merging/replacing matching files.
4. **Preserve** your configured `server/.env` and Git metadata (`.git`); this ZIP intentionally excludes them, along with `node_modules`.
5. Run `npm.cmd run install:all`, restart `npm.cmd run dev`, and test before committing.
6. In VS Code Source Control: review changes → Stage → Commit → Sync Changes.

Suggested commit message: `feat: complete retail inventory and POS demo`.

## End-to-end test

1. As Admin, open Inventory. Add a test product named `Coca Cola 500ml`, SKU `CC500`, selling price `180`, cost price `120`, stock `5`, low-stock alert `10` (reuse it if already present).
2. Point of Sale: focus barcode search, type `CC500`, press Enter. Add two bottles. Enter cash received `500`.
3. Complete checkout: total `360`, change `140`.
4. Return to Inventory: stock should now be `3`.
5. Settings → Stock In / Out should show a sale movement of `−2`.
6. Reports should show the new transaction.
7. Settings → Cashier Accounts: create a cashier. Sign out, then sign in as cashier; only Dashboard and Point of Sale should be visible.
8. Create a **DEMO card** sale in POS; no card data or money is transferred.
9. As Admin, go to Reports → Refund, select a quantity, and choose whether returned stock is reusable. Verify refund history and inventory.

Use test items only, not real customer payments.

## Barcode scanning

Enter the exact retail barcode digits in the product's `SKU / Barcode` field, e.g. `4790123456789`. With the POS search focused, scan using a keyboard-type scanner configured with Enter suffix. Typing the SKU then Enter also works. Phone camera barcode capture is not included.

## Integrity and security

- Checkout re-checks authoritative prices and stock on the server. A MongoDB transaction creates the sale, reduces inventory and logs movements together.
- Insufficient stock causes checkout failure with no partial stock deduction. A unique checkout key reduces duplicate sales when retried.
- APIs require login; product modifications, reports and management require Admin role.
- Passwords use bcrypt hashes. Keep `.env`, tokens and customer data out of GitHub.
- Archiving hides products rather than deleting their historical sales references.
- Stock edits from older project versions may not have movement records.

## Demo tax, payment and security notes

- Cash refunds must be handed to the customer manually; this software only records them.
- Demo card payments/refunds make no bank or payment-gateway API calls. Never enter real card numbers.
- Tax is calculated from the configured demo rate and per-product treatment. This does **not** establish Sri Lankan VAT, SSCL or 2026 invoicing compliance.
- Refunds/management are Admin-only; JWT login, rate limiting, audit logs and server-side totals are included. A live deployment still requires professional security, backups and compliance review.

## Limits — portfolio/demo, not a certified retail product

No **real** card payment gateway or bank refunds, certified tax invoices, promotions, dedicated printer driver, offline transactions, multi-branch isolation, camera scanner, backup UI, password reset or deployment automation. Browser sessionStorage JWTs are a demo choice; production should assess hardened HttpOnly cookies, CSRF protection, security logging and monitoring. Estimated profit uses recorded cost price and excludes overhead and returned-cost adjustments. Confirm tax and legal requirements before live business use.

## Layout

```text
inventory-pos-system/
  client/src/       React interface
  server/src/       Express routes, models, middleware
  server/scripts/   First-admin setup
  server/.env.example
  SETUP_FULL.md
```
