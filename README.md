# otipi: SMS login codes, SMS and email for Israeli apps

Official Node.js SDK for [Otipi](https://otipi.co.il), the SMS and email API for Israel (`+972`). Zero dependencies, TypeScript types included, Node 18+. Message templates in Hebrew, Arabic, Russian and English. Free test mode, no card.

```bash
npm install otipi
```

## Quickstart: SMS login in 5 lines

```js
import { Otipi } from 'otipi';
const otipi = new Otipi(process.env.OTIPI_KEY);              // sk_test_... or sk_live_...
await otipi.otp.send({ to: '+972501234567', app: 'MyApp' }); // Otipi makes and sends the code
const { valid } = await otipi.otp.verify({ to: '+972501234567', code: '482917' });
if (valid) { /* the phone is proven: sign the user in */ }
```

Get a free key at [otipi.co.il/signup](https://otipi.co.il/signup) (about a minute, no card): **API keys > Create key**.

## Rules that save you a debugging session

- **Server only.** Keep `OTIPI_KEY` in an environment variable and call Otipi from API routes, server actions or edge functions. Never in client components, `NEXT_PUBLIC_*` or `VITE_*` variables. The API sends no CORS headers on purpose.
- **Israeli mobiles only, E.164.** `+9725XXXXXXXX`. Users type `050-123-4567`: convert it first.
- **Test and live keys.** `sk_test_` is free: nothing reaches strangers, and `otp.send` returns the code in `test_code` so automated tests can finish the flow. `sk_live_` sends to anyone (needs an active subscription).
- **Real SMS in test mode.** Confirm your own number once and test messages to it really arrive (5 free test SMS per account):

```js
await otipi.testRecipients.add({ to: '+972501234567' });                    // you get an SMS with a code
await otipi.testRecipients.verify({ to: '+972501234567', code: '123456' }); // now it is confirmed
```

  The same is in the dashboard: **API keys > Your numbers for tests**. Every message answer says `test_delivery: "real"` or `"sandbox"`.

```js
// 050-123-4567 -> +972501234567, or null
function toIsraeliMobile(input) {
  const d = String(input ?? '').replace(/[\s\-().]/g, '');
  const e164 = d.startsWith('+') ? d : d.startsWith('0') ? `+972${d.slice(1)}` : `+${d}`;
  return /^\+9725\d{8}$/.test(e164) ? e164 : null;
}
```

## Errors

Every failed call throws `OtipiError` with `status` (HTTP) and a stable `code`:

```js
import { Otipi, OtipiError } from 'otipi';

try {
  await otipi.otp.send({ to, app: 'MyApp' });
} catch (err) {
  if (err instanceof OtipiError) {
    // err.code: invalid_recipient | too_many_codes | rate_limited | free_test_sms_used | unauthorized | ...
    return Response.json({ error: err.message, code: err.code }, { status: err.status === 429 ? 429 : 400 });
  }
  throw err;
}
```

| `code` | What happened | What to do |
| --- | --- | --- |
| `unauthorized` | Key missing, wrong or revoked | Check `OTIPI_KEY` |
| `invalid_recipient` | Not an Israeli mobile number | Convert to `+9725XXXXXXXX` |
| `too_many_codes` | 5 codes an hour to one number | Ask the user to wait |
| `rate_limited` | Too many requests | Retry after `Retry-After` |
| `free_test_sms_used` | The 5 free test SMS are used | Subscribe, use a `sk_live_` key |
| `subscription_required` | A `sk_live_` key without an active subscription | Subscribe in the dashboard: SMS from 49 ILS for 500, email from 59 ILS for 10,000 |
| `monthly_limit_reached` | This month's allowance is used up (10% grace included) | Move to a bigger level |
| `identity_not_verified`, `sender_required` | Live SMS needs a one-time ID check and an approved sender name | Dashboard > **SMS** |
| `domain_not_verified` | Live email from an unverified domain | Dashboard > **Domains** |

`otp.verify` does not throw for a wrong code: it returns `{ valid: false, reason: 'wrong_code' | 'expired_or_missing' | 'too_many_attempts' }`.

## API

```js
const otipi = new Otipi(apiKey, { baseUrl?, timeoutMs? });

otipi.otp.send({ to, app, channel?, language?, length?, ttlMinutes? }); // channel: sms (default) | email
otipi.otp.verify({ to, code });

otipi.send({ channel: 'sms', to, text });                              // any SMS
otipi.send({ channel: 'email', to, from, subject, html });              // any email (from: a verified domain)
otipi.send({ channel: 'sms', to, template: 'login-code', language: 'he', variables: { code, app, minutes } });
otipi.send(message, { idempotencyKey });                               // never sends twice

otipi.messages.get(id);                                                 // status and events
otipi.messages.list({ limit, channel, status });

otipi.testRecipients.add({ to });                                       // test keys only
otipi.testRecipients.verify({ to, code });
otipi.testRecipients.list();                                            // { data, free_sms: { total, used, left } }

Otipi.verifyWebhook(rawBody, req.headers['otipi-signature'], secret);   // true when the webhook is really from Otipi
```

Ready-made templates: `login-code`, `order-confirmed`, `receipt`, each in `he` (default), `ar`, `ru`, `en`.

## Supabase phone login

Supabase Auth can send its phone codes through Otipi with the **Send SMS Hook**. Supabase HTTP hooks cannot carry custom headers, so the Otipi key lives in a small edge function: [otipi-supabase](https://github.com/planetebatel-cloud/otipi-supabase) (deploy, paste the hook URL and secret, done). Client code stays `supabase.auth.signInWithOtp({ phone })` and `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.

## Examples

- [`examples/nextjs-sms-login`](examples/nextjs-sms-login): Next.js App Router, two API routes and a login page.
- [`examples/nextjs-supabase-phone-login`](examples/nextjs-supabase-phone-login): Next.js with Supabase Auth and the Otipi hook.
- [`examples/express`](examples/express): Express, two routes.

## For AI coding agents

- **Claude Code skill**:
  ```bash
  mkdir -p .claude/skills/otipi && curl -fsSL https://raw.githubusercontent.com/planetebatel-cloud/otipi-node/main/agents/claude-code/otipi/SKILL.md -o .claude/skills/otipi/SKILL.md
  ```
- **Cursor rules**:
  ```bash
  mkdir -p .cursor/rules && curl -fsSL https://raw.githubusercontent.com/planetebatel-cloud/otipi-node/main/agents/cursor/otipi.mdc -o .cursor/rules/otipi.mdc
  ```
- **MCP server** (send a test code, check delivery, get a snippet from inside the agent): `claude mcp add otipi --env OTIPI_KEY=sk_test_... -- npx -y otipi-mcp`
- Docs as plain text: [otipi.co.il/llms-full.txt](https://otipi.co.il/llms-full.txt) · OpenAPI: [otipi.co.il/openapi.json](https://otipi.co.il/openapi.json)

## Links

[Documentation](https://otipi.co.il/en/docs) · [Dashboard](https://otipi.co.il/app) · [Supabase hook](https://github.com/planetebatel-cloud/otipi-supabase) · [MCP server](https://github.com/planetebatel-cloud/otipi-mcp)

## License

MIT
