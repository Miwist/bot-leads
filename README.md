# AI-продавец Monorepo (MVP)

[![Deploy](https://github.com/Miwist/bot-leads/actions/workflows/deploy-ventaria.yml/badge.svg)](https://github.com/Miwist/bot-leads/actions/workflows/deploy-ventaria.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)

## Структура

- apps/api — NestJS API, интерактивная документация OpenAPI (Swagger UI) по пути `/docs` — см. `apps/api/README.md`
- apps/web — Next.js кабинет
- infra/docker-compose.yml — локальная инфраструктура (прод-режим образов)
- infra/docker-compose.dev.yml — поверх базового compose: **watch** API/Web и **Telegram polling** (см. ниже)
- infra/.env.example — переменные окружения
- packages/shared — резерв под shared package

## Памятка для пользователей кабинета

Если вы впервые запускаете сервис как пользователь, ориентируйтесь на этот путь:

1. Зарегистрируйтесь и откройте раздел «Подключение».
2. Выберите вариант:
   - **Общий бот** — самый быстрый старт, без создания своего бота.
   - **Свой бот** — персональный бренд, подключение через токен от BotFather.
3. Заполните короткое описание компании и сценарий первого контакта.
4. Откройте раздел «Боты», скопируйте ссылку и отправьте её клиентам.
5. Контролируйте обращения в разделах «Диалоги» и «Заявки».

В интерфейсе есть отдельная страница «Инструкция» с пошаговым гайдом для
неопытных пользователей.

## Быстрый запуск

```bash
cp infra/.env.example infra/.env
docker compose -f infra/docker-compose.yml up --build
```

## Docker в режиме разработки (watch + Telegram polling)

Для **hot-reload** исходников в контейнере и **long polling** вместо webhook (удобно без публичного HTTPS):

```bash
cp infra/.env.example infra/.env
# dev-compose переопределяет порты: фронт http://localhost:3000, API http://localhost:3001 (и NEXT_PUBLIC для браузера).
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml up --build
```

- API: `nest start --watch`, порт на хосте **3001** (не `API_PUBLISH_PORT` из .env).
- Web: `next dev` на **3000**, запросы к API из браузера на `localhost:3001`, из контейнера — на `http://api:3001`.
- **Прод**: только `docker-compose.yml`. Общий бот (`companyId="__shared__"`) всегда работает через polling, даже если выбран webhook-режим. Для кастомных ботов в `.env` можно оставить `TELEGRAM_UPDATES_MODE=webhook` и `TELEGRAM_WEBHOOK_BASE_URL` (публичный HTTPS без `/` в конце): тогда при добавлении вызывается `setWebhook` на `{BASE}/telegram/webhook`, при деактивации — `deleteWebhook`.

## Метрики и логи (локально в проекте)

В `infra/docker-compose.yml` добавлены сервисы мониторинга:

- **Grafana** (UI) — `http://localhost:${GRAFANA_PUBLISH_PORT}` (по умолчанию `http://localhost:3060`)
- **Prometheus** (метрики) — `http://localhost:${PROMETHEUS_PUBLISH_PORT}` (по умолчанию `9090`)
- **Loki** (хранилище логов) — `http://localhost:${LOKI_PUBLISH_PORT}` (по умолчанию `3100`)
- **Promtail** (сбор логов Docker-контейнеров в Loki)

Логин/пароль в Grafana задаются в `infra/.env`:

```bash
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin
```

### Как запустить

```bash
cp infra/.env.example infra/.env
docker compose -f infra/docker-compose.yml up --build
```

### Где смотреть

- **Grafana**: Explore -> datasource `Loki` для логов контейнеров (`compose_service="api"`, `compose_service="web"` и т.д.)
- **Grafana**: Dashboards/Explore -> datasource `Prometheus` для метрик API
- **API метрики** доступны по `GET /metrics` (в compose это `http://localhost:${API_PUBLISH_PORT}/metrics`)

### RabbitMQ и Telegram: как читать логи

RabbitMQ UI и Grafana решают разные задачи:

- **RabbitMQ UI** (`http://localhost:15672`) — состояние очередей: `Ready`, `Unacked`, `Consumers`, rate.
- **Grafana/Loki** — человекочитаемый аудит работы очереди: что поставлено, что обработано, где ошибка.

В Grafana откройте **Explore** -> datasource **Loki** и используйте фильтр по API:

```logql
{compose_service="api"}
```

Дальше добавляйте поиск по событиям:

| Где искать | Пример запроса в Loki | Что означает |
| --- | --- | --- |
| Постановка задачи в очередь | `{compose_service="api"} |= "chat_reply_queued"` | Ответ менеджера поставлен в RabbitMQ |
| Начало обработки | `{compose_service="api"} |= "chat_reply_processing"` | Consumer взял задачу в работу |
| Успешная отправка | `{compose_service="api"} |= "chat_reply_sent"` | Сообщение/вложения успешно ушли в Telegram |
| Ошибка отправки | `{compose_service="api"} |= "chat_reply_send_failed"` | Ошибка при вызове Telegram API |
| Ошибка публикации в очередь | `{compose_service="api"} |= "rabbitmq_publish_failed"` | Не удалось отправить задачу в RabbitMQ |
| Ошибка обработки consumer | `{compose_service="api"} |= "rabbitmq_consume_failed"` | Consumer не смог обработать сообщение |
| Переключение webhook -> polling | `{compose_service="api"} |= "Webhook снят перед polling"` | Перед polling вызван `deleteWebhook`, конфликтов быть не должно |

Практика поиска проблем:

1. Смотрите `chat_reply_queued` -> есть ли затем `chat_reply_processing`.
2. Если processing есть, но нет `chat_reply_sent`, ищите `chat_reply_send_failed`.
3. Если нет даже queued, проверяйте `rabbitmq_publish_failed`.
4. В RabbitMQ UI смотрите рост `Ready`/`Unacked` (если растут, consumer не успевает или падает).

## Белый экран во фронте (MUI + Next.js)

В корневой layout добавлены **`AppRouterCacheProvider`** (`@mui/material-nextjs`) и **`ThemeProvider` + `CssBaseline`**: без этого Emotion/MUI в App Router часто рендерят «пустую» страницу. В `apps/web/.npmrc` включён **`legacy-peer-deps`** из‑за peer `next@15` у `@mui/material-nextjs` при использовании Next 16 (в Docker `npm ci` читает этот файл).

## Timeweb Cloud AI

В `infra/.env` задайте `TIMEWEB_AI_ACCESS_TOKEN` и `TIMEWEB_AI_AGENT_ID` (идентификатор агента вида `agt_...` из панели Timeweb). Опционально `TIMEWEB_AI_PROXY_SOURCE`. Тогда ответы в Telegram на шагах сбора заявки идут через библиотеку `timeweb-cloud-ai` (`agent.call`); без переменных остаются скриптовые фразы.

## Если Docker не стартует

- **Cannot connect to the Docker daemon** — запусти Docker Desktop (или `dockerd`), затем повтори команду.
- **`npm ci` out of sync** в сборке `api`/`web` — lock-файлы в `apps/api` и `apps/web` должны соответствовать их `package.json` (контекст сборки — только папка приложения, без корневого workspace). После правок зависимостей перегенерируй lock изолированно или запусти `npm install` внутри соответствующей папки приложения и закоммить обновлённый `package-lock.json`.

## Миграции

```bash
cd apps/api
npm run migration:run
npm run migration:revert
```

## Форматирование (Prettier)

Из корня репозитория (учитывается `.prettierignore` и конфиг в `apps/api/.prettierrc` / настройки по умолчанию для остальных файлов):

```bash
npm run format
```

Проверка без записи в файлы:

```bash
npm run format:check
```

Эквивалент через `npx`: `npx prettier --write .`

## CI/CD

Деплой на сервер: [`.github/workflows/deploy-ventaria.yml`](.github/workflows/deploy-ventaria.yml) (push в `main` / `master`). Сборка в CI, на сервер: `${DEPLOY_HOME}/public` ← `apps/web/out`, `${DEPLOY_HOME}/api` ← исходники API, `${DEPLOY_HOME}/docker-compose.yml`. Секреты: `SSH_PRIVATE_KEY` (или `SERVER_SSH_KEY`), `SSH_HOST` (или `SERVER_IP`), `SSH_USER`; опционально `SERVER_DEPLOY_HOME`. Variables: `DEPLOY_PATH` (если нет `SERVER_DEPLOY_HOME`), `NEXT_PUBLIC_API_URL`.

## Что реализовано

- JWT auth: register/login/me
- Companies, Managers CRUD
- Подключение bot token через Telegram getMe
- Telegram: общий бот всегда в **polling**; для кастомных ботов доступен **webhook**; ответы пользователю через **sendMessage**
- Endpoint `/telegram/webhook` для Telegram в режиме webhook (`X-Telegram-Bot-Api-Secret-Token`)
- Диалог Telegram (start -> name -> phone -> need) и создание заявки
- Round-robin назначение заявки активному менеджеру
- Тарифные лимиты Starter/Growth/Pro
- Кабинет (login/register/dashboard/leads/managers/bots/settings/billing)

## TODO

- Полноценный Conversation module API
- Укрепление RBAC и multitenant-изоляции на уровне guard/interceptor
- Redis rate limit вместо in-memory
- Полноценные DTO классы для всех endpoint
- E2E тесты и seed команды
