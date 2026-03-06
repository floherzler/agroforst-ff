import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { Separator } from "@/components/ui/separator";

export default function Footer() {
  return (
    <footer className="border-t border-border/70 bg-card/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">
              Landwirtschaft, direkt und nachvollziehbar.
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Wir bauen eine einfache Plattform für saisonale Produkte,
              Bestellungen und Feedback aus der Region.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Navigation
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/marktplatz">Marktplatz</Link>
              <Link to="/produkte">Produkte</Link>
              <Link to="/konto">Mitgliederbereich</Link>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Rechtliches
            </p>
            <div className="flex flex-col gap-2 text-sm">
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

        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; {new Date().getFullYear()} Agroforst Frank Fege</span>
          <span>Prignitz, Brandenburg</span>
        </div>
      </div>
    </footer>
  );
}
