# Express: SMS login for Israeli numbers

```bash
npm install
OTIPI_KEY=sk_test_xxxxxxxx node server.js
curl -X POST localhost:3000/otp/send   -H 'content-type: application/json' -d '{"phone":"050-123-4567"}'
curl -X POST localhost:3000/otp/verify -H 'content-type: application/json' -d '{"phone":"050-123-4567","code":"123456"}'
```

With a `sk_test_` key the SMS really arrives only to your own number confirmed in the Otipi dashboard (5 free). Other numbers are only logged.
