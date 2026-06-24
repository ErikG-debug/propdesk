import { prisma } from "./prisma";
import { analyzeIncomingEmail } from "./anthropic";
import { sendEmailAsPropertyManager } from "./email";
import type { InboundEmail } from "@/types";
import type { CaseStatus } from "@prisma/client";

// Sätt till true för att testa flödet utan Anthropic-credits
const SKIP_AI = process.env.SKIP_AI === "true";

const WAITING_TIMEOUT_HOURS = 48;
const ARCHIVE_TIMEOUT_DAYS = 7;
const GDPR_DELETE_DAYS = 90;

export async function processInboundEmail(email: InboundEmail): Promise<void> {
  const companyInclude = {
    categories: { include: { fields: { orderBy: { order: "asc" as const } } } },
  };

  // Matcha på To-adress, sedan bolaget med e-postkonto kopplat, annars första bolaget
  let company =
    (await prisma.company.findFirst({
      where: { intakeEmail: email.to.toLowerCase() },
      include: companyInclude,
    })) ??
    (await prisma.company.findFirst({
      where: { emailAccount: { isNot: null } },
      include: companyInclude,
    })) ??
    (await prisma.company.findFirst({ include: companyInclude }));

  console.log(`Bolag valt: ${company?.id} (${company?.name}) för inkommande mail till ${email.to}`);

  const aiSignature = company?.aiSignature?.trim() ?? "";

  if (!company) {
    console.warn(`Inget bolag hittades i databasen — ignorerar mail`);
    return;
  }

  // Matcha mot befintligt ärende via In-Reply-To-headern.
  // emailId kan lagras med eller utan vinkelparenteser beroende på provider —
  // testa båda varianterna för att täcka äldre poster.
  const caseInclude = {
    messages: { orderBy: { sentAt: "asc" as const } },
    fieldValues: { include: { field: true } },
    category: { include: { fields: { orderBy: { order: "asc" as const } } } },
  };

  const findCaseByEmailId = (emailId: string) =>
    prisma.case.findFirst({
      where: { companyId: company.id, messages: { some: { emailId } } },
      include: caseInclude,
    });

  type FoundCase = Awaited<ReturnType<typeof findCaseByEmailId>>;

  let existingCase: FoundCase = null;

  if (email.inReplyTo) {
    const stripped = email.inReplyTo.replace(/^<|>$/g, "");
    existingCase =
      (await findCaseByEmailId(`<${stripped}>`)) ??
      (await findCaseByEmailId(stripped));
  }

  // Ignorera mail på avslutade ärenden
  if (
    existingCase &&
    (existingCase.status === "CLOSED" || existingCase.status === "ARCHIVED")
  ) {
    return;
  }

  // Spara inkommande meddelande
  const incomingMessage = existingCase
    ? await prisma.message.create({
        data: {
          caseId: existingCase.id,
          fromResident: true,
          body: email.textBody,
          emailId: email.messageId,
        },
      })
    : null;

  // Bygg konversationshistorik för Claude
  const history =
    existingCase?.messages.map((m) => ({
      role: (m.fromResident ? "user" : "assistant") as "user" | "assistant",
      content: m.body,
    })) ?? [];

  // AI-analys (eller testfallback utan credits)
  const analysis = SKIP_AI
    ? {
        escalate: false,
        detectedCategoryId: undefined,
        extractedFields: {},
        missingFields: [],
        isComplete: false,
        replyMessage:
          "Tack för ditt meddelande! Vi har tagit emot ditt ärende och återkommer inom kort.",
        summary: undefined,
      }
    : await analyzeIncomingEmail({
        emailBody: email.textBody,
        residentName: existingCase?.residentName,
        categories: company.categories,
        currentCategoryId: existingCase?.categoryId,
        collectedValues: existingCase?.fieldValues ?? [],
        conversationHistory: history,
      });

  if (!existingCase) {
    // Skapa nytt ärende
    existingCase = await prisma.case.create({
      data: {
        companyId: company.id,
        residentEmail: email.from,
        residentName: extractName(email.from),
        subject: email.subject,
        emailThreadId: email.messageId,
        categoryId: company.categories.some((c) => c.id === analysis.detectedCategoryId)
          ? analysis.detectedCategoryId
          : null,
        status: analysis.escalate ? "ESCALATED" : "COLLECTING_INFORMATION",
        escalationNote: analysis.escalationReason ?? null,
        lastResidentAt: new Date(),
      },
      include: {
        messages: true,
        fieldValues: { include: { field: true } },
        category: { include: { fields: { orderBy: { order: "asc" } } } },
      },
    });

    await prisma.message.create({
      data: {
        caseId: existingCase.id,
        fromResident: true,
        body: email.textBody,
        emailId: email.messageId,
      },
    });
  } else {
    // Uppdatera befintligt ärende med ny kategori om den saknas
    const updates: Partial<{ categoryId: string; lastResidentAt: Date; waitingSince: null }> = {
      lastResidentAt: new Date(),
      waitingSince: null,
    };
    if (!existingCase.categoryId && analysis.detectedCategoryId) {
      updates.categoryId = analysis.detectedCategoryId;
    }
    await prisma.case.update({ where: { id: existingCase.id }, data: updates });
    void incomingMessage;
  }

  // Spara extraherade fältvärden
  if (Object.keys(analysis.extractedFields).length > 0) {
    const categoryFields = existingCase.category?.fields ?? [];

    for (const [key, value] of Object.entries(analysis.extractedFields)) {
      const field = categoryFields.find((f) => f.key === key);
      if (!field) continue;

      await prisma.caseFieldValue.upsert({
        where: { caseId_fieldId: { caseId: existingCase.id, fieldId: field.id } },
        create: { caseId: existingCase.id, fieldId: field.id, value },
        update: { value },
      });
    }
  }

  // Bestäm ny status
  let newStatus: CaseStatus = existingCase.status;
  if (analysis.escalate) {
    newStatus = "ESCALATED";
  } else if (analysis.isComplete) {
    newStatus = "READY_FOR_REVIEW";
  } else {
    newStatus = "COLLECTING_INFORMATION";
  }

  await prisma.case.update({
    where: { id: existingCase.id },
    data: {
      status: newStatus,
      ...(analysis.escalationReason ? { escalationNote: analysis.escalationReason } : {}),
      ...(analysis.isComplete && analysis.summary ? { summary: analysis.summary } : {}),
    },
  });

  // Skicka AI-svar — hoppa över om eskalerat (handläggare tar över manuellt)
  if (analysis.escalate) return;

  const replySubject = existingCase.subject.startsWith("Re:")
    ? existingCase.subject
    : `Re: ${existingCase.subject}`;

  const aiBody = aiSignature
    ? `${analysis.replyMessage}\n\n${aiSignature}`
    : analysis.replyMessage;

  let sentMessageId: string | null = null;
  try {
    sentMessageId = await sendEmailAsPropertyManager({
      companyId: company.id,
      to: email.from,
      subject: replySubject,
      body: aiBody,
      inReplyTo: email.messageId,
      references: email.inReplyTo
        ? `${email.inReplyTo} ${email.messageId}`
        : email.messageId,
    });
  } catch (err) {
    console.error("Kunde inte skicka AI-svar via Gmail:", err);
  }

  if (sentMessageId) {
    await prisma.message.create({
      data: {
        caseId: existingCase.id,
        fromResident: false,
        body: aiBody,
        emailId: sentMessageId,
      },
    });
  }

  // Sätt väntar-status om mail skickades och vi inte är klara
  if (sentMessageId && !analysis.isComplete && !analysis.escalate) {
    await prisma.case.update({
      where: { id: existingCase.id },
      data: {
        status: "WAITING_FOR_RESIDENT",
        waitingSince: new Date(),
      },
    });
  }
}

