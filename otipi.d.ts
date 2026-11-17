export type OtipiChannel = 'email' | 'sms' | 'whatsapp';
export type OtipiOtpChannel = 'sms' | 'whatsapp' | 'email' | 'auto';
export type OtipiLanguage = 'he' | 'ar' | 'ru' | 'en';
export type OtipiMode = 'test' | 'live';
export type OtipiMessageStatus = 'queued' | 'sent' | 'delivered' | 'opened' | 'failed' | 'bounced';
export type OtipiOtpInvalidReason = 'wrong_code' | 'expired_or_missing' | 'too_many_attempts';

export interface OtipiErrorOptions {
  status?: number;
  code?: string;
}

export declare class OtipiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, options?: OtipiErrorOptions);
}

export interface OtipiOptions {
  /** The service address; defaults to process.env.OTIPI_BASE_URL or "https://otipi.co.il". */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 15000). */
  timeoutMs?: number;
  /** Custom fetch implementation for testing. */
  fetch?: typeof globalThis.fetch;
}

export interface OtipiMessageInput {
  channel: OtipiChannel;
  to: string;
  from?: string;
  subject?: string;
  text?: string;
  html?: string;
  template?: string;
  variables?: Record<string, string | number | boolean>;
  language?: OtipiLanguage;
}

export interface OtipiSendOptions {
  idempotencyKey?: string;
}

export interface OtipiMessage {
  id: string;
  channel: OtipiChannel;
  to: string;
  from: string | null;
  subject: string | null;
  template: string | null;
  status: OtipiMessageStatus;
  mode: OtipiMode;
  /** Test mode only: "real" when it went to one of your confirmed numbers or addresses, "sandbox" when it was only logged. */
  test_delivery?: 'sandbox' | 'real';
  segments: number | null;
  error: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
}

export interface OtipiMessageEvent {
  type: string;
  detail: string | null;
  at: string;
}

export interface OtipiMessageWithEvents extends OtipiMessage {
  events: OtipiMessageEvent[];
}

export interface OtipiMessageListQuery {
  limit?: number;
  channel?: OtipiChannel;
  status?: OtipiMessageStatus;
}

export interface OtipiMessageList {
  data: OtipiMessage[];
  has_more: boolean;
}

export interface OtipiOtpSendInput {
  /** Israeli mobile number (+9725XXXXXXXX or 05XXXXXXXX) or email address when channel is "email". */
  to: string;
  /** Application or brand name shown in the OTP message (up to 40 chars). */
  app: string;
  /** Delivery channel: "sms" (default), "whatsapp", "email", or "auto" (WhatsApp first with automatic SMS fallback). */
  channel?: OtipiOtpChannel;
  /** Message language: "he" (default), "ar", "ru", or "en". */
  language?: OtipiLanguage;
  /** Number of digits in the code (4 to 8, default: 6). */
  length?: number;
  /** Code validity in minutes (1 to 30, default: 5). */
  ttlMinutes?: number;
  /** Code validity in minutes (snake_case alias for ttlMinutes). */
  ttl_minutes?: number;
  /** Approved SMS sender name or verified email sender. */
  from?: string;
}

export interface OtipiOtp {
  id: string;
  status: 'pending';
  to: string;
  channel: OtipiChannel;
  message_id: string;
  expires_at: string;
  /** Present only when using a test key (sk_test_...). */
  test_code?: string;
}

export interface OtipiOtpVerifyInput {
  to: string;
  code: string;
}

export interface OtipiOtpVerifyResult {
  valid: boolean;
  reason?: OtipiOtpInvalidReason;
}

export interface OtipiTestRecipient {
  id: string;
  channel: 'sms' | 'email';
  to: string;
  status: 'pending' | 'confirmed';
  /** Present in the answer to add(): false when the recipient was already confirmed. */
  code_sent?: boolean;
  created_at: string;
  confirmed_at: string | null;
}

export interface OtipiTestRecipientList {
  data: OtipiTestRecipient[];
  free_sms: { total: number; used: number; left: number };
}

export interface OtipiVerifyWebhookOptions {
  /** Maximum age of the webhook signature in seconds (default: 300). */
  toleranceSeconds?: number;
}

export declare class Otipi {
  readonly messages: {
    get(id: string): Promise<OtipiMessageWithEvents>;
    list(query?: OtipiMessageListQuery): Promise<OtipiMessageList>;
  };

  readonly otp: {
    send(input: OtipiOtpSendInput): Promise<OtipiOtp>;
    verify(input: OtipiOtpVerifyInput): Promise<OtipiOtpVerifyResult>;
  };

  /** Test mode (sk_test_ keys only): confirm your own number or email so test messages to it really arrive. */
  readonly testRecipients: {
    list(): Promise<OtipiTestRecipientList>;
    add(input: { to: string; language?: OtipiLanguage }): Promise<OtipiTestRecipient>;
    verify(input: { to: string; code: string }): Promise<OtipiTestRecipient>;
  };

  constructor(apiKey: string, options?: OtipiOptions);

  send(message: OtipiMessageInput, options?: OtipiSendOptions): Promise<OtipiMessage>;

  static verifyWebhook(
    rawBody: string | Buffer,
    signatureHeader: string | undefined | null,
    secret: string,
    options?: OtipiVerifyWebhookOptions,
  ): boolean;
}
