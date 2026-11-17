# Next.js + Supabase: phone login for Israeli numbers

Supabase Auth makes and checks the code. Otipi delivers it as an SMS through the Supabase **Send SMS Hook**.

1. Set up the hook once: follow [otipi-supabase](https://github.com/planetebatel-cloud/otipi-supabase) (deploy one edge function, paste the hook URL and secret in **Authentication > Hooks**, `supabase secrets set OTIPI_KEY=...`).
2. Run this app:

```bash
npm install
cp .env.example .env.local   # your Supabase URL and anon key
npm run dev                   # http://localhost:3000/login
```

The whole client side is `supabase.auth.signInWithOtp({ phone })` and `supabase.auth.verifyOtp({ phone, token, type: 'sms' })` in `app/login/page.tsx`. Numbers must be `+9725XXXXXXXX`; the page converts `050-123-4567`.

With a `sk_test_` Otipi key the SMS really arrives only to your own number confirmed in the Otipi dashboard (5 free test SMS).
