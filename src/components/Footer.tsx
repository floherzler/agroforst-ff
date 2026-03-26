import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { Separator } from "@/components/ui/separator";

export default function Footer() {
  return (
    <footer className="border-t border-border/70 bg-white/60 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <h2 className="font-display text-2xl leading-tight tracking-[-0.03em] text-[var(--color-soil-900)]">
              Frische Produkte. Klare Herkunft. Direkter Draht.
            </h2>
            <p className="text-sm leading-6 text-[var(--color-soil-700)]">
              Agroforst Frank Fege verbindet saisonale Landwirtschaft mit
              direktem Kontakt und einem ruhigen, ehrlichen Einkaufserlebnis.
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-accent text-xs uppercase tracking-[0.18em] text-[var(--color-soil-500)]">
              Navigation
            </p>
            <div className="flex flex-col gap-2 text-sm text-[var(--color-soil-700)]">
              <Link to="/">Start</Link>
              <Link to="/produkte">Produkte</Link>
              <Link to="/konto">Konto</Link>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-accent text-xs uppercase tracking-[0.18em] text-[var(--color-soil-500)]">
              Kontakt & Rechtliches
            </p>
            <div className="flex flex-col gap-2 text-sm text-[var(--color-soil-700)]">
              <Link to="/impressum">Impressum</Link>
              <Link to="/agbs">AGB</Link>
              <Link to="/datenschutz">Datenschutz</Link>
              <a
                href="mailto:team@agroforst-ff.de"
                className="inline-flex items-center gap-1"
              >
                team@agroforst-ff.de
                <ArrowUpRight className="size-3.5" />
              </a>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-2 text-xs text-[var(--color-soil-500)] sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {new Date().getFullYear()} Agroforst Frank Fege</span>
          <span>Prignitz, Brandenburg</span>
        </div>
      </div>
    </footer>
  );
}
