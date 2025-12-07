import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const linkBase = "text-sm text-[#1f2021]/80 transition hover:text-[#1f2021]";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-surface-outline bg-surface-card/75 text-[#1f2021]">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4 text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-lilac-soft bg-surface-lilac px-3 py-1 text-xs font-semibold uppercase tracking-wider text-lilac-700">
              Permdal Gemeinschaft
            </p>
            <h2 className="text-xl font-semibold text-[#1f2021]">
              Freundlich. Direkt. Landwirtschaft aus Brandenburg.
            </h2>
            <p className="mx-auto max-w-xl text-sm text-[#1f2021]/75 lg:mx-0">
              Wir bauen transparenter, saisonaler Landwirtschaft eine Bühne. Schreib uns jederzeit, wenn du Feedback
              oder Wünsche hast – wir planen unsere Ernten gemeinsam mit dir.
            </p>
          </div>

          <div className="grid flex-1 gap-8 sm:grid-cols-2 lg:max-w-md">
            <div className="space-y-3 text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1f2021]/60">Navigation</p>
              <ul className="space-y-2">
                <li>
                  <Link href="/konto" className={linkBase}>
                    Mitgliederbereich
                  </Link>
                </li>
                <li>
                  <Link href="/marktplatz" className={linkBase}>
                    Marktplatz &amp; Bestellungen
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className={linkBase}>
                    Feldnotizen &amp; Updates
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3 text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1f2021]/60">Rechtliches</p>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/impressum" className="text-lilac-700 transition hover:text-lilac-800">
                    Impressum
                  </Link>
                </li>
                <li>
                  <Link href="/agbs" className="text-permdal-600 transition hover:text-permdal-700">
                    AGB
                  </Link>
                </li>
                <li>
                  <Link href="/datenschutz" className="text-lilac-700 transition hover:text-lilac-800">
                    Datenschutz
                  </Link>
                </li>
              </ul>
              <div className="space-y-1 text-sm text-[#1f2021]/75">
                <p className="font-semibold text-[#1f2021]">Kontakt</p>
                <p>Agroforst Frank Fege</p>
                <p>Prignitz · Brandenburg</p>
                <Link href="mailto:team@agroforst-ff.de" className="inline-flex items-center gap-1 text-primary hover:text-primary/80">
                  team@agroforst-ff.de
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-surface-outline bg-white/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-center text-xs text-[#1f2021]/70 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>&copy; {new Date().getFullYear()} Agroforst Frank Fege · Permdal</span>
          <span>Gemeinsam nachhaltige Landwirtschaft gestalten.</span>
        </div>
      </div>
    </footer>
  );
}
