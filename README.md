# Kaundinya Tradings

A responsive financial-services website with a SIP calculator, insurance quote forms, and a separate lead-capture API.

**[Open the live website →](https://kaundinya-tradings.vercel.app)** · [Setup and deployment](docs/SETUP.md) · [Backend documentation](backend/README.md) · [Report an issue](https://github.com/AviralKhanna/kaundinya-tradings/issues)

## Features

- Financial-services landing page with responsive navigation.
- SIP calculator with adjustable contribution, expected return, and duration.
- Insurance quote dialogs with mobile-number validation.
- Lead API with local file storage and a separate Vercel serverless implementation.
- Optional notification integrations configured through backend environment variables.

The live site is accessible without signing in. Insurance enquiries use the existing production API. **Do not submit test enquiries on the live site:** they can create real leads and trigger notifications. Use your own local backend for development.

## Run locally

Requires Node.js 22.13+ with npm, and Python 3.

```sh
git clone https://github.com/AviralKhanna/kaundinya-tradings.git
cd kaundinya-tradings
```

Start the API in one terminal:

```sh
cd backend
npm ci
PORT=4011 npm start
```

Start the website in another terminal, from the repository root:

```sh
python3 -m http.server 8010 --bind 127.0.0.1 --directory frontend
```

Open **http://localhost:8010**. Check the API at **http://localhost:4011/health**.

`frontend/config.js` selects port 4011 on localhost and the deployed backend URL on the live site. Configure notification credentials only if you intend to send notifications.

## Technology

| Area | Stack |
| --- | --- |
| Frontend | HTML, CSS, vanilla JavaScript |
| Local API | Node.js and Express |
| Local persistence | JSON and CSV files |
| Hosted persistence | Private Vercel Blob storage |
| Hosting | Vercel |

## Project structure

```text
frontend/             Website, calculator, and enquiry UI
backend/server.js     Local Express API
backend/api/          Vercel serverless handlers
backend/data/         Runtime lead files; not committed
vercel.json           Frontend deployment configuration
```

## Deployment

The main Vercel project serves `frontend/`. The backend is deployed separately and needs its own persistence and optional notification settings. [Follow the deployment guide](docs/SETUP.md) to host your own copy; change the production API URL so your copy does not send enquiries to this project's API.

## Current limitations

The general contact form is a UI demo; it does not send a message. Insurance quote forms use the lead API. SIP outputs are projections based on the entered assumptions, not guaranteed returns. Provider configuration and delivery determine whether notifications arrive.

## Author

Built by [Aviral Khanna](https://github.com/AviralKhanna).
