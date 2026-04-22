import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

/**
 * Интерактивная OpenAPI-документация (Swagger UI).
 * Тексты на русском; при необходимости отключите: переменная окружения SWAGGER=0.
 */
export function setupSwagger(app: INestApplication): void {
  if (process.env.SWAGGER === "0" || process.env.SWAGGER === "false") {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle("AI Seller — HTTP API")
    .setDescription(
      [
        "REST API личного кабинета: компании, менеджеры, заявки, боты и биллинг.",
        "",
        "Для защищённых маршрутов укажите заголовок **Authorization** со значением `Bearer <токен>`.",
        "Токен выдаётся методами `POST /auth/register` и `POST /auth/login`.",
        "",
        "Входящий webhook Telegram: заголовок **X-Telegram-Bot-Api-Secret-Token** должен совпадать с секретом, заданным при подключении бота.",
      ].join("\n"),
    )
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "Authorization",
        in: "header",
        description: "JWT после входа или регистрации",
      },
      "JWT",
    )
    .addApiKey(
      {
        type: "apiKey",
        name: "X-Telegram-Bot-Api-Secret-Token",
        in: "header",
        description: "Секрет webhook бота (как при connect)",
      },
      "telegram-webhook",
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document, {
    customSiteTitle: "AI Seller — API",
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
