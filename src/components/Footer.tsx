import { Link } from "@tanstack/react-router";
import { Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative px-4 pb-6 pt-2 sm:px-6 sm:pb-8 lg:px-8 lg:pb-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-border/70 px-5 py-6 shadow-[0_22px_56px_-34px_rgba(40,32,24,0.22),0_0_0_1px_rgba(134,124,110,0.06)] backdrop-blur-md [background:linear-gradient(180deg,color-mix(in_srgb,var(--color-background)_92%,white_8%),color-mix(in_srgb,var(--color-background)_84%,var(--color-permdal-50)_16%))] sm:px-8 sm:py-8 lg:px-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lilac-300/80 to-transparent" />
          <div className="pointer-events-none absolute -right-10 bottom-8 h-32 w-32 rounded-full bg-lilac-200/30 blur-3xl" />

          <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center gap-6 text-center">
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-[var(--color-soil-900)]/10 bg-white/78 px-3 py-2 shadow-[0_16px_34px_-24px_rgba(35,22,15,0.24)]">
              <span className="flex size-9 items-center justify-center rounded-[0.95rem] border border-lilac-200/70 bg-white/90">
                <img
                  src="/img/agroforst_ff_icon_bg.png"
                  alt="Agroforst Frank Fege Logo"
                  className="size-6 object-contain"
                />
              </span>
              <span className="font-accent text-[0.72rem] uppercase tracking-[0.22em] text-[var(--color-harvest-600)]">
                Agroforst Frank Fege
              </span>
            </div>

            <div className="flex flex-col items-center gap-3 text-sm text-[var(--color-soil-700)] sm:flex-row sm:flex-wrap sm:justify-center">
              <a
                href="mailto:team@agroforst-ff.de"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-soil-900)]/10 bg-white/72 px-3 py-1.5 transition-colors hover:bg-white"
              >
                <Mail className="size-4 text-[var(--color-harvest-600)]" />
                team@agroforst-ff.de
              </a>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-soil-900)]/10 bg-white/72 px-3 py-1.5">
                <MapPin className="size-4 text-[var(--color-lilac-700)]" />
                Ostprignitz, Brandenburg
              </div>
            </div>

            <nav
              aria-label="Footer"
              className="flex flex-col items-center gap-3 text-sm text-[var(--color-soil-700)] sm:flex-row sm:flex-wrap sm:justify-center"
            >
              <Link
                to="/"
                className="rounded-full border border-transparent px-3 py-2 transition-colors hover:border-lilac-200/70 hover:bg-white/80"
              >
                Start
              </Link>
              <Link
                to="/produkte"
                className="rounded-full border border-transparent px-3 py-2 transition-colors hover:border-lilac-200/70 hover:bg-white/80"
              >
                Produkte
              </Link>
              <Link
                to="/konto"
                className="rounded-full border border-transparent px-3 py-2 transition-colors hover:border-lilac-200/70 hover:bg-white/80"
              >
                Konto
              </Link>
              <Link
                to="/impressum"
                className="rounded-full border border-transparent px-3 py-2 transition-colors hover:border-lilac-200/70 hover:bg-white/80"
              >
                Impressum
              </Link>
              <Link
                to="/agbs"
                className="rounded-full border border-transparent px-3 py-2 transition-colors hover:border-lilac-200/70 hover:bg-white/80"
              >
                AGB
              </Link>
              <Link
                to="/datenschutz"
                className="rounded-full border border-transparent px-3 py-2 transition-colors hover:border-lilac-200/70 hover:bg-white/80"
              >
                Datenschutz
              </Link>
            </nav>

            <div className="w-full border-t border-[var(--color-soil-900)]/8 pt-4 text-xs text-[var(--color-soil-500)]">
              &copy; {new Date().getFullYear()} Agroforst Frank Fege
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
