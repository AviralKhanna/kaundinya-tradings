// Frontend runtime config.
// Point this at wherever the backend lead API is running.
//
//  - Local separated dev:  backend on http://localhost:4011  (default below)
//  - Same-origin hosting:  set to '' to use relative /api/lead
//  - Production:           set to your deployed backend URL
//
// Auto-selects: localhost backend during local dev, deployed backend in production.
window.API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:4011'
  : 'https://backend-three-rouge-50.vercel.app';
