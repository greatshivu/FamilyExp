# Family Expense Manager Backend

The backend is a FastAPI service backed by MongoDB. It provides authentication, family finance APIs, admin workflows, reporting, email notifications, and audit logging.

## Stack

- FastAPI and Uvicorn
- Pydantic request/response models
- Motor with MongoDB for asynchronous application data access
- A separate MongoDB database for audit records
- JWT access and refresh tokens stored in HTTP-only cookies
- Brevo transactional email integration
- Pytest and Requests for API tests

## Environment variables

Create `backend/.env`. Required values:

```dotenv
MONGO_URL=mongodb://localhost:27017
DB_NAME=family_expense
AUDIT_MONGO_URL=mongodb://localhost:27017
AUDIT_DB_NAME=family_expense_audit
JWT_SECRET=replace-with-a-long-random-secret
```

Application and audit databases may use the same MongoDB server, but they should remain separate database names. In production, use a strong unique `JWT_SECRET` and keep `.env` out of source control.

Optional values:

```dotenv
# Comma-separated browser origins. Credentials require explicit origins.
CORS_ORIGINS=http://localhost:3000

# Set production to enable secure auth cookies by default.
ENVIRONMENT=production
# Override cookie security only for local HTTP development.
COOKIE_SECURE=true

# Used in approval and password-reset links.
FRONTEND_URL=http://localhost:3000

# Google OAuth web client credentials. Leave unset to hide Google SSO buttons.
BACKEND_URL=http://localhost:8000
GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

# First admin created during startup. Defaults exist for development only.
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-password

# Enable Brevo email delivery. Without these, messages are logged and skipped.
BREVO_API_KEY=your-brevo-api-key
SENDER_EMAIL=no-reply@example.com
```

Email notifications are best effort. Registration, approval, rejection, deletion, and password-reset messages are logged even when Brevo is not configured.

## Install and run

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

On Windows, activate the environment with `.venv\\Scripts\\activate`.

Service endpoints:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health: `GET /health`
- Detailed health: `GET /health/details`
- Database health: `GET /health/db` (admin authentication required)
- API routes: `/api/*`

## API areas

The API is mounted under `/api` and requires authentication for protected resources.

- `/auth/*`: registration, login, logout, profile, password changes, and password reset.
- `/auth/google/*`: Google sign-in start, callback, and configuration status.
- `/admin/*`: user approval, rejection, editing, reset links, and deletion.
- `/deletion-requests/*`: partner deletion requests and admin decisions.
- `/users/partners`, `/partners`: partner data.
- `/categories`: category management.
- `/incomes`, `/expenses`, `/investments`: transaction CRUD.
- `/accounts`, `/savings`: account and savings CRUD.
- `/reports/*`: summary, monthly, category, partner, transaction, and savings reports.
- `/notes/*`: individual and common notes with replies.
- `/farm-updates`: farm update records and attachments.
- `/audits`: audit records.

## Tests

The API tests require a reachable backend and an approved admin account:

```bash
cd backend
export REACT_APP_BACKEND_URL=http://localhost:8000
export ADMIN_EMAIL=admin@example.com
export ADMIN_PASSWORD='your-admin-password'
pytest -q
```

The test suite creates temporary users and removes them after each test where applicable. Never point it at production data.

## Deployment

For Render, use:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`

Set all required environment variables in the hosting provider. Set `ENVIRONMENT=production`, use a strong unique `JWT_SECRET`, set `COOKIE_SECURE=true`, set `CORS_ORIGINS` to the exact frontend origin (wildcards are rejected), and set `FRONTEND_URL` to the public frontend URL. `/health` remains public for the platform health check; detailed and database health endpoints require an admin session.

### Google SSO setup

1. In Google Cloud Console, configure an OAuth consent screen and create a **Web application** OAuth client.
2. Add the exact backend callback URL to **Authorized redirect URIs**: `${BACKEND_URL}/api/auth/google/callback`.
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BACKEND_URL`, and `GOOGLE_REDIRECT_URI` in the backend environment. Do not expose the client secret in frontend variables.
4. A first-time Google sign-in creates a partner account with `status=pending`, sends the normal signup notifications, and redirects to the existing approval message. The user cannot receive session cookies or access the application until an administrator approves the account.
5. An existing account is matched only by its stored Google subject. Google cannot silently attach itself to an unrelated password account with the same email address; that user must continue using the existing password flow.
