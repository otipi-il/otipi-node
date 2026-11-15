# Otipi Node.js SDK (`otipi`)

Official zero-dependency Node.js client for **Otipi** (https://otipi.co.il): transactional Email, SMS, and WhatsApp login codes (OTP) for applications in Israel, with built-in templates in Hebrew (`he`), Arabic (`ar`), Russian (`ru`), and English (`en`).

---

## English

### Installation

```bash
npm install otipi
```

Requires Node.js 18 or newer. Use on the server side only (API routes, server actions, edge functions). Never expose your `sk_test_...` or `sk_live_...` key in the browser.

### Quick Start

```js
import { Otipi, OtipiError } from 'otipi';

const otipi = new Otipi(process.env.OTIPI_KEY);

// 1. Send a login code (WhatsApp first with automatic fallback to SMS)
const otp = await otipi.otp.send({
  to: '+972501234567',
  app: 'MyApp',
  channel: 'auto', // 'sms' | 'whatsapp' | 'email' | 'auto'
  language: 'he',  // 'he' | 'ar' | 'ru' | 'en'
});

// 2. Verify the code entered by the user
const { valid, reason } = await otipi.otp.verify({
  to: '+972501234567',
  code: '482917',
});

if (valid) {
  // Sign the user in
}

// 3. Send a transactional email
const emailMsg = await otipi.send({
  channel: 'email',
  from: 'MyApp <hello@myapp.co.il>',
  to: 'dana@example.com',
  subject: 'Order confirmed',
  template: 'order-confirmed',
  language: 'he',
  variables: { name: 'Dana', order: '1042', app: 'MyApp' },
});

// 4. Check message status
const status = await otipi.messages.get(emailMsg.id);
```

### Supabase Auth Integration (Send SMS Hook)

You can connect Supabase phone authentication directly to Otipi without writing custom Edge Functions:

1. Open your Supabase project dashboard and go to `Auth -> Hooks -> Send SMS Hook`.
2. Choose **HTTP Request**.
3. Set the URL to:
   ```text
   https://otipi.co.il/v1/integrations/supabase-sms-hook?channel=auto
   ```
4. Add the HTTP header `Authorization: Bearer sk_live_...` (or configure your Standard Webhooks secret).

Otipi will accept `{ user: { phone }, sms: { otp } }` from Supabase, send the code via WhatsApp with automatic fallback to SMS, and return `200 {}`.

### One-Click Prompt for Lovable, Cursor, and Base44

Copy and paste this prompt into **Lovable** or **Cursor**:

```text
Add Otipi to this project for phone login (OTP via WhatsApp/SMS) and transactional email in Israel.

Rules:
- Call Otipi from server code only. Read the API key from process.env.OTIPI_KEY (Authorization: Bearer <key>).
- Base URL: https://otipi.co.il/v1
- Phone numbers are Israeli mobile numbers (+9725XXXXXXXX).

Phone login in two calls:
1. POST https://otipi.co.il/v1/otp/send
   Body: { "to": "+972501234567", "app": "MyApp", "channel": "auto", "language": "he" }
   Returns 201: { "id", "status": "pending", "expires_at", "test_code" }
2. POST https://otipi.co.il/v1/otp/verify
   Body: { "to": "+972501234567", "code": "123456" }
   Returns 200: { "valid": true } or { "valid": false, "reason": "wrong_code" | "expired_or_missing" | "too_many_attempts" }

Transactional email / SMS:
- POST https://otipi.co.il/v1/messages
  Body: { "channel": "email" | "sms", "to": "...", "from": "MyApp <hello@myapp.co.il>", "subject": "...", "text": "..." }

Full reference: https://otipi.co.il/llms-full.txt
OpenAPI 3.1 spec (for Base44): https://otipi.co.il/openapi.json
```

For **Base44**, add an external API integration from an OpenAPI specification and point it to `https://otipi.co.il/openapi.json` with your `Bearer sk_live_...` key.

---

## Русский

### Установка

```bash
npm install otipi
```

Требуется Node.js 18 или новее. Используйте пакет только на сервере (API-маршруты, серверные экшены, фоновые функции). Никогда не передавайте секретный ключ `sk_test_...` или `sk_live_...` в браузер.

### Быстрый старт

```js
import { Otipi, OtipiError } from 'otipi';

const otipi = new Otipi(process.env.OTIPI_KEY);

// 1. Отправка кода входа (сначала WhatsApp, при сбое провайдера автоматический переход на SMS)
const otp = await otipi.otp.send({
  to: '+972501234567',
  app: 'MyApp',
  channel: 'auto', // 'sms' | 'whatsapp' | 'email' | 'auto'
  language: 'ru',  // 'he' | 'ar' | 'ru' | 'en'
});

// 2. Проверка кода, который ввёл пользователь
const { valid, reason } = await otipi.otp.verify({
  to: '+972501234567',
  code: '482917',
});

if (valid) {
  // Авторизуем пользователя
}

// 3. Отправка транзакционного письма
const emailMsg = await otipi.send({
  channel: 'email',
  from: 'MyApp <hello@myapp.co.il>',
  to: 'dana@example.com',
  subject: 'Заказ подтверждён',
  template: 'order-confirmed',
  language: 'ru',
  variables: { name: 'Дана', order: '1042', app: 'MyApp' },
});

// 4. Проверка статуса доставки и истории событий
const status = await otipi.messages.get(emailMsg.id);
```

### Подключение к Supabase Auth (Send SMS Hook)

Вы можете подключить вход по номеру телефона в Supabase напрямую к Otipi без написания собственных Edge Functions:

1. В панели управления проектом Supabase откройте раздел `Auth -> Hooks -> Send SMS Hook`.
2. Выберите тип хука **HTTP Request**.
3. Вставьте URL:
   ```text
   https://otipi.co.il/v1/integrations/supabase-sms-hook?channel=auto
   ```
4. Укажите заголовок `Authorization: Bearer sk_live_...` (или секрет Standard Webhooks).

Otipi примет стандартный вебхук `{ user: { phone }, sms: { otp } }`, отправит код через WhatsApp с автоматическим резервом на SMS и вернёт `200 {}`.

### Готовый промпт для Lovable, Cursor и Base44

Скопируйте и вставьте этот системный промпт в **Lovable** или **Cursor**:

```text
Подключи Otipi к проекту для входа по телефону (OTP через WhatsApp и SMS) и отправки писем в Израиле.

Правила:
- Вызывай API Otipi только на сервере. Ключ бери из переменной окружения OTIPI_KEY (заголовок Authorization: Bearer <key>).
- Базовый адрес: https://otipi.co.il/v1
- Номера телефонов: израильские мобильные номера в формате +9725XXXXXXXX.

Вход по телефону в два вызова:
1. POST https://otipi.co.il/v1/otp/send
   Тело: { "to": "+972501234567", "app": "MyApp", "channel": "auto", "language": "he" }
   Ответ 201: { "id", "status": "pending", "expires_at", "test_code" }
2. POST https://otipi.co.il/v1/otp/verify
   Тело: { "to": "+972501234567", "code": "123456" }
   Ответ 200: { "valid": true } или { "valid": false, "reason": "wrong_code" | "expired_or_missing" | "too_many_attempts" }

Отправка писем и SMS:
- POST https://otipi.co.il/v1/messages
  Тело: { "channel": "email" | "sms", "to": "...", "from": "MyApp <hello@myapp.co.il>", "subject": "...", "text": "..." }

Полная документация для ИИ: https://otipi.co.il/llms-full.txt
Спецификация OpenAPI 3.1 (для Base44): https://otipi.co.il/openapi.json
```

Для **Base44** добавьте внешнюю интеграцию по спецификации OpenAPI и укажите адрес `https://otipi.co.il/openapi.json` с заголовком `Authorization: Bearer sk_live_...`.

## License

MIT
