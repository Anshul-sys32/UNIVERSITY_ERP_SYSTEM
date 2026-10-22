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

3. Apply each additive feature migration in order before using its workflow:

   ```sh
   mysql -u root -p university_erp < backend/migrations/002_create_fee_payment_attempts.sql
   mysql -u root -p university_erp < backend/migrations/003_create_exam_workflows.sql
   mysql -u root -p university_erp < backend/migrations/004_create_wallet_workflows.sql
   mysql -u root -p university_erp < backend/migrations/005_create_audit_notifications.sql
   mysql -u root -p university_erp < backend/migrations/006_create_hostel_research_workflows.sql
   ```

4. Copy `backend/.env.example` to `backend/.env`. Set `SESSION_SECRET` to a unique random value from `openssl rand -base64 48` and configure local database credentials. Do not commit `.env`.
5. Install and start the API:

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
- Login and public registration are rate-limited; production permits 10 attempts per IP per 15-minute window.
- Public `POST /register` is limited to eligible students: the username must match the email of an active, unlinked `STUDENTS` row. The role is fixed to `STUDENT`. Provision privileged accounts through an authorized process, never through public registration.
- Existing module URLs retain `:userId` for compatibility, but the server requires it to match the authenticated session. It is not used to establish identity.

The frontend must send cookies with `credentials: "include"` and include the CSRF token on writes; the shared frontend API client does this.

## API modules

- `/students` and `/academic-data/:userId`: administrator-only.
- `/student-data/:userId`: student-only and bound to the signed-in student account.
- `/faculty-data/:userId`: faculty-only and bound to the signed-in faculty account. `POST /faculty-data/profiles` is administrator-only.
- `/employee-data/:userId` and `/operations-data/:userId`: authenticated staff roles with narrower checks for account administration, accounting, library, and placements.
- `GET /health`: API availability.
- `/campus-student/:userId` and `/campus-admin/:userId`: student-owned hostel/research workflows and administrator review.
- `/wallet-data/:userId`, `/wallet-admin/:userId`, `/merchant-data/:userId`: student wallet, administrator policy/reward controls, and merchant-owned catalog/order/refund operations.
- `/notifications/:userId`: read and mark the signed-in user's in-app notifications.
- `/reports/:userId/overview`: admin-only aggregate reporting without student-level rows.

The backend uses Express 5 and MariaDB/MySQL. Use a least-privilege database account outside local development.

## Fees and development payments

Import the additive payment-attempt migration after the session migration:

```sh
mysql -u root -p university_erp < backend/migrations/002_create_fee_payment_attempts.sql
```

Import exam registration and marks workflow tables for the examination cell:

```sh
mysql -u root -p university_erp < backend/migrations/003_create_exam_workflows.sql
```

In development, `MOCK_PAYMENTS_ENABLED=true` enables `POST /student-data/:userId/fees/:feeSource/:feeId/pay`. It marks an eligible existing fee as paid using the amount stored on the server. Requests require the session CSRF token and a unique `Idempotency-Key`; retries return the original payment reference. The student can only pay a fee belonging to their own record. The provider is explicitly `MOCK` and does not charge money. Set `MOCK_PAYMENTS_ENABLED=false` to disable this path.

Production mock payments are disabled regardless of that flag. No payment gateway is configured in this milestone; real payments require an approved provider, server-verified webhooks, reconciliation, and refund workflows before the feature can be used for actual funds.

Exam sessions are created by administrators as drafts, opened for course-registered students, closed before marks submission, approved by a different administrator than the mark editor, then published. Students can see only sessions for courses they are currently registered in and results only after publication. Admin exam endpoints are under `/exam-admin/:userId`; the existing student `/exams`, `/exams/:examSessionId/register`, and `/exam-results` endpoints are under `/student-data/:userId`.

Import the campus-credit ledger and marketplace migration as the next additive migration:

```sh
mysql -u root -p university_erp < backend/migrations/004_create_wallet_workflows.sql
```

The wallet uses immutable ledger rows, database transactions, and idempotent student orders. Faculty rewards enter a request queue; administrators approve against active policy budgets and student caps. Merchant refunds are compensating credits. To enable the `MERCHANT` account type, run migration 004 after the earlier migrations; an administrator must provision an existing active merchant-role user before that user can manage an outlet. Never edit historical ledger entries. Production use also requires agreed campus-credit terms and reconciliation controls.

## Tests

Run `npm test` from `backend/`. Tests use synthetic users, a mocked database, and an in-memory session store; they do not connect to or modify a real database.
