// Otipi for Node.js. One file, no dependencies, Node 18 or newer.
//
//   import { Otipi } from 'otipi';
//   const otipi = new Otipi(process.env.OTIPI_KEY);
//   await otipi.otp.send({ to: '+972501234567', app: 'MyApp', channel: 'auto' });
//
// Server side only: the key is a secret and must never reach a browser or a phone app.

import crypto from 'node:crypto';

// The address of the Otipi service.
const DEFAULT_BASE_URL = 'https://otipi.co.il';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Every failure this file reports: a refusal from the API, a timeout, an unreachable server. */
export class OtipiError extends Error {
  constructor(message, { status = 0, code = 'network_error' } = {}) {
    super(message);
    this.name = 'OtipiError';
    /** The HTTP status, or 0 when no answer arrived. */
    this.status = status;
    /** The API's error code, for example "invalid_recipient". */
    this.code = code;
  }
}

function resolveBaseUrl(given) {
  const value = given || process.env.OTIPI_BASE_URL || DEFAULT_BASE_URL;
  if (!value) throw new TypeError('Otipi: the service address is not set. Pass { baseUrl } or set OTIPI_BASE_URL.');
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError(`Otipi: "${value}" is not a valid address.`);
  }
  const local = LOCAL_HOSTS.has(url.hostname) || url.hostname.endsWith('.localhost');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new TypeError('Otipi: the service address must start with https://, so the key never travels unencrypted.');
  }
  return url.origin + url.pathname.replace(/\/+$/, '');
}

export class Otipi {
  // Private, so the key does not show up in console.log(otipi) or in JSON.
  #key;
  #base;
  #fetch;
  #timeout;

  /**
   * @param {string} apiKey      sk_test_... or sk_live_...
   * @param {object} [options]
   * @param {string} [options.baseUrl]    the service address; otherwise OTIPI_BASE_URL or https://otipi.co.il
   * @param {number} [options.timeoutMs]  how long to wait for an answer, 15 seconds by default
   */
  constructor(apiKey, { baseUrl, timeoutMs = 15_000, fetch: fetchImpl } = {}) {
    if (typeof apiKey !== 'string' || !apiKey.trim()) {
      throw new TypeError('Otipi: pass your API key, for example new Otipi(process.env.OTIPI_KEY).');
    }
    this.#key = apiKey.trim();
    this.#base = resolveBaseUrl(baseUrl);
    this.#timeout = timeoutMs;
    this.#fetch = fetchImpl || globalThis.fetch;
    if (typeof this.#fetch !== 'function') throw new TypeError('Otipi needs Node 18 or newer.');

    /** Messages already sent. */
    this.messages = {
      /** One message with everything that happened to it. */
      get: (id) => this.#call('GET', `/v1/messages/${encodeURIComponent(id)}`),
      /** The latest messages: { data, has_more }. */
      list: ({ limit, channel, status } = {}) => this.#call('GET', '/v1/messages', { query: { limit, channel, status } }),
    };

    /** Login codes: Otipi makes the code, keeps it and counts the attempts. */
    this.otp = {
      /**
       * Sends a code. { to, app } are required; channel is "sms" unless you say otherwise ("sms" | "email").
       * language picks the words of the message: "he" (the default), "ar", "ru" or "en".
       */
      send: ({ ttlMinutes, ...rest } = {}) =>
        this.#call('POST', '/v1/otp/send', { body: { ...rest, ...(ttlMinutes == null ? {} : { ttl_minutes: ttlMinutes }) } }),
      /** Checks what the person typed: { valid: true } or { valid: false, reason }. */
      verify: ({ to, code } = {}) => this.#call('POST', '/v1/otp/verify', { body: { to, code } }),
    };

    /**
     * Test mode (sk_test_ keys only). Test messages reach nobody, except your own
     * numbers and addresses confirmed here with a code: those really arrive
     * (5 free test SMS per account). add() sends the code, verify() checks it.
     */
    this.testRecipients = {
      /** { data: [{ id, channel, to, status: 'pending' | 'confirmed' }], free_sms: { total, used, left } } */
      list: () => this.#call('GET', '/v1/test-recipients'),
      /** Sends a 6-digit code to your Israeli mobile number (+9725XXXXXXXX) or email. */
      add: ({ to, language } = {}) => this.#call('POST', '/v1/test-recipients', { body: { to, ...(language ? { language } : {}) } }),
      /** Confirms it with the code you received. */
      verify: ({ to, code } = {}) => this.#call('POST', '/v1/test-recipients/verify', { body: { to, code } }),
    };
  }

  /**
   * Sends one message: { channel, to, text } or { channel, to, template, variables }.
   * The ready-made templates exist in four languages: add language "he", "ar", "ru" or "en".
   * With idempotencyKey a repeated call returns the first message instead of sending again.
   */
  send(message, { idempotencyKey } = {}) {
    return this.#call('POST', '/v1/messages', {
      body: message,
      headers: idempotencyKey ? { 'Idempotency-Key': String(idempotencyKey) } : {},
    });
  }

  async #call(method, path, { body, query, headers = {} } = {}) {
    const url = new URL(this.#base + path);
    for (const [name, value] of Object.entries(query || {})) {
      if (value != null) url.searchParams.set(name, String(value));
    }
    let response;
    try {
      response = await this.#fetch(url, {
        method,
        headers: { Authorization: `Bearer ${this.#key}`, ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.#timeout),
        // A redirect could carry the key to another server, so none is followed.
        redirect: 'error',
      });
    } catch (err) {
      const late = err?.name === 'TimeoutError';
      throw new OtipiError(late ? 'Otipi did not answer in time.' : `Otipi could not be reached: ${err?.message || err}`, {
        code: late ? 'timeout' : 'network_error',
      });
    }
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      /* not JSON: reported below by status */
    }
    if (!response.ok) {
      throw new OtipiError(data?.error?.message || `Otipi answered ${response.status}.`, {
        status: response.status,
        code: data?.error?.code || 'http_error',
      });
    }
    return data;
  }

  /**
   * Was this webhook call really sent by Otipi?
   * rawBody is the request body exactly as it arrived, before JSON.parse.
   */
  static verifyWebhook(rawBody, signatureHeader, secret, { toleranceSeconds = 300 } = {}) {
    const parts = Object.fromEntries(
      String(signatureHeader || '')
        .split(',')
        .map((part) => part.trim().split('=')),
    );
    const sentAt = Number(parts.t);
    if (!secret || !parts.v1 || !Number.isFinite(sentAt)) return false;
    // An old call replayed later is refused even if its signature is right.
    if (Math.abs(Date.now() / 1000 - sentAt) > toleranceSeconds) return false;
    const expected = Buffer.from(crypto.createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex'));
    const given = Buffer.from(parts.v1);
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  }
}
