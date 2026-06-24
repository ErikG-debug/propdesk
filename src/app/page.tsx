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
          Hyresgästen hör av sig som vanligt — Bo tar hand om resten.
          Ärendet skapas, klassificeras och rätt information samlas in automatiskt.
          Du granskar, godkänner och servicepersonalen kontaktas.
        </p>
        <Link
          href="/login"
          className="rounded-lg bg-[#1a6ba8] px-6 py-3 text-base font-medium text-white transition hover:bg-[#155a8f]"
        >
          Logga in på dashboarden
        </Link>
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
