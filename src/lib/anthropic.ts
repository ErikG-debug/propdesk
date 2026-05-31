import Anthropic from "@anthropic-ai/sdk";
import type { IssueCategory, CategoryField, CaseFieldValue } from "@prisma/client";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface CategoryWithFields extends IssueCategory {
  fields: CategoryField[];
}

interface CollectedValue extends CaseFieldValue {
  field: CategoryField;
}

export interface AIAnalysisResult {
  escalate: boolean;
  escalationReason?: string;
  detectedCategoryId?: string;
  extractedFields: Record<string, string>;
  missingFields: string[];
  isComplete: boolean;
  replyMessage: string;
  summary?: string;
}

const SYSTEM_PROMPT = `Du är en AI-assistent som hanterar inkommande supportmail åt ett fastighetsbolag.

Din uppgift per inkommande mail:
1. Kontrollera om tonen är aggressiv, hotfull eller otrevlig. Om ja, sätt escalate: true.
2. Klassificera ärendet till rätt kategori (om ingen kategori är vald än).
3. Extrahera strukturerade fält från mailinnehållet (lägenhetsnummer, namn, etc).
4. Avgör vilka obligatoriska fält som fortfarande saknas.
5. Generera ett artigt svar på svenska som ber om de saknade uppgifterna, ELLER bekräftar att ärendet är komplett.

Regler:
- Svara ALLTID på svenska.
- Var kortfattad och professionell, ej robotaktig.
- Om alla fält är samlade sätt isComplete: true och generera en summary.
- Om escalate är true, generera INTE ett normalt svar — skriv ett kort meddelande om att ärendet eskaleras till en handläggare.
- Returnera ALLTID giltig JSON utan markdown-block.`;

export async function analyzeIncomingEmail({
  emailBody,
  residentName,
  categories,
  currentCategoryId,
  collectedValues,
  conversationHistory,
}: {
  emailBody: string;
  residentName?: string | null;
  categories: CategoryWithFields[];
  currentCategoryId?: string | null;
  collectedValues: CollectedValue[];
  conversationHistory: { role: "user" | "assistant"; content: string }[];
}): Promise<AIAnalysisResult> {
  const currentCategory = categories.find((c) => c.id === currentCategoryId);

  const categoryContext = categories
    .map(
      (cat) =>
        `Kategori "${cat.name}" (id: ${cat.id}):\n` +
        cat.fields
          .map(
            (f) =>
              `  - ${f.label} (nyckel: ${f.key}, krävs: ${f.required}${f.options.length ? `, alternativ: ${f.options.join("|")}` : ""})`
          )
          .join("\n")
    )
    .join("\n\n");

  const collectedContext =
    collectedValues.length > 0
      ? "Redan insamlade uppgifter:\n" +
        collectedValues.map((v) => `  - ${v.field.label}: ${v.value}`).join("\n")
      : "Inga uppgifter insamlade än.";

  const activeCategoryContext = currentCategory
    ? `Valt ärendekategori: ${currentCategory.name} (id: ${currentCategory.id})`
    : "Ärendekategori: ej vald än — klassificera baserat på mailinnehållet.";

  const userPrompt = `${activeCategoryContext}

${collectedContext}

Tillgängliga kategorier:
${categoryContext}

Senaste mail från hyresgäst${residentName ? ` (${residentName})` : ""}:
---
${emailBody}
---

Returnera ett JSON-objekt med exakt dessa nycklar:
{
  "escalate": boolean,
  "escalationReason": string | null,
  "detectedCategoryId": string | null,
  "extractedFields": { "fältnyckel": "värde" },
  "missingFields": ["fältnyckel"],
  "isComplete": boolean,
  "replyMessage": string,
  "summary": string | null
}`;

  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: userPrompt },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const parsed = JSON.parse(text) as AIAnalysisResult;
  return parsed;
}
