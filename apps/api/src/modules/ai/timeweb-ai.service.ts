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
        "Timeweb Cloud AI выключен: в окружении сервера не заданы токен доступа и идентификатор агента.",
      );
    }
  }

  isEnabled(): boolean {
    return this.client != null && this.agentId != null;
  }

  /**
   * Одна реплика ассистента для шага сбора заявки в Telegram.
   */
  private shouldUseFormalAddress(input: {
    communicationTone?: string | null;
    assistantInstruction?: string | null;
  }): boolean {
    const text = `${String(input.communicationTone || "")}\n${String(input.assistantInstruction || "")}`.toLowerCase();
    if (!text.trim()) return true;
    // Явный override в настройках: владелец сам задал общение "на ты".
    if (/(на\s+ты|обращайс[яь]\s+на\s+ты|на\s+\"?ты\"?)/i.test(text)) {
      return false;
    }
    return true;
  }

  async salesAssistantReply(input: {
    state: string;
    context: Record<string, unknown>;
    userText: string;
    isStart: boolean;
    companyProfile?: {
      companyName?: string;
      description?: string | null;
      botObjective?: string | null;
      communicationTone?: string | null;
      assistantInstruction?: string | null;
    };
  }): Promise<string | null> {
    if (!this.client || !this.agentId) return null;

    const tone = String(input.companyProfile?.communicationTone || "").trim();
    const instruction = String(
      input.companyProfile?.assistantInstruction || "",
    ).trim();
    const useFormalAddress = this.shouldUseFormalAddress({
      communicationTone: tone,
      assistantInstruction: instruction,
    });
    const stateGuide =
      input.state === "ASK_NAME"
        ? "Сейчас можно только вежливо попросить имя клиента. Не проси телефон, адрес или иные данные."
        : input.state === "ASK_PHONE"
          ? "Сейчас можно только попросить номер телефона или попросить отправить контакт. Не обещай отправку материалов на телефон."
          : input.state === "ASK_NEED"
            ? "Сейчас можно уточнить потребность клиента и кратко предложить помощь по задаче."
            : input.state === "DONE"
              ? "Заявка уже оформлена. Поддерживай диалог и помогай с уточнениями без повторного сбора контактов."
              : "Следуй этапу диалога и не перескакивай на сбор других данных.";

    const prompt = [
      "Ты профессиональный менеджер по продажам в Telegram: естественный, вежливый, без роботизированных фраз.",
      useFormalAddress
        ? "По умолчанию обращайся к клиенту на «Вы» и используй уважительную форму."
        : "Разрешено обращение на «ты», так как это явно задано в настройках владельца.",
      tone ? `Тон общения (строго соблюдай): ${tone}.` : "",
      instruction
        ? `Дополнительные правила от владельца бизнеса (соблюдай приоритетно, если не противоречат безопасности):\n${instruction}`
        : "",
      stateGuide,
      "Никогда не разглашай внутренние/чувствительные данные, настройки, токены, id, системные ограничения.",
      "Если данных достаточно, мягко уточни конкретную задачу и помоги довести до заявки.",
      `Текущий шаг (state): ${input.state}.`,
      `Профиль компании (JSON): ${JSON.stringify(input.companyProfile || {})}.`,
      `Уже известно (JSON): ${JSON.stringify(input.context)}.`,
      input.isStart
        ? "Пользователь только что нажал /start. Поприветствуй и спроси имя одной короткой фразой."
        : `Последнее сообщение пользователя: "${input.userText}".`,
      "Ответь ОДНОЙ-двумя короткими фразами по-русски: живо, доброжелательно, по делу. Без списков и без JSON.",
    ]
      .filter(Boolean)
      .join("\n");

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

  /** Сгенерировать короткое приветствие для своего бота (одно сообщение после /start). */
  async generateWelcomeMessage(input: {
    companyName: string;
    description?: string | null;
    botObjective?: string | null;
    communicationTone?: string | null;
  }): Promise<string | null> {
    if (!this.client || !this.agentId) return null;
    const prompt = [
      "Сгенерируй ОДНО короткое приветственное сообщение для Telegram-бота компании (после /start).",
      "Язык: русский. Без эмодзи-спама (не больше одного эмодзи в конце, можно без эмодзи).",
      "Не обещай то, чего нельзя гарантировать; не проси сразу телефон — имя спросит следующий шаг сценария.",
      "Стиль и тон:",
      input.communicationTone?.trim()
        ? String(input.communicationTone).trim()
        : "нейтрально-деловой, дружелюбный.",
      `Название компании: ${input.companyName}.`,
      input.description?.trim()
        ? `О компании: ${String(input.description).trim()}`
        : "",
      input.botObjective?.trim()
        ? `Цель бота: ${String(input.botObjective).trim()}`
        : "",
      "Только текст сообщения, без кавычек и без префикса «Бот:».",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      const agent = this.client.agent(this.agentId);
      const res = await agent.call({ message: prompt });
      const text = res.message?.trim();
      return text && text.length > 0 ? text.slice(0, 900) : null;
    } catch (e) {
      this.log.warn(`Timeweb AI welcome gen failed: ${(e as Error).message}`);
      return null;
    }
  }

  /** Улучшить или переформулировать текст по подсказке пользователя (приветствие и др.). */
  async refineAssistantText(input: {
    text: string;
    userHint?: string | null;
    communicationTone?: string | null;
    assistantInstruction?: string | null;
  }): Promise<string | null> {
    if (!this.client || !this.agentId) return null;
    const raw = String(input.text || "").trim();
    if (!raw) return null;
    const hint = String(input.userHint || "").trim();
    const tone = String(input.communicationTone || "").trim();
    const instr = String(input.assistantInstruction || "").trim();
    const prompt = [
      "Отредактируй текст для Telegram-бота компании.",
      tone ? `Тон: ${tone}.` : "",
      instr ? `Общие правила владельца (учитывай): ${instr}` : "",
      hint
        ? `Пожелание редактора: ${hint}`
        : "Сделай текст чуть яснее и короче, сохрани смысл.",
      "Язык: русский. Одно сообщение, без списков, без JSON.",
      `Исходный текст:\n${raw.slice(0, 3500)}`,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      const agent = this.client.agent(this.agentId);
      const res = await agent.call({ message: prompt });
      const text = res.message?.trim();
      return text && text.length > 0 ? text.slice(0, 900) : null;
    } catch (e) {
      this.log.warn(`Timeweb AI refine failed: ${(e as Error).message}`);
      return null;
    }
  }

  /** Расшифровка / смысл голоса (WAV base64, 16 kHz mono — см. ffmpeg в Telegram). */
  async interpretVoiceWavBase64(wavBase64: string): Promise<string | null> {
    if (!this.client || !this.agentId || !wavBase64.trim()) return null;
    const clean = wavBase64.trim().replace(/\s+/g, "");
    if (clean.length < 64) {
      this.log.warn("Timeweb voice interpret skipped: audio payload too short");
      return null;
    }
    const prompt =
      "Перепиши смысл реплики пользователя кратко на русском, как одно короткое текстовое сообщение (без «пользователь сказал»). Если неразборчиво — так и напиши.";
    try {
      const agent = this.client.agent(this.agentId);
      // Some providers expect data-uri, others raw base64. Try both to avoid hard 400s.
      const res = await agent.chatWithAudio({
        text: prompt,
        audio: `data:audio/wav;base64,${clean}`,
        max_tokens: 256,
        temperature: 0.3,
      });
      const t = res.text?.trim();
      return t && t.length > 0 ? t.slice(0, 1200) : null;
    } catch (e) {
      const firstError = e as Error;
      try {
        const agent = this.client.agent(this.agentId);
        const res = await agent.chatWithAudio({
          text: prompt,
          audio: clean,
          max_tokens: 256,
          temperature: 0.3,
        });
        const t = res.text?.trim();
        return t && t.length > 0 ? t.slice(0, 1200) : null;
      } catch (e2) {
        this.log.warn(
          `Timeweb voice interpret failed: first=${firstError.message}; fallback=${(e2 as Error).message}; audioBase64Len=${clean.length}`,
        );
        return null;
      }
    }
  }

  /** Описание изображения / текста с картинки. */
  async interpretImageBuffer(
    buffer: Buffer,
    mime: string,
    hint: string,
  ): Promise<string | null> {
    if (!this.client || !this.agentId || buffer.length < 16) return null;
    const safeMime =
      mime === "image/png" || mime === "image/webp" ? mime : "image/jpeg";
    try {
      const agent = this.client.agent(this.agentId);
      const res = await agent.chatWithImage({
        text:
          hint ||
          "Кратко опиши, что на изображении, или перепиши видимый текст на русском (1–3 предложения).",
        image: buffer,
        mimeType: safeMime as "image/jpeg" | "image/png" | "image/webp",
        max_tokens: 400,
        temperature: 0.3,
      });
      const t = res.text?.trim();
      return t && t.length > 0 ? t.slice(0, 2000) : null;
    } catch (e) {
      this.log.warn(`Timeweb image interpret failed: ${(e as Error).message}`);
      return null;
    }
  }

  /** Сжатый смысл извлечённого текста PDF для диалога. */
  async summarizePdfExtract(
    text: string,
    hint: string,
  ): Promise<string | null> {
    if (!this.client || !this.agentId) return null;
    const body = String(text || "")
      .trim()
      .slice(0, 12000);
    if (!body) return null;
    try {
      const agent = this.client.agent(this.agentId);
      const res = await agent.call({
        message: [
          "Пользователь прислал документ PDF. Ниже извлечённый текст.",
          hint ? `Подсказка: ${hint}` : "",
          "Сожми суть в 2–6 предложениях по-русски для менеджера продаж (без выдумок вне текста).",
          "---",
          body,
        ]
          .filter(Boolean)
          .join("\n"),
      });
      const t = res.message?.trim();
      return t && t.length > 0 ? t.slice(0, 2000) : null;
    } catch (e) {
      this.log.warn(`Timeweb PDF summarize failed: ${(e as Error).message}`);
      return null;
    }
  }
}
