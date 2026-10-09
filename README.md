# RetailFlow — Inventory Management + POS (MERN)

General retail shop inventory and point-of-sale application. **Phase 1:** project setup and a connected frontend/backend health check. Inventory/POS features are planned and are **not yet implemented**.

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

## Planned milestones

1. Project scaffolding and Git/GitHub setup (this phase)
2. Secure admin/cashier authentication (login and role checking implemented)
3. Products, categories, suppliers and inventory movements
4. POS cart, atomic checkout, receipts and stock deduction
5. Sales reports, search and alerts
6. Testing, documentation and deployment

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
- POS checkout must use validated totals, authorization and a MongoDB transaction so stock and sale records stay consistent. Not implemented in Phase 1.

## Phase 2: Authentication setup

1. Set `JWT_SECRET` in `server/.env` to a random 32+ character value, replacing the placeholder.
2. From the project root, run `npm install --prefix server` to install the login rate limiter.
3. Run `npm run create:admin --prefix server` to create the first admin account. Enter your name, email and a unique password of at least 12 characters. The password is visible while entering, so keep the terminal private and clear its history afterward.
4. Run `npm run dev` and sign in at http://localhost:5173.

There is no public registration. Admin and cashier roles are validated by the backend. Creating additional cashier accounts is a subsequent feature. JWT expires after eight hours and is kept in sessionStorage; production deployment should consider HttpOnly cookies with appropriate CSRF protections.
