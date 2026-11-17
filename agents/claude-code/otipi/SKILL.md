---
name: otipi
description: Add SMS login (phone OTP), SMS or transactional email for Israeli users (+972) with the Otipi API. Use when the user asks for SMS/phone login, OTP, 2FA, verification codes, sending SMS or email in Israel, Hebrew SMS, or Supabase phone auth with Israeli numbers.
---

# Otipi: SMS login and messaging for Israeli apps

Otipi (https://otipi.co.il) is an SMS and email API for Israel. Node SDK: `npm install otipi` (zero dependencies, types included).

## Before writing code

1. The user needs a key. Free test key, no card: https://otipi.co.il/signup, then **API keys > Create key**. It starts with `sk_test_`.
2. Put it in the server environment only: `OTIPI_KEY=sk_test_...` in `.env.local` / `.env`. Never in client code, never in `NEXT_PUBLIC_*` or `VITE_*` variables, never committed.
3. Ask which stack applies: plain backend (Next.js, Express, any Node server) -> use the SDK. Supabase Auth phone login -> use the Supabase hook (below), not the SDK in the client.

## SMS login: two calls

```ts
import { Otipi, OtipiError } from 'otipi';
const otipi = new Otipi(process.env.OTIPI_KEY!);

await otipi.otp.send({ to: '+972501234567', app: 'MyApp' });           // Otipi makes, stores and sends the code
const { valid, reason } = await otipi.otp.verify({ to: '+972501234567', code });
// valid === true -> create the session. reason: wrong_code | expired_or_missing | too_many_attempts
```

Do not generate, store or compare codes yourself: Otipi does it (5 attempts, 5 minutes by default, `ttlMinutes` 1 to 30). Options: `channel` (`sms` default, `whatsapp`, `email`, `auto`), `language` (`he` default, `ar`, `ru`, `en`), `length` (4 to 8).

Phone numbers must be Israeli mobiles in E.164, `+9725XXXXXXXX`. Users type `050-123-4567`, so always normalize on the server:

```ts
function toIsraeliMobile(input: unknown): string | null {
  const d = String(input ?? '').replace(/[\s\-().]/g, '');
  const e164 = d.startsWith('+') ? d : d.startsWith('0') ? `+972${d.slice(1)}` : `+${d}`;
  return /^\+9725\d{8}$/.test(e164) ? e164 : null;
}
```

### Next.js App Router layout

- `lib/otipi.ts`: `import 'server-only'`, the client, `toIsraeliMobile`.
- `app/api/otp/send/route.ts`: validate phone, `otipi.otp.send`, map `OtipiError`.
- `app/api/otp/verify/route.ts`: `otipi.otp.verify`, then create the session.
- A `'use client'` page with a phone step and a code step that calls those routes with `fetch`. Inputs: `type="tel" dir="ltr"`, code `inputMode="numeric" autoComplete="one-time-code"`.

Full example: https://github.com/planetebatel-cloud/otipi-node/tree/main/examples/nextjs-sms-login

## Supabase phone auth

Supabase makes and checks the code; Otipi only delivers it through the Supabase **Send SMS Hook**. Supabase HTTP hooks cannot send custom headers, so do NOT tell the user to add an Authorization header to the hook URL. Use the edge function:

1. Copy `supabase/functions/otipi-sms-hook/{index.ts,handler.ts}` from https://github.com/planetebatel-cloud/otipi-supabase
2. `supabase functions deploy otipi-sms-hook --no-verify-jwt`
3. Dashboard: **Authentication > Hooks > Send SMS hook**, HTTPS, URL `https://<project-ref>.supabase.co/functions/v1/otipi-sms-hook`, **Generate secret**.
4. `supabase secrets set OTIPI_KEY=sk_test_... SEND_SMS_HOOK_SECRETS='v1,whsec_...' OTIPI_APP_NAME='MyApp'`
5. Client: `supabase.auth.signInWithOtp({ phone: '+972501234567' })`, then `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.

## Test mode (explain this to the user)

- `sk_test_` keys are free. Messages to strangers are only logged, never delivered, and `otp.send` returns `test_code` so the flow can be tested end to end.
- To receive real SMS during development, the user confirms their own number once: dashboard **API keys > Your numbers for tests**, or `otipi.testRecipients.add({ to })` then `otipi.testRecipients.verify({ to, code })`. 5 free test SMS per account.
- Message answers carry `test_delivery: "real" | "sandbox"`. If the user says "no SMS arrived" with a test key, the number is probably not confirmed.
- `sk_live_` keys send to anyone and need an active subscription; live SMS also needs a one-time ID check and an approved sender name in the dashboard.

## Errors

Every failure throws `OtipiError` with `.status` and a stable `.code`. Handle at least:

| code | meaning | answer |
| --- | --- | --- |
| `invalid_recipient` | not an Israeli mobile | 400, ask for a valid number |
| `too_many_codes` | 5 codes an hour to one number | 429, ask to wait |
| `rate_limited` | too many requests | 429, retry later |
| `free_test_sms_used` | free test SMS used up | tell the developer to subscribe / use live key |
| `unauthorized` | bad or missing key | check `OTIPI_KEY` |

Never show `test_code` or the raw key to end users. Do not log codes.

## Other messages

```ts
await otipi.send({ channel: 'sms', to: '+972501234567', text: 'Your order shipped' });
await otipi.send({ channel: 'email', to: 'dana@example.com', from: 'MyApp <hello@myapp.co.il>', subject: 'Receipt', html });
await otipi.send(message, { idempotencyKey: orderId }); // safe to retry
```

Live email needs a verified domain (dashboard **Domains**). Docs: https://otipi.co.il/en/docs · plain text: https://otipi.co.il/llms-full.txt
