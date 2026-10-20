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

Create a faculty profile after registering a FACULTY user with
`POST /faculty-data/profiles`.

data insertion in the json format

eg - 
{
  "username": "20BCA1234",
  "password": "test1234",
  "role": "Student"
}


Use these values for role:

"Student"

"Faculty"

"Admin"

"Librarian"

"Accountant"



MariaDB uses the MySQL wire protocol, so the same schema and configuration work
with either MySQL or MariaDB.
