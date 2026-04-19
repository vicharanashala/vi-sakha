# Vi-Sakha Frontend Quickstart Guide

Welcome to the Vi-Sakha Frontend! This guide will help you set up and run the frontend for the first time, and explains the available routes for users and lab members.

---

## 1. Prerequisites
- Node.js (v16+ recommended)
- npm (comes with Node.js)

---

## 2. Installation & Setup

Open a terminal and run the following commands:

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install
```

---

## 3. Running the Development Server

```bash
npm run dev
```
- The app will be available at: [http://localhost:5173](http://localhost:5173)

---

## 4. Building for Production

```bash
npm run build
```

To preview the production build:
```bash
npm run preview
```

---

## 5. Linting

```bash
npm run lint
```

---

## 6. Available Routes

- `/` — Landing page (marketing, info, chatbot intro)
- `/login` — Login page
- `/register` — Register page
- `/dashboard` — Student dashboard (after login)
- `/labmember` — Lab Member dashboard (for instructors/lab members)

> **Note:**
> - `/login` and `/register` are for authentication.
> - `/dashboard` is for students after logging in.
> - `/labmember` is for lab members/instructors after logging in.

---


## 7. Troubleshooting
- If you see errors, ensure Node.js and npm are installed and up to date.
- Make sure the backend is running if you want to access protected routes or API data.

---

Happy coding! 🚀
