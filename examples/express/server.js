// Express: SMS login for Israeli numbers with Otipi, in two routes.
//   npm install && OTIPI_KEY=sk_test_... node server.js
import express from 'express';
import { Otipi, OtipiError } from 'otipi';

if (!process.env.OTIPI_KEY) {
  console.error('Set OTIPI_KEY (free sk_test_ key: https://otipi.co.il/signup).');
  process.exit(1);
}

const otipi = new Otipi(process.env.OTIPI_KEY);
const app = express();
app.use(express.json());

/** 050-123-4567 -> +972501234567, or null when it is not an Israeli mobile number. */
function toIsraeliMobile(input) {
  const digits = String(input ?? '').replace(/[\s\-().]/g, '');
  const e164 = digits.startsWith('+') ? digits : digits.startsWith('0') ? `+972${digits.slice(1)}` : `+${digits}`;
  return /^\+9725\d{8}$/.test(e164) ? e164 : null;
}

app.post('/otp/send', async (req, res) => {
  const to = toIsraeliMobile(req.body?.phone);
  if (!to) return res.status(400).json({ error: 'Enter an Israeli mobile number.' });
  try {
    const sent = await otipi.otp.send({ to, app: 'MyApp', language: 'he' });
    // With a test key the code also comes back as sent.test_code: handy in tests, never show it to users.
    res.json({ ok: true, expires_at: sent.expires_at });
  } catch (err) {
    if (err instanceof OtipiError) return res.status(err.status === 429 ? 429 : 400).json({ error: err.message, code: err.code });
    throw err;
  }
});

app.post('/otp/verify', async (req, res) => {
  const to = toIsraeliMobile(req.body?.phone);
  const code = String(req.body?.code ?? '');
  if (!to || !/^\d{4,8}$/.test(code)) return res.status(400).json({ error: 'Send phone and code.' });
  try {
    const { valid, reason } = await otipi.otp.verify({ to, code });
    if (!valid) return res.status(401).json({ ok: false, reason });
    // The phone is proven: create your session here.
    res.json({ ok: true, phone: to });
  } catch (err) {
    if (err instanceof OtipiError) return res.status(502).json({ error: err.message, code: err.code });
    throw err;
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
