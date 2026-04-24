# API

## Документация (Swagger / OpenAPI)

После запуска API откройте в браузере:

- **Локально:** `http://localhost:3001/docs` (порт из `API_PORT`, по умолчанию `3001`)
- **Через Docker:** тот же путь на хосте, если проброшен порт API (в compose — `3001`)

Интерактивная документация на русском: группы маршрутов, краткие описания, схема тела для входа/регистрации, кнопка **Authorize** для JWT и отдельная схема для заголовка Telegram webhook.

**Почему Swagger:** это стандарт для NestJS, одна OpenAPI-спецификация (`/docs-json`) для фронта и тестов. Альтернативы вроде Scalar или Redoc — по сути другой UI поверх того же OpenAPI; при желании их можно подключить позже, не меняя контроллеры.

Отключить UI (например, на проде): переменная окружения `SWAGGER=0` или `SWAGGER=false`.

## Telegram: polling vs webhook

| Переменная                  | Значение                  | Назначение                                                      |
| --------------------------- | ------------------------- | --------------------------------------------------------------- |
| `TELEGRAM_UPDATES_MODE`     | `polling` или `webhook`   | Как получать апдейты от Telegram                                |
| `TELEGRAM_SHARED_BOT_POLLING` | `true` или `false`      | Для общего бота `__shared__`: разрешать long polling в режиме webhook |
| `TELEGRAM_WEBHOOK_BASE_URL` | HTTPS URL без `/` в конце | Только для `webhook`: `setWebhook` на `{BASE}/telegram/webhook` |

- **`webhook` (по умолчанию):** при старте API активные боты переподписываются на webhook; при добавлении бота в кабинете — сразу `setWebhook`; при деактивации — `deleteWebhook`. Нужен публичный HTTPS.
- **`polling`:** для локального Docker (`docker-compose.dev.yml`) — Grammy long polling по каждому активному боту, входящий HTTP webhook от Telegram не используется.
- Перед запуском polling сервис принудительно вызывает `deleteWebhook` для бота, чтобы избежать конфликтов после переключения режима webhook -> polling.

Ответы в чат отправляются через `sendMessage` (Bot API).

## RabbitMQ очередь ответов из кабинета

Для разгрузки API ответы менеджера в Telegram (`POST /conversations/reply`) ставятся в очередь и отправляются асинхронно.

Переменные окружения:

- `RABBITMQ_ENABLED=true|false` — включить/выключить очередь.
- `RABBITMQ_URL=amqp://user:pass@host:5672` — адрес брокера.
- `RABBITMQ_CONVERSATIONS_REPLY_QUEUE=conversations.reply.v1` — имя очереди.
- `RABBITMQ_PREFETCH=10` — сколько задач consumer обрабатывает параллельно.

Если RabbitMQ недоступен, сервис автоматически использует синхронный fallback и логирует событие `chat_reply_queue_publish_failed_fallback_sync`.

## Симуляция диалогов (юзкейсы)

Можно прогонять базовые сценарии общения клиента и бота командой:

```bash
npm run simulate:dialogs
```

Скрипт выводит результат по каждому сценарию и итог:

- `lead_created` — бот может переводить в создание заявки.
- `manager_requested` — клиент просит живого менеджера.
- `manager_emergency` — срочная эскалация менеджеру.
- `client_refused` — клиент отказался.
- `needs_followup` — данных недостаточно, нужен уточняющий вопрос.
- диалог по шагам: `client: ...` и `bot: ...`, чтобы визуально проверять сценарий.

Файл сценариев: `src/tools/dialog-simulator.ts` (можно расширять под свои кейсы).

## Эскалация менеджеру в Telegram

В диалоге реализована эскалация:

- если пользователь просит менеджера (`менеджер`, `оператор`, `живой человек`, `переключите`), бот:
  - отправляет уведомление менеджеру (если у менеджера заполнен `chatId`);
  - подтверждает пользователю, что запрос передан;
  - логирует событие `manager_escalation_requested`;
  - отправляет служебное уведомление через `AdminTelegramService`.
- если отправка сообщения пользователю не удалась (`telegram_send_message_failed`), отправляется аварийное уведомление админу (`[Telegram delivery failed] ...`).

## Политика обращения и защита данных

- По умолчанию AI-ассистент обращается к клиенту на **«Вы»**.
- Исключение: если владелец компании явно настроил обращение **«на ты»** в параметрах тона/инструкции, это считается осознанным override.
- В логах включена автоматическая маскировка чувствительных данных:
  - токены (`bot token`, `Bearer ...`),
  - `secret`, `password`, `jwt`, `authorization`, `cookie`, `api key`, `encryption key`.
- Рекомендация: не передавать секреты в текстовые поля инструкций и сообщений, даже несмотря на маскирование.

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

Для **голосовых в Telegram** (конвертация OGG→WAV) в `PATH` должен быть **`ffmpeg`** (на macOS: `brew install ffmpeg`). В Docker dev-образе `ffmpeg` уже в `Dockerfile.dev`.

## Start prod

```bash
npm run build
npm run start:prod
```
