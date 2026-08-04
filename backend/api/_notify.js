// Lead notifications — forwards each new lead to Telegram, email, and/or WhatsApp.
// Every provider is OPTIONAL and activates only when its env vars are set,
// so this is safe to ship before you have any credentials.
// Uses the built-in global `fetch` (Node 18+) — no extra dependencies.
//
// Shared by both the local Express server (server.js) and the Vercel
// serverless function (api/lead.js).

function leadText(lead) {
  return [
    'New enquiry from the Kaundinya Tradings website',
    '',
    `Product : ${lead.product || '-'}`,
    `Name    : ${lead.name || '-'}`,
    `Mobile  : +91 ${lead.mobile}`,
    `Type    : ${lead.type || '-'}`,
    `Time    : ${lead.timestamp || new Date().toISOString()}`,
    `Page    : ${lead.page || '-'}`,
  ].join('\n');
}

function telegramLeadText(lead) {
  const receivedAt = lead.timestamp
    ? new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      }).format(new Date(lead.timestamp))
    : 'Just now';

  return [
    '🔔 NEW WEBSITE LEAD',
    '━━━━━━━━━━━━━━━━━━',
    '',
    `👤 Name: ${lead.name || 'Not provided'}`,
    `📱 Mobile: +91 ${lead.mobile}`,
    `🛡️ Product: ${lead.product || 'General enquiry'}`,
    `🏷️ Type: ${lead.type || 'Enquiry'}`,
    '',
    `🕒 Received: ${receivedAt}`,
    `🔗 Page: ${lead.page || 'Website'}`,
    `🆔 Lead ID: ${lead.id || '-'}`,
    '',
    'Please contact this lead as soon as possible.',
  ].join('\n');
}

// ---- Email via Resend (https://resend.com) ----
// Env: RESEND_API_KEY, LEAD_EMAIL_TO, (optional) LEAD_EMAIL_FROM
async function sendEmail(lead) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_EMAIL_TO;
  if (!key || !to) return { email: 'skipped (not configured)' };

  const from = process.env.LEAD_EMAIL_FROM || 'Leads <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: to.split(',').map((s) => s.trim()),
      subject: `New lead: ${lead.product || lead.type} — +91 ${lead.mobile}`,
      text: leadText(lead),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return { email: 'sent' };
}

// ---- Telegram Bot API (https://core.telegram.org/bots/api#sendmessage) ----
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (comma-separated chat IDs supported)
async function sendTelegram(lead) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = String(process.env.TELEGRAM_CHAT_ID || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (!token || chatIds.length === 0) return { telegram: 'skipped (not configured)' };

  const results = await Promise.allSettled(chatIds.map(async (chatId) => {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: telegramLeadText(lead),
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (!data.ok) throw new Error(`Telegram: ${data.description || 'message was not sent'}`);
    return data.result?.message_id || null;
  }));

  const sent = results.filter((result) => result.status === 'fulfilled');
  const failed = results.filter((result) => result.status === 'rejected');
  if (sent.length === 0) {
    throw new Error(failed.map((result) => result.reason?.message || result.reason).join('; '));
  }

  return {
    telegram: failed.length === 0 ? 'sent' : 'partially sent',
    telegramSent: sent.length,
    telegramFailed: failed.length,
  };
}

// ---- WhatsApp Cloud API (Meta) ----
// Env: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TO,
//      WHATSAPP_TEMPLATE_NAME, (optional) WHATSAPP_TEMPLATE_LANGUAGE,
//      (optional) WHATSAPP_GRAPH_VERSION
async function sendWhatsApp(lead) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const recipients = String(process.env.WHATSAPP_TO || '')
    .split(',')
    .map((value) => value.replace(/\D/g, ''))
    .filter(Boolean);
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  if (!token || !phoneNumberId || recipients.length === 0 || !templateName) {
    return { whatsapp: 'skipped (not configured)' };
  }

  const version = process.env.WHATSAPP_GRAPH_VERSION || 'v23.0';
  const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';
  const receivedAt = lead.timestamp
    ? new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      }).format(new Date(lead.timestamp))
    : 'Just now';

  const results = await Promise.allSettled(recipients.map(async (to) => {
    const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: lead.name || 'Not provided' },
              { type: 'text', text: `+91 ${lead.mobile}` },
              { type: 'text', text: lead.product || 'General enquiry' },
              { type: 'text', text: lead.type || 'Enquiry' },
              { type: 'text', text: receivedAt },
            ],
          }],
        },
      }),
    });

    if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.messages?.[0]?.id || null;
  }));

  const sent = results.filter((result) => result.status === 'fulfilled');
  const failed = results.filter((result) => result.status === 'rejected');
  if (sent.length === 0) {
    throw new Error(failed.map((result) => result.reason?.message || result.reason).join('; '));
  }

  return {
    whatsapp: failed.length === 0 ? 'sent' : 'partially sent',
    whatsappSent: sent.length,
    whatsappFailed: failed.length,
    whatsappMessageIds: sent.map((result) => result.value),
  };
}

// Fire all configured providers; never let a notification failure break lead capture.
async function notifyLead(lead) {
  const results = {};
  await Promise.all([
    sendEmail(lead).then((r) => Object.assign(results, r)).catch((e) => { results.emailError = String(e.message || e); }),
    sendTelegram(lead).then((r) => Object.assign(results, r)).catch((e) => { results.telegramError = String(e.message || e); }),
    sendWhatsApp(lead).then((r) => Object.assign(results, r)).catch((e) => { results.whatsappError = String(e.message || e); }),
  ]);
  return results;
}

module.exports = { notifyLead, leadText, telegramLeadText, sendTelegram, sendWhatsApp };
