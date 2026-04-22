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

## Быстрый запуск

```bash
cp infra/.env.example infra/.env
docker compose -f infra/docker-compose.yml up --build
```

## Docker в режиме разработки (watch + Telegram polling)

Для **hot-reload** исходников в контейнере и **long polling** вместо webhook (удобно без публичного HTTPS):

```bash
cp infra/.env.example infra/.env
# В infra/.env выставьте TELEGRAM_UPDATES_MODE=polling (в dev-файле уже переопределено для api, но в .env можно продублировать)
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml up --build
```

- API: `nest start --watch`, код монтируется из `apps/api`, `node_modules` — в именованном volume.
- Web: `next dev` на `0.0.0.0`, монтирование `apps/web`.
- **Прод**: только `docker-compose.yml`, в `.env` — `TELEGRAM_UPDATES_MODE=webhook` и **`TELEGRAM_WEBHOOK_BASE_URL`** (публичный HTTPS без `/` в конце). После добавления бота в админке вызывается `setWebhook` на `{BASE}/telegram/webhook`; при деактивации — `deleteWebhook`. При старте API активные боты переподписываются на webhook.

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
- Telegram: режим **webhook** (прод) или **polling** (Docker dev); ответы пользователю через **sendMessage**
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
