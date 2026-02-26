# Frontend Changes – Login & Registration

Summary of updates for the Human Loop frontend (aligned with [FrontendSetUp](https://github.com/mandar-1005/TheHumanLoop/tree/FrontendSetUp)).

---

## Overview

- **Login** and **Registration** pages use the MARi Secure Training design (two-panel layout, validation, Tailwind).
- Unused/legacy code and duplicate assets were removed.
- App entry and styles were fixed so the app builds and runs cleanly.

---

## Additions

### Pages

- **`frontend/src/pages/Login.tsx`**  
  - Login page: Work Email, Password, Remember me, “Sign In Securely”, link to Register.  
  - Left panel: “Welcome Back to Secure Training” and stats (99.9% Uptime, 24/7 Support, SOC 2).  
  - Uses `lucide-react` (Shield, Lock, Mail, AlertCircle) and `react-router-dom` `Link` to `/register`.

- **`frontend/src/pages/Register.tsx`**  
  - Registration page: First/Last name, Work Email, Organization, Role, Password, Confirm Password, acknowledgement checkbox, “Create Secure Account”.  
  - Same two-panel layout; left panel: “Role-Based FedRAMP Compliance Training” and feature list.  
  - “Already registered? **Sign in**” uses `<Link to="/login">` so it goes to the Login page.

### Styles & config

- **`frontend/src/styles/index.css`** – Imports `fonts.css` and `tailwind.css` (no `theme.css`).
- **`frontend/src/styles/fonts.css`** – Inter font.
- **`frontend/src/styles/tailwind.css`** – Tailwind v3 directives (`@tailwind base/components/utilities`).
- **`frontend/tailwind.config.js`** – Tailwind content and theme config.
- **`frontend/postcss.config.js`** – PostCSS with Tailwind and Autoprefixer.

---

## Modifications

### App entry & routing

- **`frontend/src/main.tsx`**  
  - Imports `App` from `./App` (not `./app/App.tsx`).  
  - Imports `./styles/index.css` for global styles.

- **`frontend/src/App.tsx`**  
  - Uses `react-router-dom`: `BrowserRouter`, `Routes`, `Route`, `Navigate`.  
  - Routes: `/` → redirect to `/login`, `/login` → `LoginPage`, `/register` → `RegistrationPage`.  
  - Removed `import './App.css'` (file no longer used).

### Build & config

- **`frontend/vite.config.ts`**  
  - Uses only `@vitejs/plugin-react` (removed `@tailwindcss/vite` so build works with PostCSS + Tailwind v3).

### Navigation

- **Register → Login**  
  - “Sign in” on the registration page is a `<Link to="/login">` so it navigates to the Login page.

- **Login → Register**  
  - “Create Secure Account” on the login page is a `<Link to="/register">` to the Registration page.

---

## Removals

- **`frontend/src/app/`** (entire folder) – Old app entry, router, routes, and unused UI components.
- **`frontend/src/styles/theme.css`** – Tailwind v4 theme; not used with current PostCSS/Tailwind v3 setup.
- **Legacy registration export folder** (removed) – Design is implemented in `src/pages/Login.tsx` and `src/pages/Register.tsx`.
- **`frontend/src/App.css`** – Removed; global styles come from `styles/index.css`.
- **`frontend/src/styles/Login.css`** – Replaced by Tailwind on the Login page.
- **`frontend/src/index.css`** – Replaced by `styles/index.css`.
- **Old assets** (e.g. `Lock.png`, `User.png`, `react.svg`) – Replaced by `lucide-react` icons.

---

## How to run

```bash
cd frontend
npm install
npm run dev
```

Then open the URL shown (e.g. `http://localhost:5173/` or `http://localhost:5174/`).  
`/` redirects to `/login`; from there you can go to Register and back via “Sign in” and “Create Secure Account”.

---

## Dependencies (relevant)

- `react`, `react-dom`
- `react-router-dom` – routing and `Link` for Login/Register
- `lucide-react` – icons (Shield, Lock, Mail, AlertCircle, CheckCircle2)
- `tailwindcss`, `postcss`, `autoprefixer` – styling and build

---

*Last updated: Frontend setup with Login and Registration pages and cleanup.*
