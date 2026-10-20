# University ERP backend

## MySQL setup

1. Create the database and tables with `mysql -u root -p < schema.sql`.
   Re-run this command after pulling updates; the schema uses `IF NOT EXISTS`
   and will add the new student ERP tables without removing existing records.
2. Copy `.env.example` to `.env` and set the MySQL credentials.
3. Start the API with `node index.js`.

The API exposes `GET /health`, `POST /login`, `POST /register`, CRUD endpoints
under `/students`, and student-facing data endpoints under
`/student-data/:userId` for the dashboard, assignments, fees, library, events,
question papers, results, and feedback.

Faculty endpoints are available under `/faculty-data/:userId` for the faculty
dashboard, assignments, question bank, and forms. Employee endpoints are
available under `/employee-data/:userId` for operational summaries and
dashboard configuration.

Create role accounts from Insomnia with `POST http://localhost:5000/register`.
Use the JSON body below, changing the username, password, and role:

```json
{
  "username": "accounts.admin",
  "password": "test1234",
  "role": "ACCOUNTANT"
}
```

For the first librarian, use:

```json
{
  "username": "library.admin",
  "password": "test1234",
  "role": "LIBRARIAN"
}
```

The API accepts role names case-insensitively. Valid roles are `STUDENT`,
`FACULTY`, `EMPLOYEE`, `ADMIN`, `LIBRARIAN`, and `ACCOUNTANT`.

After registration, call `POST http://localhost:5000/login` to obtain the
generated `user_id` and confirm the password:

```json
{
  "username": "accounts.admin",
  "password": "test1234"
}
```

Expected login response:

```json
{
  "user_id": 12,
  "username": "accounts.admin",
  "role": "ACCOUNTANT"
}
```

Use the returned `user_id` in the role-specific requests:

```text
GET http://localhost:5000/employee-data/12/summary
GET http://localhost:5000/operations-data/12/accounting/summary
```

For a librarian with ID `13`:

```text
GET http://localhost:5000/employee-data/13/summary
GET http://localhost:5000/operations-data/13/library/catalog
GET http://localhost:5000/operations-data/13/library/issues
```

Accountants can use the accounting endpoints only. Librarians can use the
library endpoints only. `ADMIN` can access both. All employee-portal requests
must include the user ID in the URL.

Placement department endpoints are available to `EMPLOYEE` and `ADMIN` users:

```text
GET   /employee-data/:userId/placements
POST  /employee-data/:userId/placements
GET   /employee-data/:userId/placements/applications
PATCH /employee-data/:userId/placements/:driveId/status
PATCH /employee-data/:userId/placements/applications/:applicationId/status
```

The frontend placement desk is available at
`/erp/employee/placements`. Run the schema import again before using it so the
`PLACEMENT_DRIVES` and `PLACEMENT_APPLICATIONS` tables are created.

Academic operations are available in the student and faculty portals:

```text
GET  /student-data/:userId/courses
GET  /student-data/:userId/timetable
GET  /student-data/:userId/attendance
GET  /faculty-data/:userId/courses
GET  /faculty-data/:userId/timetable
POST /faculty-data/:userId/course-registrations
GET  /faculty-data/:userId/attendance/:courseId
POST /faculty-data/:userId/attendance
```

Run the schema import again to create the academic tables before using these
routes.

Administrators can create and assign courses:

```text
GET   /academic-data/:adminUserId/courses
POST  /academic-data/:adminUserId/courses
PATCH /academic-data/:adminUserId/courses/:courseId/assign
GET   /academic-data/:adminUserId/registrations
POST  /academic-data/:adminUserId/registrations
PATCH /academic-data/:adminUserId/registrations/:registrationId/status
```



MariaDB uses the MySQL wire protocol, so the same schema and configuration work
with either MySQL or MariaDB.
