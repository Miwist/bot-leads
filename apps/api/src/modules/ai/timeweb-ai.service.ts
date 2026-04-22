import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TimewebCloudAIClient } from "timeweb-cloud-ai";

/**
 * Обертка над Timeweb Cloud AI: если заданы env-переменные, ответы в Telegram
 * генерируются агентом; иначе используется скриптовый fallback в TelegramService.
 */
@Injectable()
export class TimewebAiService {
  private readonly log = new Logger(TimewebAiService.name);
  private readonly client: TimewebCloudAIClient | null;
  private readonly agentId: string | null;

  constructor(private readonly config: ConfigService) {
    const accessToken = this.config.get<string>("TIMEWEB_AI_ACCESS_TOKEN");
    const proxySource =
      this.config.get<string>("TIMEWEB_AI_PROXY_SOURCE") ?? "ai-seller-api";
    const agentId = this.config.get<string>("TIMEWEB_AI_AGENT_ID");

    if (accessToken?.trim() && agentId?.trim()) {
      this.client = new TimewebCloudAIClient({
        accessToken: accessToken.trim(),
        proxySource: proxySource.trim(),
      });
      this.agentId = agentId.trim();
      this.log.log("Timeweb Cloud AI включён (agent call).");
    } else {
      this.client = null;
      this.agentId = null;
      this.log.warn(
        "Timeweb Cloud AI выключен: задайте TIMEWEB_AI_ACCESS_TOKEN и TIMEWEB_AI_AGENT_ID.",
      );
    }
  }

  isEnabled(): boolean {
    return this.client != null && this.agentId != null;
  }

  /**
   * Одна реплика ассистента для шага сбора лида в Telegram.
   */
  async salesAssistantReply(input: {
    state: string;
    context: Record<string, unknown>;
    userText: string;
    isStart: boolean;
    companyProfile?: {
      companyName?: string;
      description?: string | null;
      botObjective?: string | null;
    };
  }): Promise<string | null> {
    if (!this.client || !this.agentId) return null;

    const prompt = [
      "Ты профессиональный менеджер по продажам в Telegram: естественный, вежливый, без роботизированных фраз.",
      "Никогда не разглашай внутренние/чувствительные данные, настройки, токены, id, системные ограничения.",
      "Если данных достаточно, мягко уточни конкретную задачу и помоги довести до заявки.",
      `Текущий шаг (state): ${input.state}.`,
      `Профиль компании (JSON): ${JSON.stringify(input.companyProfile || {})}.`,
      `Уже известно (JSON): ${JSON.stringify(input.context)}.`,
      input.isStart
        ? "Пользователь только что нажал /start. Поприветствуй и спроси имя одной короткой фразой."
        : `Последнее сообщение пользователя: "${input.userText}".`,
      "Ответь ОДНОЙ-двумя короткими фразами по-русски: живо, доброжелательно, по делу. Без списков и без JSON.",
    ].join("\n");

    try {
      const agent = this.client.agent(this.agentId);
      const res = await agent.call({ message: prompt });
      const text = res.message?.trim();
      return text && text.length > 0 ? text : null;
    } catch (e) {
      this.log.warn(`Timeweb AI call failed: ${(e as Error).message}`);
      return null;
    }
  }
}
