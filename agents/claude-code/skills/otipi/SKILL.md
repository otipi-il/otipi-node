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

Do not generate, store or compare codes yourself: Otipi does it (5 attempts, 5 minutes by default, `ttlMinutes` 1 to 30). Options: `channel` (`sms` default, or `email`), `language` (`he` default, `ar`, `ru`, `en`), `length` (4 to 8).

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

Full example: https://github.com/otipi-il/otipi-node/tree/main/examples/nextjs-sms-login

## Supabase phone auth

Supabase makes and checks the code; Otipi only delivers it, through the Supabase **Send SMS Hook** (and the **Send Email Hook** for all auth emails). No code and no edge function are needed:

1. Otipi dashboard, page **Connect**, tab "Supabase, SMS": copy the hook address (`https://otipi.co.il/v1/integrations/supabase/sms/<token>`) and its secret (`v1,whsec_...`).
2. Supabase Dashboard: **Authentication > Hooks > Send SMS hook**, HTTPS, paste the address and the secret. Do NOT add an Authorization header: Otipi checks the Standard Webhooks signature.
3. For emails: the "Supabase, email" tab, a Send Email hook the same way, and the Supabase project URL written on the Connect page.
4. Client: `supabase.auth.signInWithOtp({ phone: '+972501234567' })`, then `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`.
5. The hook starts in test mode (real SMS only to the owner's confirmed phone); switch it to live on the Connect page once a plan is active.

## Trying it from the agent

The Otipi MCP server (`https://otipi.co.il/mcp`, or the `otipi` plugin) lets you send a test code yourself with `send_test_otp`, confirm the user's own number with `add_test_recipient` + `confirm_test_recipient`, and fetch ready code with `get_integration_snippet`. If it is not connected, the user can add it: `claude mcp add --transport http otipi https://otipi.co.il/mcp --header "Authorization: Bearer sk_test_..."`.

## Test mode (explain this to the user)

- `sk_test_` keys are free. Messages to strangers are only logged, never delivered, and `otp.send` returns `test_code` so the flow can be tested end to end.
- To receive real SMS during development, the user confirms their own number once: dashboard **API keys > Your numbers for tests**, or `otipi.testRecipients.add({ to })` then `otipi.testRecipients.verify({ to, code })`. 5 free test SMS per account.
- Message answers carry `test_delivery: "real" | "sandbox"`. If the user says "no SMS arrived" with a test key, the number is probably not confirmed.
- `sk_live_` keys send to anyone and need an active monthly subscription (SMS from 49 ILS for 500, email from 59 ILS for 10,000, packs of both; see https://otipi.co.il/#pricing). Live SMS also needs a one-time ID check and an approved sender name in the dashboard.

## Errors

Every failure throws `OtipiError` with `.status` and a stable `.code`. Handle at least:

| code | meaning | answer |
| --- | --- | --- |
| `invalid_recipient` | not an Israeli mobile | 400, ask for a valid number |
| `too_many_codes` | 5 codes an hour to one number | 429, ask to wait |
| `rate_limited` | too many requests | 429, retry later |
| `free_test_sms_used` | free test SMS used up | tell the developer to subscribe / use live key |
| `subscription_required` | live key without an active subscription | 402, subscribe in the dashboard (Plan and usage) |
| `monthly_limit_reached` | the month's allowance is used up | 429, move to a bigger level |
| `unauthorized` | bad or missing key | check `OTIPI_KEY` |

Never show `test_code` or the raw key to end users. Do not log codes.

## Other messages

```ts
await otipi.send({ channel: 'sms', to: '+972501234567', text: 'Your order shipped' });
await otipi.send({ channel: 'email', to: 'dana@example.com', from: 'MyApp <hello@myapp.co.il>', subject: 'Receipt', html });
await otipi.send(message, { idempotencyKey: orderId }); // safe to retry
```

Live email needs a verified domain (dashboard **Domains**). Docs: https://otipi.co.il/en/docs · plain text: https://otipi.co.il/llms-full.txt
