import { NextResponse } from 'next/server';
import { OtipiError } from 'otipi';
import { otipi, toIsraeliMobile } from '@/lib/otipi';

export async function POST(request: Request) {
  const { phone } = await request.json().catch(() => ({}));
  const to = toIsraeliMobile(phone);
  if (!to) return NextResponse.json({ error: 'Enter an Israeli mobile number, for example 050-123-4567.' }, { status: 400 });

  try {
    // Otipi makes the code, sends it and remembers it. "app" is the name shown in the SMS.
    await otipi.otp.send({ to, app: 'MyApp', language: 'he' });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof OtipiError) {
      // err.code is stable: too_many_codes, invalid_recipient, free_test_sms_used, rate_limited...
      const status = err.status === 429 ? 429 : err.status >= 500 ? 502 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    throw err;
  }
}
