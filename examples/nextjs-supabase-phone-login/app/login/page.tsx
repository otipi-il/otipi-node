'use client';

// Supabase phone login for Israeli numbers. Supabase makes and checks the code;
// the Otipi Send SMS Hook (https://github.com/otipi-il/otipi-supabase)
// delivers it. No Otipi key here: it lives in the edge function secrets.
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

/** 050-123-4567 -> +972501234567, or null. */
function toIsraeliMobile(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, '');
  const e164 = digits.startsWith('+') ? digits : digits.startsWith('0') ? `+972${digits.slice(1)}` : `+${digits}`;
  return /^\+9725\d{8}$/.test(e164) ? e164 : null;
}

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const e164 = toIsraeliMobile(phone);
    if (!e164) return setMessage('Enter an Israeli mobile number, for example 050-123-4567.');
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    if (error) return setMessage(error.message);
    setSent(true);
    setMessage('');
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.auth.verifyOtp({ phone: toIsraeliMobile(phone)!, token: code, type: 'sms' });
    if (error) return setMessage(error.message);
    setMessage(`Signed in as ${data.user?.phone}`);
  }

  return (
    <main style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'system-ui' }}>
      <h1>Sign in</h1>
      {!sent ? (
        <form onSubmit={sendCode}>
          <input type="tel" dir="ltr" placeholder="050-123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <button>Send code</button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <input inputMode="numeric" autoComplete="one-time-code" dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} required />
          <button>Sign in</button>
        </form>
      )}
      {message && <p role="alert">{message}</p>}
    </main>
  );
}
