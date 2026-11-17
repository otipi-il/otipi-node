import { NextResponse } from 'next/server';
import { OtipiError } from 'otipi';
import { otipi, toIsraeliMobile } from '@/lib/otipi';

export async function POST(request: Request) {
  const { phone, code } = await request.json().catch(() => ({}));
  const to = toIsraeliMobile(phone);
  if (!to || !/^\d{4,8}$/.test(String(code ?? ''))) {
    return NextResponse.json({ error: 'Send the phone number and the code.' }, { status: 400 });
  }

  try {
    const result = await otipi.otp.verify({ to, code: String(code) });
    if (!result.valid) {
      // reason: wrong_code | expired_or_missing | too_many_attempts
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 401 });
    }
    // The phone is proven. Create your session here (your auth library, a signed cookie, etc.).
    const response = NextResponse.json({ ok: true, phone: to });
    return response;
  } catch (err) {
    if (err instanceof OtipiError) return NextResponse.json({ error: err.message, code: err.code }, { status: 502 });
    throw err;
  }
}
