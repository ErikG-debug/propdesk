import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BoDesk",
  description:
    "BoDesk är en webbapp för fastighetsbolag som hjälper personal hantera inkommande ärenden från hyresgäster via e-post och dashboard.",
  openGraph: {
    title: "BoDesk",
    description:
      "BoDesk är en webbapp för fastighetsbolag som hjälper personal hantera inkommande ärenden från hyresgäster via e-post och dashboard.",
    url: "https://bodesk.se",
    siteName: "BoDesk",
  },
};

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Image src="/logo.png" alt="BoDesk" width={280} height={80} className="h-20 w-auto" />
          <Link
            href="/login"
            className="rounded-lg bg-[#1a6ba8] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#155a8f]"
          >
            Logga in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-5xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="mb-3 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          BoDesk
        </h1>
        <p className="mb-4 text-xl font-medium text-[#1a6ba8]">
          AI-driven ärendehantering för fastighetsbolag
        </p>
        <p className="mb-8 max-w-xl text-lg text-gray-500">
          Hyresgäster mailar er vanliga felanmälningsadress. BoDesk tar emot
          inkommande ärenden, klassificerar dem med AI och hjälper handläggaren
          samla in rätt information.
        </p>
        <Link
          href="/login"
          className="rounded-lg bg-[#1a6ba8] px-6 py-3 text-base font-medium text-white transition hover:bg-[#155a8f]"
        >
          Logga in på dashboarden
        </Link>
      </section>

      {/* Vad är BoDesk */}
      <section className="border-t border-gray-100 px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-2xl font-semibold text-gray-900">Vad är BoDesk?</h2>
          <p className="text-gray-600 leading-relaxed">
            BoDesk är en webbapp för fastighetsbolag och fastighetsförvaltare.
            Tjänsten hjälper personal att hantera inkommande ärenden från hyresgäster
            via e-post och dashboard. BoDesk används av fastighetspersonal — inte av
            hyresgäster direkt.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-100 bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-semibold text-gray-900">
            Hur det fungerar
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-3 text-2xl">📬</div>
              <h3 className="mb-2 font-semibold text-gray-900">Inkommande mail</h3>
              <p className="text-sm text-gray-500">
                Hyresgästen skickar felanmälan till er befintliga e-postadress.
                BoDesk tar emot den automatiskt.
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-3 text-2xl">🤖</div>
              <h3 className="mb-2 font-semibold text-gray-900">Bo hanterar dialogen</h3>
              <p className="text-sm text-gray-500">
                Bo klassificerar ärendet, ställer följdfrågor och samlar
                in all information som handläggaren behöver.
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-3 text-2xl">✅</div>
              <h3 className="mb-2 font-semibold text-gray-900">Handläggaren tar över</h3>
              <p className="text-sm text-gray-500">
                När ärendet är komplett hamnar det i dashboarden för granskning
                och åtgärd av er personal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Google-data */}
      <section className="border-t border-gray-100 px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Varför BoDesk använder Google-data</h2>
          <p className="text-sm leading-relaxed text-gray-600">
            Om en användare ansluter Gmail används behörigheten uteslutande för att
            skicka svar från användarens egen Gmail-adress i ärenden som hanteras i
            BoDesk. BoDesk läser inte, lagrar inte och analyserar inte befintlig e-post
            i Gmail-kontot. BoDesk använder inte Gmail-data för annonsering eller försäljning.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8 text-center text-xs text-gray-400">
        <p className="mb-1 font-medium text-gray-500">BoDesk</p>
        <p className="mb-3">
          Kontakt:{" "}
          <a href="mailto:blomoliver05@gmail.com" className="hover:underline">
            blomoliver05@gmail.com
          </a>
          {" · "}
          <span>bodesk.se</span>
        </p>
        <Link href="/privacy" className="hover:underline">
          Integritetspolicy
        </Link>
        {" · "}
        <span>© {new Date().getFullYear()} BoDesk</span>
      </footer>
    </main>
  );
}
