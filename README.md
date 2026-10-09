# RetailFlow — Inventory Management + POS (MERN)

General retail shop inventory and point-of-sale demo application. **See [SETUP_FULL.md](SETUP_FULL.md) for the complete updated setup, features, test plan and limitations.**

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MongoDB Community Server locally **or** a MongoDB Atlas connection URI
- Git

## Run locally

```bash
cd inventory-pos-system
npm run install:all
```

Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` to your MongoDB instance. Never commit `.env`.

```bash
npm run dev
```

- React frontend: http://localhost:5173
- API health endpoint: http://localhost:5000/api/health
- MongoDB health endpoint: http://localhost:5000/api/health/database

The backend waits for a MongoDB connection before starting. You should see **Backend API: online** on the dashboard once configured.

## Implemented modules

1. Project scaffolding, MERN configuration and Git/GitHub workflow
2. Admin/cashier authentication and cashier management
3. Product catalog, categories, suppliers, low-stock alerts and stock movements
4. POS cart, barcode/SKU input, cash and demo-card checkout, configurable tax, receipt and atomic stock deduction
5. Admin-only full/partial refunds, optional restocking, gross/net revenue reports and summary dashboard
6. Basic security controls and audit history
7. Demo test plan and operational documentation (see `SETUP_FULL.md`)

## GitHub setup

Create an **empty** GitHub repository named `inventory-pos-system` (do not add an initial README). From the project root:

```bash
git init -b main
git add .
git commit -m "chore: scaffold MERN inventory POS"
git remote add origin https://github.com/YOUR_USERNAME/inventory-pos-system.git
git push -u origin main
```

For future changes: `git status`, `git add .`, `git commit -m "describe change"`, `git push`. A changed working tree does not update GitHub until committed and pushed.

## Safety notes

- Never commit `.env`, passwords or real customer information.
- POS checkout validates totals, authorizes the user, and uses a MongoDB transaction so stock and sale records stay consistent.

## Phase 2: Authentication setup

1. Set `JWT_SECRET` in `server/.env` to a random 32+ character value, replacing the placeholder.
2. From the project root, run `npm install --prefix server` to install the login rate limiter.
3. Run `npm run create:admin --prefix server` to create the first admin account. Enter your name, email and a unique password of at least 12 characters. The password is visible while entering, so keep the terminal private and clear its history afterward.
4. Run `npm run dev` and sign in at http://localhost:5173.

There is no public registration. Admin and cashier roles are validated by the backend. Admin can create cashier accounts in Settings. JWT expires after eight hours and is kept in sessionStorage; production deployment should consider HttpOnly cookies with appropriate CSRF protections.

## Phase 3: Inventory product catalog

- Sign in as Admin and select **Inventory**. Add a product with unique SKU, name, category, price in LKR, stock quantity and low-stock threshold.
- Edit or archive products using actions in each row. Archiving hides products, preserving their records for future sales references.
- Search by product name, SKU or category. Each API action requires a valid session; changes require the Admin role.
- Dashboard fetches product/stock/revenue summary data. Stock changes and sales are written to movement history.
- Product quantity can be edited; the edit creates an adjustment record. Settings also has a dedicated stock-in/out form.

## Phase 4: Cash POS and barcode input

1. Sign in as Admin or Cashier and open **Point of Sale**.
2. Search by product name or SKU, or focus the input field and scan a barcode using a **USB/Bluetooth keyboard-wedge scanner configured to send Enter**. The stored product SKU must match the exact barcode value printed on the item. Camera scanning is **not** part of this phase.
3. Add products to the cart, set quantities, optionally add customer name, and enter cash received.
4. Press **Complete cash sale**. The server re-reads authoritative product prices, checks available stock, and uses a MongoDB transaction to create one sale record and decrement inventory together. An idempotency key helps prevent duplicate sale records when a request is retried.
5. The receipt can be printed using the browser print dialog. Return to Inventory to confirm stock changed.

**Important:** First test with a sample product (e.g. CC500) and a small transaction. The MongoDB Atlas cluster must support transactions (Atlas replica sets do). There is no card payment gateway, tax, discount, refund, printer driver, offline mode or camera-scanning feature yet. Receipts are browser print views, not tax-compliant invoices. Confirm legal/fiscal requirements before using with live customers.
