'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code' | 'done'>('phone');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function post(path: string, body: object) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || (data.reason === 'wrong_code' ? 'Wrong code' : 'Try again'));
      return data;
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'system-ui' }}>
      <h1>Sign in</h1>
      {step === 'phone' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            post('/api/otp/send', { phone }).then(() => setStep('code'), (err) => setError(err.message));
          }}
        >
          <input type="tel" dir="ltr" placeholder="050-123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <button disabled={busy}>Send code</button>
        </form>
      )}
      {step === 'code' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            post('/api/otp/verify', { phone, code }).then(() => setStep('done'), (err) => setError(err.message));
          }}
        >
          <input inputMode="numeric" autoComplete="one-time-code" dir="ltr" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} required />
          <button disabled={busy}>Sign in</button>
        </form>
      )}
      {step === 'done' && <p>Signed in.</p>}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
