# Kaundinya Tradings

A financial-services marketing site with a **SIP calculator** and **insurance lead capture**, split into two independent parts:

```
Ins/
├── frontend/     Static site (HTML / CSS / vanilla JS) — SIP calculator, insurance forms
└── backend/      Express API — receives enquiries and saves them to a leads file
```

The two run separately so you can develop each on its own.

## 1. Run the backend (lead API)

```bash
cd backend
npm install
npm start          # → http://localhost:4000
```

Every insurance enquiry submitted on the frontend is appended to:
- `backend/data/leads.json`
- `backend/data/leads.csv`

View captured leads: <http://localhost:4000/api/leads?key=kaundinya-admin>

## 2. Run the frontend (website)

Open `frontend/index.html` directly, or serve it:

```bash
cd frontend
python3 -m http.server 8000   # → http://localhost:8000
```

The frontend talks to the backend using `window.API_BASE` in
[`frontend/config.js`](frontend/config.js) (default `http://localhost:4000`).

## How lead capture works

1. On the **Insurance** section, the user clicks *Get Quote* for a plan (Bike, Car, Health, …).
2. A modal asks for their **mobile number first**.
3. On submit, the frontend `POST`s to `POST {API_BASE}/api/lead`.
4. The backend validates the number and appends the lead to the leads file — so you have a record of everyone who enquired and can contact them later.

## Live website

https://kaundinya-tradings.vercel.app
