# Next.js + Supabase: phone login for Israeli numbers

Supabase Auth makes and checks the code. Otipi delivers it as an SMS through the Supabase **Send SMS Hook**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fplanetebatel-cloud%2Fotipi-node%2Ftree%2Fmain%2Fexamples%2Fnextjs-supabase-phone-login&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY&envDescription=Your%20Supabase%20project%20URL%20and%20anon%20key%20(Settings%20%3E%20API)&envLink=https%3A%2F%2Fsupabase.com%2Fdashboard&project-name=otipi-supabase-login)

The app deploys in one click with your Supabase URL and anon key. The SMS hook is set up once (step 1 below), with no code.

1. Set up the hook once: in the Otipi dashboard, page **Connect**, copy the Send SMS hook address and secret; in Supabase, **Authentication > Hooks > Send SMS hook**, HTTPS, paste them.
2. Run this app:

```bash
npm install
cp .env.example .env.local   # your Supabase URL and anon key
npm run dev                   # http://localhost:3000/login
```

The whole client side is `supabase.auth.signInWithOtp({ phone })` and `supabase.auth.verifyOtp({ phone, token, type: 'sms' })` in `app/login/page.tsx`. Numbers must be `+9725XXXXXXXX`; the page converts `050-123-4567`.

With a `sk_test_` Otipi key the SMS really arrives only to your own number confirmed in the Otipi dashboard (5 free test SMS).
