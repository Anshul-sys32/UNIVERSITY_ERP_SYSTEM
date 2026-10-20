# UNIVERSITY ERP SYSTEM

This repository now contains both applications under separate top-level directories:

- `frontend/` - React + Vite client application (previous `main` branch contents)
- `backend/` - Express/MariaDB API service (previous `backend` branch contents)

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Other frontend scripts:

```bash
npm run build
npm run lint
npm run preview
```

## Backend

```bash
cd backend
npm install
node index.js
```

Backend environment variables are configured in `backend/.env`:

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

## Notes

- Install dependencies separately in each directory.
- Keep frontend and backend package manifests in their respective folders.
