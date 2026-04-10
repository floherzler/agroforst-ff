"use client";

import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Clock3, Menu, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/auth-store";

export default function Navbar() {
  const { user } = useAuthStore();
  const pathname = useLocation({ select: (state) => state.pathname });
  const isProductsPage = pathname.startsWith("/produkte");
  const isBieteSuchePage = pathname.startsWith("/biete-suche");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 bg-background">
      <div className="mx-auto w-full max-w-6xl bg-background px-4 py-3 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2.75rem] border border-border/70 px-1 py-0 shadow-[0_18px_40px_-28px_rgba(40,32,24,0.24),0_0_0_1px_rgba(134,124,110,0.06)] backdrop-blur-md [background:linear-gradient(180deg,color-mix(in_srgb,var(--color-background)_96%,white_4%),color-mix(in_srgb,var(--color-background)_88%,var(--color-lilac-50)_12%))] sm:rounded-[3.25rem] sm:px-1 sm:py-0 lg:px-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lilac-300/80 to-transparent" />
          <div className="pointer-events-none absolute -right-12 top-1/2 size-36 -translate-y-1/2 rounded-full bg-lilac-200/40 blur-3xl" />
          <div className="pointer-events-none absolute left-10 top-0 h-20 w-28 rounded-full bg-permdal-100/30 blur-3xl" />

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex min-h-[4.35rem] items-center justify-between gap-2 lg:contents">
              <Link
                to="/"
                className="group relative z-10 inline-flex shrink-0 items-center text-foreground no-underline lg:flex-none"
                aria-label="Agroforstbetrieb Frank Fege"
              >
                <span className="relative -ml-0.5 flex size-[3.9rem] shrink-0 items-center justify-center rounded-full sm:size-[4.35rem]">
                  <img
                    src="/img/agroforst_ff_icon_bg.png"
                    alt="Agroforstbetrieb Frank Fege Logo"
                    className="size-full rounded-full object-cover"
                  />
                </span>
              </Link>

              <Link
                to="/"
                className="pointer-events-auto absolute left-1/2 inline-flex min-w-0 max-w-[calc(100%-7.5rem)] -translate-x-1/2 flex-col text-center text-foreground no-underline sm:max-w-[calc(100%-8.5rem)] lg:static lg:max-w-none lg:translate-x-0 lg:flex-none lg:items-start lg:text-left"
              >
                <span className="text-[0.93rem] leading-[0.95] font-semibold tracking-[-0.05em] text-foreground sm:hidden">
                  <span className="block truncate">Agroforstbetrieb</span>
                  <span className="block truncate">Frank Fege</span>
                </span>
                <span className="hidden truncate text-[1.15rem] font-semibold tracking-[-0.04em] text-foreground sm:block">
                  Agroforstbetrieb Frank Fege
                </span>
              </Link>

              <button
                type="button"
                aria-expanded={isMobileMenuOpen}
                aria-controls="site-mobile-nav"
                aria-label={isMobileMenuOpen ? "Navigation schliessen" : "Navigation oeffnen"}
                onClick={() => setIsMobileMenuOpen((value) => !value)}
                className="relative z-10 inline-flex shrink-0 items-center justify-center rounded-full border border-lilac-200/70 bg-white/90 p-2.5 text-foreground shadow-brand-soft transition-colors hover:bg-white lg:hidden"
              >
                {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>

            <div
              id="site-mobile-nav"
              className={`flex flex-1 flex-col gap-3 lg:max-w-4xl lg:flex-row lg:items-center lg:justify-end ${isMobileMenuOpen ? "flex" : "hidden"
                } lg:flex`}
            >
              <div className="flex flex-col gap-3 lg:w-full lg:max-w-[44rem] lg:flex-row lg:items-center lg:justify-end">
                <div className="flex flex-col gap-2 rounded-[1.4rem] border border-border/60 bg-white/55 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:flex-row lg:items-center lg:justify-end">
                  <Link
                    to="/produkte"
                    className={`inline-flex min-h-12 w-full items-center justify-center rounded-full border px-4 py-3 text-base font-medium no-underline transition-colors lg:min-h-10 lg:w-auto lg:px-4 lg:py-2 lg:text-sm lg:self-auto ${isProductsPage
                      ? "border-lilac-300 bg-[color:var(--color-accent)] text-lilac-900 shadow-accent-lilac"
                      : "border-lilac-200/60 bg-background/80 text-foreground hover:bg-[color:var(--color-accent)]/80"
                      }`}
                  >
                    Produkte
                  </Link>

                  <Link
                    to="/biete-suche"
                    className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border px-4 py-3 text-base font-medium no-underline transition-colors lg:min-h-10 lg:w-auto lg:px-4 lg:py-2 lg:text-sm ${isBieteSuchePage
                      ? "border-lilac-300 bg-[color:var(--color-accent)] text-lilac-900 shadow-accent-lilac"
                      : "border-lilac-200/60 bg-background/80 text-foreground hover:bg-[color:var(--color-accent)]/80"
                      }`}
                  >
                    Biete/Suche
                  </Link>

                  <div className="group/soon relative w-full lg:w-auto">
                    <span
                      aria-disabled="true"
                      className="inline-flex min-h-12 w-full cursor-help items-center justify-center gap-x-2 gap-y-1 rounded-full border border-border/75 bg-muted/80 px-4 py-3 text-sm font-medium text-muted-foreground transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-base)] ease-[var(--ease-emphasized)] group-hover/soon:border-lilac-300/80 group-hover/soon:bg-[color:var(--color-accent)] group-hover/soon:text-lilac-900 group-hover/soon:shadow-accent-lilac lg:min-h-10 lg:w-auto lg:flex-wrap lg:justify-start lg:px-3 lg:py-2 lg:text-[0.77rem]"
                    >
                      <Clock3 className="size-3.5 shrink-0" />
                      <span>Blog</span>
                    </span>
                    <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 rounded-full border border-lilac-200/80 bg-background/96 px-3 py-1 text-[0.68rem] font-medium tracking-[0.08em] text-lilac-800 opacity-0 shadow-brand-soft backdrop-blur transition-all duration-200 group-hover/soon:translate-y-0 group-hover/soon:opacity-100 group-focus-within/soon:translate-y-0 group-focus-within/soon:opacity-100 translate-y-1 whitespace-nowrap">
                      Bald verfuegbar
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 rounded-[1.4rem] border border-border/60 bg-white/55 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
                  <div className="flex items-center justify-end gap-2">
                    <Button asChild variant="ghost" size="sm" className="min-h-12 w-full rounded-full px-4 text-base lg:min-h-10 lg:w-auto lg:px-3 lg:text-sm">
                      <Link to={user ? "/konto" : "/login"}>
                        <UserRound className="size-3.5" />
                        {user ? "Mein Konto" : "Anmelden"}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
