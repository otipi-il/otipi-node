# Next.js (App Router): SMS login for Israeli numbers

Two API routes and one page: the user types `050-123-4567`, gets an SMS code from Otipi, types it, and is signed in.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fotipi-il%2Fotipi-node%2Ftree%2Fmain%2Fexamples%2Fnextjs-sms-login&env=OTIPI_KEY&envDescription=Free%20Otipi%20test%20key%20(sk_test_...)&envLink=https%3A%2F%2Fotipi.co.il%2Fsignup&project-name=otipi-sms-login)

One click: Vercel copies this example to your GitHub and asks for `OTIPI_KEY` (a free test key from https://otipi.co.il/signup). Open `/login` on the new site.

```bash
npm install
cp .env.example .env.local   # put your sk_test_ key there
npm run dev                   # open http://localhost:3000/login
```

- `lib/otipi.ts`: the client (`server-only`, the key never reaches the browser) and phone normalization to `+9725XXXXXXXX`.
- `app/api/otp/send/route.ts`: `otipi.otp.send({ to, app })`.
- `app/api/otp/verify/route.ts`: `otipi.otp.verify({ to, code })`. Create your session where the comment says.
- `app/login/page.tsx`: the form.

**Test mode.** With a `sk_test_` key nothing reaches strangers. Confirm your own number once in the Otipi dashboard (**API keys > Your numbers for tests**) and the SMS really arrives (5 free). For other numbers the code is only logged: in development read it from the Otipi dashboard log, or from `test_code` in the `otipi.otp.send()` answer.
