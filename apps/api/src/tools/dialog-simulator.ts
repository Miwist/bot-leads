type Scenario = {
  id: string;
  title: string;
  turns: string[];
};

type SimulationResult = {
  id: string;
  title: string;
  outcome:
    | "lead_created"
    | "manager_requested"
    | "client_refused"
    | "manager_emergency"
    | "needs_followup";
  reason: string;
  transcript: Array<{ role: "client" | "bot"; text: string }>;
};

const defaultScenarios: Scenario[] = [
  {
    id: "s1",
    title: "Клиент оставил контакты и потребность",
    turns: [
      "Здравствуйте",
      "Меня зовут Михаил",
      "Телефон +79998887766",
      "Нужен расчет для бота продаж на сайт",
    ],
  },
  {
    id: "s2",
    title: "Клиент просит живого менеджера",
    turns: ["Хочу поговорить с менеджером", "Переключите на человека"],
  },
  {
    id: "s3",
    title: "Клиент отказался",
    turns: ["Нет, неинтересно", "Я передумал, спасибо"],
  },
  {
    id: "s4",
    title: "Экстренный запрос",
    turns: ["Срочно! Не могу получить доступ, позовите менеджера"],
  },
];

function hasPhone(text: string) {
  return /(\+?\d[\d\s\-()]{8,}\d)/.test(text);
}

function detectOutcome(turns: string[]): SimulationResult["outcome"] {
  const joined = turns.join("\n").toLowerCase();
  if (/(срочно|авар|критич|не работает|ошибка оплаты)/i.test(joined)) {
    return "manager_emergency";
  }
  if (/(менедж|оператор|человек|живой)/i.test(joined)) {
    return "manager_requested";
  }
  if (/(неинтерес|передумал|отказ|не надо|не нужно)/i.test(joined)) {
    return "client_refused";
  }
  if (hasPhone(joined) && /(нужен|хочу|интересует|задач|запрос)/i.test(joined)) {
    return "lead_created";
  }
  return "needs_followup";
}

function reasonByOutcome(outcome: SimulationResult["outcome"]) {
  if (outcome === "lead_created") return "Есть контакт и сформулированная потребность";
  if (outcome === "manager_requested")
    return "Пользователь явно просит переключение на менеджера";
  if (outcome === "client_refused") return "Пользователь отказался от продолжения";
  if (outcome === "manager_emergency")
    return "Обнаружены триггеры срочной эскалации";
  return "Недостаточно данных — нужен уточняющий вопрос";
}

function botReplyForTurn(
  clientText: string,
  conversationText: string,
  outcome: SimulationResult["outcome"],
): string {
  const t = clientText.toLowerCase();
  if (/(привет|здравств)/i.test(t)) {
    return "Здравствуйте! Как вас зовут?";
  }
  if (/(меня зовут|я\s+[а-яa-z]+)/i.test(t)) {
    return "Спасибо! Подскажите, пожалуйста, номер телефона для связи.";
  }
  if (/(\+?\d[\d\s\-()]{8,}\d)/.test(t)) {
    return "Принял(а) контакт. Опишите, с каким вопросом помочь.";
  }
  if (outcome === "manager_emergency") {
    return "Понял(а), это срочный вопрос. Передаю запрос старшему менеджеру прямо сейчас.";
  }
  if (outcome === "manager_requested") {
    return "Передал(а) ваш запрос менеджеру. Он подключится в ближайшее время.";
  }
  if (outcome === "client_refused") {
    return "Понял(а), спасибо за обратную связь. Если передумаете, просто напишите в чат.";
  }
  if (outcome === "lead_created") {
    return "Спасибо! Зафиксировал(а) заявку и передал(а) менеджеру.";
  }
  if (conversationText.length < 8) {
    return "Можете рассказать чуть подробнее о вашей задаче?";
  }
  return "Уточните, пожалуйста, что для вас сейчас самое важное.";
}

function buildTranscript(
  turns: string[],
  outcome: SimulationResult["outcome"],
): Array<{ role: "client" | "bot"; text: string }> {
  const transcript: Array<{ role: "client" | "bot"; text: string }> = [];
  const conversationTextParts: string[] = [];
  for (const turn of turns) {
    transcript.push({ role: "client", text: turn });
    conversationTextParts.push(turn);
    transcript.push({
      role: "bot",
      text: botReplyForTurn(turn, conversationTextParts.join("\n"), outcome),
    });
  }
  return transcript;
}

function simulateScenario(s: Scenario): SimulationResult {
  const outcome = detectOutcome(s.turns);
  return {
    id: s.id,
    title: s.title,
    outcome,
    reason: reasonByOutcome(outcome),
    transcript: buildTranscript(s.turns, outcome),
  };
}

function printResults(results: SimulationResult[]) {
  console.log("\n=== Dialog Simulation Results ===\n");
  for (const r of results) {
    console.log(`[${r.id}] ${r.title}`);
    console.log("  dialog:");
    for (const msg of r.transcript) {
      const author = msg.role === "client" ? "client" : "bot   ";
      console.log(`    ${author}: ${msg.text}`);
    }
    console.log(`  outcome: ${r.outcome}`);
    console.log(`  reason: ${r.reason}`);
    console.log("");
  }
  const summary = results.reduce(
    (acc, r) => {
      acc[r.outcome] = (acc[r.outcome] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  console.log("Summary:", summary);
}

function main() {
  const results = defaultScenarios.map(simulateScenario);
  printResults(results);
}

main();
