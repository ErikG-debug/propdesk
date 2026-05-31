# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Vad detta är

PropDesk är ett AI-drivet ärendehanteringssystem för fastighetsbolag. Hyresgäster mailar fastighetsskötarens vanliga supportinkorg. Mailhanteringen vidarebefordras automatiskt till plattformen. En AI (Claude) sköter inledande kommunikation med hyresgästen och samlar strukturerad information tills ärendet är komplett — sedan tar en mänsklig handläggare över via dashboardens CRM.

Hyresgäster interagerar aldrig med plattformens UI. Dashboarden är enbart för fastighetsbolagets personal.

## Kommandon

```bash
npm run dev          # Starta dev-server (localhost:3000)
npm run build        # Produktionsbygg
npm run lint         # ESLint
npm run db:migrate   # Kör Prisma-migrationer mot databas
npm run db:push      # Push schema direkt (dev utan migrationshistorik)
npm run db:studio    # Öppna Prisma Studio (databas-UI)
npm run db:generate  # Generera Prisma-klient efter schemaändring
```

## Arkitektur

### E-postflödet (kärnan)
1. Hyresgästens mail vidarebefordras via forward-regel → Postmark inbound webhook → `POST /api/webhook/email`
2. Webhook-handler matchar mail mot befintligt ärende via `emailThreadId` (eller skapar nytt)
3. Claude klassificerar ärendekategori och identifierar saknade fält
4. Claude genererar svar på svenska och mailet skickas via Gmail OAuth2 från fastighetsskötarens riktiga adress
5. När alla obligatoriska fält är insamlade → status `READY_FOR_REVIEW`

### Ärendestatus-flöde
```
COLLECTING_INFORMATION → WAITING_FOR_RESIDENT (48h timeout)
                      → READY_FOR_REVIEW (alla fält klara)
                      → ESCALATED (otrevlig ton detekterad)
IN_PROGRESS → CLOSED
WAITING_FOR_RESIDENT → ARCHIVED (7 dagar utan svar)
```

### Mappstruktur
```
src/
  app/
    api/
      webhook/email/   # Postmark inbound webhook
      cases/           # CRUD för ärenden
      auth/            # NextAuth OAuth2-routes
    (dashboard)/       # Skyddade dashboard-sidor
  lib/
    prisma.ts          # Prisma-singleton
    claude.ts          # Claude API-integration
    gmail.ts           # Gmail OAuth2 + utskick
  types/
    index.ts           # Delade typer och CaseWithDetails
  components/
    cases/             # Ärendekomponenter
    dashboard/         # Layout och navigation
```

### Databas (Prisma 7 + PostgreSQL)
Konfiguration sker i `prisma.config.ts`, inte i `schema.prisma`. `DATABASE_URL` läses via dotenv i `prisma.config.ts`.

Prisma 7 använder WASM-baserad klientmotor och kräver en adapter. `src/lib/prisma.ts` initierar `PrismaPg` med `DATABASE_URL` och skickar den till `PrismaClient({ adapter })`. Kör aldrig `new PrismaClient()` utan adapter — det kastar `PrismaClientConstructorValidationError` vid build.

Kör Next.js via `node node_modules/next/dist/bin/next build` — `.bin`-symlinken är bruten i Node 22. Lägg gärna till npm-scriptet `"build": "node node_modules/next/dist/bin/next build"` om det ger problem.

Centrala modeller:
- `Company` → `Property` → `Case` (hierarki)
- `IssueCategory` + `CategoryField` = konfigurerbar ärendestruktur per bolag (vad AI ska fråga efter)
- `CaseFieldValue` = insamlade svar kopplade till `CategoryField`
- `EmailAccount` = Gmail OAuth2-tokens per bolag (en per bolag)
- `Message` = komplett e-posthistorik per ärende (fromResident: bool)

### E-postsändning (OAuth2)
Fastighetsskötarens Gmail kopplas via OAuth2 vid onboarding. Tokens sparas i `EmailAccount`. All utgående post skickas som dem via Gmail API — hyresgästen ser aldrig att det är en plattform inblandad.

### AI-integration
Claude används för tre uppgifter per inkommande mail:
1. Klassificera ärendekategori
2. Identifiera vilka `CategoryField`-värden som saknas
3. Generera nästa följdfråga på svenska (eller flagga eskalering)

Eskalering triggas vid detekterad aggressiv/hotfull ton — direkt till status `ESCALATED` utan att AI fortsätter konversationen.

## Miljövariabler

Se `.env` för alla nycklar. Kritiska:
- `DATABASE_URL` — Railway PostgreSQL
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Gmail OAuth2
- `ANTHROPIC_API_KEY` — Claude API
- `POSTMARK_API_KEY` / `POSTMARK_WEBHOOK_SECRET` — inkommande mail
- `NEXTAUTH_SECRET` — NextAuth session-signering
