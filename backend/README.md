# University ERP backend

## Local setup

1. Create the database and import the base schema:

   ```sh
   mysql -u root -p < backend/schema.sql
   ```

2. Create the session table without altering existing data:

   ```sh
   mysql -u root -p university_erp < backend/migrations/001_create_erp_sessions.sql
   ```

3. Copy `backend/.env.example` to `backend/.env`. Set `SESSION_SECRET` to a unique random value from `openssl rand -base64 48` and configure local database credentials. Do not commit `.env`.
4. Install and start the API:

   ```sh
   cd backend
   npm install
   npm start
   ```

The API listens on port `5000` by default. `FRONTEND_ORIGIN` must match the exact frontend origin; multiple origins may be comma-separated. Production must use HTTPS, set `NODE_ENV=production`, and keep `SESSION_SECRET` private.

## Authentication and access

- `POST /login` verifies the password hash and creates a MariaDB-backed server session. The browser receives an HttpOnly session cookie, not an authentication token.
- `GET /me` returns the active session's current user for frontend session restoration.
- `GET /csrf-token` provides the session-bound CSRF token required as `X-CSRF-Token` on state-changing requests, including login and logout.
- `POST /logout` destroys the server-side session and expires the cookie.
- Sessions expire after 30 minutes of inactivity. Active account status and role are rechecked for protected API requests.
- Public `POST /register` is limited to eligible students: the username must match the email of an active, unlinked `STUDENTS` row. The role is fixed to `STUDENT`. Provision privileged accounts through an authorized process, never through public registration.
- Existing module URLs retain `:userId` for compatibility, but the server requires it to match the authenticated session. It is not used to establish identity.

The frontend must send cookies with `credentials: "include"` and include the CSRF token on writes; the shared frontend API client does this.

## API modules

- `/students` and `/academic-data/:userId`: administrator-only.
- `/student-data/:userId`: student-only and bound to the signed-in student account.
- `/faculty-data/:userId`: faculty-only and bound to the signed-in faculty account. `POST /faculty-data/profiles` is administrator-only.
- `/employee-data/:userId` and `/operations-data/:userId`: authenticated staff roles with narrower checks for account administration, accounting, library, and placements.
- `GET /health`: API availability.

The backend uses Express 5 and MariaDB/MySQL. Use a least-privilege database account outside local development.

## Tests

Run `npm test` from `backend/`. Tests use synthetic users, a mocked database, and an in-memory session store; they do not connect to or modify a real database.
