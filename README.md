# Family Expense Manager

Family Expense Manager is a web application for managing shared family finances and farm operations. It supports income, expenses, investments, bank accounts, savings, categories, monthly and yearly reports, notes, farm updates, audit history, and administrator approval workflows.

## Application structure

```text
FamilyExp/
├── backend/                 FastAPI API, MongoDB access, auth, email, and tests
├── frontend/                React application and Tailwind/Shadcn UI
├── design_guidelines.json   Product and visual design requirements
└── README.md                Project-wide documentation
```

The frontend calls the backend at `${REACT_APP_BACKEND_URL}/api`. Authentication uses HTTP-only access and refresh cookies. MongoDB stores application data; audit records use a separate MongoDB database.

## Main capabilities

- Registration, Google/password login, administrator approval/rejection, logout, password reset, and idle logout. New Google accounts also require administrator approval before access.
- Profile updates for name, phone, and preferred currency.
- Per-user currency preference: `INR` or `USD`, defaulting to INR. The saved preference is applied throughout monetary displays and does not convert stored numeric amounts.
- Income, expense, and investment tracking with categories, dates, notes, attachments, and partner pocket investments.
- Bank accounts, savings entries, monthly savings summaries, and account balances.
- Monthly, category, partner, and transaction reports with CSV/PDF export.
- Individual notes, common notes with replies, and farm update uploads.
- Admin user management, deletion approval workflow, and audit logs.

## Prerequisites

- Python 3.10 or newer
- Node.js and npm
- Yarn 1.x is recommended because the frontend declares a Yarn package manager
- MongoDB connection strings for the application and audit databases
- Brevo account and API key only if real email delivery is required

## Configuration

Create `backend/.env` using the variables documented in [backend/README.md](backend/README.md). At minimum, the backend needs MongoDB URLs/database names and `JWT_SECRET`.

Create `frontend/.env`:

```dotenv
REACT_APP_BACKEND_URL=http://localhost:8000
```

`REACT_APP_BACKEND_URL` must be the backend origin without the `/api` suffix. The frontend adds `/api` itself.

Google SSO is configured only on the backend. Set the Google OAuth variables documented in [backend/README.md](backend/README.md), and register `${BACKEND_URL}/api/auth/google/callback` as an exact Google Cloud authorized redirect URI.

## Local development

Start the backend in one terminal:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Start the frontend in another terminal:

```bash
cd frontend
yarn install
yarn start
```

Open `http://localhost:3000`. The backend API documentation is available at `http://localhost:8000/docs`; health endpoints are available at `/health`, `/health/details`, and `/health/db`.

## Testing and validation

With the backend running and its test environment variables available:

```bash
cd backend
pytest -q
```

Frontend commands:

```bash
cd frontend
yarn test
yarn build
```

The backend tests use `REACT_APP_BACKEND_URL`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` to connect to an approved test environment.

## Render deployment

### Backend web service

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`
- Include changes under `backend/**`; ignore `frontend/**` for a backend-only service.
- Configure the backend environment variables before starting the service.

### Frontend hosting

Build the frontend with `yarn build` and deploy the generated `frontend/build` directory using a static hosting service. Set `REACT_APP_BACKEND_URL` to the deployed backend origin and configure the backend `CORS_ORIGINS` and `FRONTEND_URL` values to match the deployed frontend.

See the component-specific documentation for complete backend configuration and frontend development details:

- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
