// Server-only: the Otipi key must never reach the browser.
import 'server-only';
import { Otipi } from 'otipi';

if (!process.env.OTIPI_KEY) {
  throw new Error('Set OTIPI_KEY in .env.local (get a free sk_test_ key at https://otipi.co.il/signup).');
}

export const otipi = new Otipi(process.env.OTIPI_KEY);

/** Accepts 050-123-4567, 0501234567, +972501234567. Returns +9725XXXXXXXX or null. */
export function toIsraeliMobile(input: unknown): string | null {
  const digits = String(input ?? '').replace(/[\s\-().]/g, '');
  const e164 = digits.startsWith('+') ? digits : digits.startsWith('0') ? `+972${digits.slice(1)}` : `+${digits}`;
  return /^\+9725\d{8}$/.test(e164) ? e164 : null;
}
