# Setup and deployment

[Live website](https://kaundinya-tradings.vercel.app) · [Project README](../README.md)

## Development

Run these in separate terminals:

```sh
# Terminal 1, from the repository root
cd backend
npm ci
PORT=4011 npm start
```

```sh
# Terminal 2, from the repository root
python3 -m http.server 8010 --bind 127.0.0.1 --directory frontend
```

The website runs at `http://localhost:8010`; the API health route is `http://localhost:4011/health`.

Local leads are stored under `backend/data/`. The local frontend explicitly selects port 4011 in `frontend/config.js`; starting the API on its default port 4000 will not match that setting.

## Deploy your own copy

### Frontend

1. Import `AviralKhanna/kaundinya-tradings`, or your fork, into Vercel.
2. Use the repository root, the **Other** preset, no build command, and `frontend` as the output directory.
3. Update the production branch of `window.API_BASE` in `frontend/config.js` to your backend URL.
4. Deploy.

### Backend

Create a separate Vercel project using `backend` as its root directory. The `api/` handlers provide the serverless routes. Configure a private Blob store and `BLOB_READ_WRITE_TOKEN` for durable lead storage. Configure your own `LEADS_SECRET` for the lead listing and any desired notification variables in Vercel, not in Git.

See [backend/README.md](../backend/README.md) for Telegram, WhatsApp, and email settings. Notification delivery depends on provider credentials and permissions. The existing hosted site uses its previously configured API; forking the frontend does not provision a new backend or storage automatically.

## Behavior to know

- The local Express server saves JSON/CSV; the Vercel API uses Blob storage.
- The current hosted handler can return `stored: false` when persistence is not configured. Confirm persistence before accepting real enquiries on a new deployment.
- The general contact form only displays a local UI confirmation. Insurance forms call the lead API.
- Set a unique `LEADS_SECRET`; the historical fallback value in the code is public and is not suitable as a production secret.

## Validation

```sh
node --check frontend/script.js
node --check backend/server.js
```

Check the calculator, quote dialog, and local API health before submitting changes. Use a local backend without notification credentials for UI tests.
