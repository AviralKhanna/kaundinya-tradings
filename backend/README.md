# Kaundinya Tradings — Lead API (backend)

A small Express server that receives enquiries from the frontend and stores them to a file.

## Run

```bash
npm install
npm start          # http://localhost:4000
npm run dev        # same, with auto-reload on file changes
```

## Endpoints

| Method | Path                     | Description                                  |
|--------|--------------------------|----------------------------------------------|
| GET    | `/health`                | Health check                                 |
| POST   | `/api/lead`              | Save a new enquiry (see body below)          |
| GET    | `/api/leads?key=SECRET`  | List all captured leads (newest first)       |

### POST `/api/lead` body

```json
{
  "name": "Aman",
  "mobile": "9876543210",
  "product": "Bike Insurance",
  "type": "insurance",
  "page": "http://localhost:8000"
}
```

Only `mobile` is required and must be a valid 10-digit Indian number.

## Storage

Leads are appended to:
- `data/leads.json` — full structured records
- `data/leads.csv` — spreadsheet-friendly

## Configuration (env vars)

| Variable       | Default            | Purpose                          |
|----------------|--------------------|----------------------------------|
| `PORT`         | `4000`             | Port to listen on                |
| `LEADS_SECRET` | `kaundinya-admin`  | Key required to view `/api/leads` |

## Telegram lead notifications

Every newly captured lead can be sent directly to your Telegram account.
Existing JSON/CSV storage continues to work even if the notification provider
is unavailable.

1. In Telegram, open the verified `@BotFather` account.
2. Send `/newbot`, choose a name and username, and copy the bot token.
3. Open your new bot, press **Start**, and send it any message.
4. Open `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates` in a browser.
5. Find `"chat":{"id":123456789,...}` and copy that numeric chat ID.
6. Copy `.env.example` to `.env` and set:

```dotenv
TELEGRAM_BOT_TOKEN=your_bot_token
# Comma-separated chat IDs supported
TELEGRAM_CHAT_ID=your_numeric_chat_id,another_numeric_chat_id
```

Start the local API; it automatically loads `backend/.env`:

```bash
npm start
```

For the deployed Vercel backend, add the same two environment variables in
the Vercel project settings and redeploy.

## WhatsApp lead notifications (Meta Cloud API)

WhatsApp runs independently from Telegram and email. In the Meta app dashboard,
add the **WhatsApp** product and open **WhatsApp > API Setup** to find the
temporary access token and Phone Number ID. Add your receiving number under
**To** while testing.

Create and approve a message template named `new_lead_alert` with language
`en` and this body (the variable order must match exactly):

```text
New website lead

Name: {{1}}
Mobile: {{2}}
Product: {{3}}
Type: {{4}}
Received: {{5}}
```

Then configure `backend/.env`:

```dotenv
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
# Comma-separated recipients, including country code
WHATSAPP_TO=919876543210,919123456789
WHATSAPP_TEMPLATE_NAME=new_lead_alert
WHATSAPP_TEMPLATE_LANGUAGE=en
WHATSAPP_GRAPH_VERSION=v23.0
```

Use the temporary token only for testing. For production, create a Meta system
user token with the `whatsapp_business_messaging` permission. Recipient numbers
must include the country code and contain digits only.