// Kontrollera timeout-regler för ärenden utan svar — körs periodiskt
export async function checkTimeouts(): Promise<void> {
  const waitingCutoff = new Date(Date.now() - WAITING_TIMEOUT_HOURS * 60 * 60 * 1000);
  const archiveCutoff = new Date(Date.now() - ARCHIVE_TIMEOUT_DAYS * 24 * 60 * 60 * 1000);

  // Ärenden som väntat >7 dagar → arkivera
  await prisma.case.updateMany({
    where: {
      status: "WAITING_FOR_RESIDENT",
      waitingSince: { lt: archiveCutoff },
    },
    data: { status: "ARCHIVED" },
  });

  // Ärenden som väntat >48h men <7 dagar → håll i WAITING (redan satt)
  // Kan användas för att skicka påminnelse i framtida version
  void waitingCutoff;

  // GDPR: radera avslutade och arkiverade ärenden efter 90 dagar
  const gdprCutoff = new Date(Date.now() - GDPR_DELETE_DAYS * 24 * 60 * 60 * 1000);
  await prisma.case.deleteMany({
    where: {
      status: { in: ["CLOSED", "ARCHIVED"] },
      updatedAt: { lt: gdprCutoff },
    },
  });
}

function extractName(fromEmail: string): string {
  const match = fromEmail.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : fromEmail.split("@")[0];
}
