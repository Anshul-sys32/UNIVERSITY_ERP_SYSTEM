# React + Vite

## Student API

The frontend reads the backend URL from `VITE_API_URL`. If it is not set, it
uses `http://localhost:5000`. After importing the backend schema and creating a
student account linked to a row in `STUDENTS.USER_ID`, sign in through the
student portal to load the MySQL-backed dashboard modules.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh
