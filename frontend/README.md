# Family Expense Manager Frontend

The frontend is a React single-page application built with Create React App and CRACO. It uses React Router, Tailwind CSS, Shadcn/Radix UI primitives, Recharts, jsPDF, and Papa Parse.

## Requirements

- Node.js and npm
- Yarn 1.x recommended; the repository pins Yarn through `package.json`
- A running Family Expense Manager backend

## Configuration

Create `frontend/.env`:

```dotenv
REACT_APP_BACKEND_URL=http://localhost:8000
```

The value is the backend origin only. API requests are sent to `${REACT_APP_BACKEND_URL}/api`.

Optional development health-check support:

```dotenv
ENABLE_HEALTH_CHECK=true
```

This enables the CRACO health-check plugin during development. It is not required for normal application use.

## Install and run

```bash
cd frontend
yarn install
yarn start
```

The development server opens at `http://localhost:3000` and sends requests directly to the configured backend URL through the shared API client.

If Yarn is unavailable, npm can run the scripts after installing dependencies with `npm install`:

```bash
npm install
npm start
```

## Available scripts

- `yarn start` or `npm start`: run the development server.
- `yarn test` or `npm test`: run the React test runner.
- `yarn build` or `npm run build`: create the production bundle in `build/`.

## Application routes

Public routes:

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`

Protected user routes:

- `/dashboard`
- `/transactions`
- `/accounts`
- `/savings`
- `/categories`
- `/reports`
- `/notes`
- `/farm-updates`
- `/profile`

Protected admin routes:

- `/admin/accounts`
- `/admin/deletions`
- `/audits`

## Frontend behavior

- `AuthProvider` loads `/api/auth/me` and shares the current user with protected pages.
- Authentication requests use credentials so backend cookies are sent with API calls.
- Currency is selected under Profile and saved in the backend user record. New and legacy users default to INR; display formatting switches between Indian INR and US dollar locales.
- Reports provide CSV and PDF exports from the currently loaded report data.
- The interface is designed for mobile-first field use and follows the earthy visual palette in `design_guidelines.json`.

## Production deployment

Run `yarn build` or `npm run build`, then deploy the generated `build/` directory to a static hosting provider. Configure `REACT_APP_BACKEND_URL` at build time, and configure the backend `CORS_ORIGINS` and `FRONTEND_URL` to use the deployed frontend origin.
