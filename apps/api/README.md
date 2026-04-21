# API

## Документация (Swagger / OpenAPI)

После запуска API откройте в браузере:

- **Локально:** `http://localhost:3001/docs` (порт из `API_PORT`, по умолчанию `3001`)
- **Через Docker:** тот же путь на хосте, если проброшен порт API (в compose — `3001`)

Интерактивная документация на русском: группы маршрутов, краткие описания, схема тела для входа/регистрации, кнопка **Authorize** для JWT и отдельная схема для заголовка Telegram webhook.

**Почему Swagger:** это стандарт для NestJS, одна OpenAPI-спецификация (`/docs-json`) для фронта и тестов. Альтернативы вроде Scalar или Redoc — по сути другой UI поверх того же OpenAPI; при желании их можно подключить позже, не меняя контроллеры.

Отключить UI (например, на проде): переменная окружения `SWAGGER=0` или `SWAGGER=false`.

## Telegram: polling vs webhook

| Переменная | Значение | Назначение |
|------------|----------|------------|
| `TELEGRAM_UPDATES_MODE` | `polling` или `webhook` | Как получать апдейты от Telegram |
| `TELEGRAM_WEBHOOK_BASE_URL` | HTTPS URL без `/` в конце | Только для `webhook`: `setWebhook` на `{BASE}/telegram/webhook` |

- **`webhook` (по умолчанию):** при старте API активные боты переподписываются на webhook; при добавлении бота в кабинете — сразу `setWebhook`; при деактивации — `deleteWebhook`. Нужен публичный HTTPS.
- **`polling`:** для локального Docker (`docker-compose.dev.yml`) — Grammy long polling по каждому активному боту, входящий HTTP webhook от Telegram не используется.

Ответы в чат отправляются через `sendMessage` (Bot API).

## Install

```bash
npm install
```

## Migrate

```bash
npm run migration:run
```

## Start dev

```bash
npm run dev
```

## Start prod

```bash
npm run build
npm run start:prod
```
