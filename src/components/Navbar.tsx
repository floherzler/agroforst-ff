"use client";

import { Link, useLocation } from "@tanstack/react-router";
import { ArrowRight, Clock3, ShieldCheck, Sprout, UserRound } from "lucide-react";

import { CTAButton } from "@/components/brand/cta-button";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/auth-store";

export default function Navbar() {
  const { user } = useAuthStore();
  const pathname = useLocation({ select: (state) => state.pathname });
  const isProductsPage = pathname.startsWith("/produkte");
  const isAdmin = user?.labels?.includes("admin");

  return (
    <header className="sticky top-0 z-50 bg-background">
      <div className="mx-auto w-full max-w-6xl bg-background px-4 py-3 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-border/70 px-4 py-3 shadow-[0_18px_40px_-28px_rgba(40,32,24,0.24),0_0_0_1px_rgba(134,124,110,0.06)] backdrop-blur-md [background:linear-gradient(180deg,color-mix(in_srgb,var(--color-background)_96%,white_4%),color-mix(in_srgb,var(--color-background)_88%,var(--color-lilac-50)_12%))] sm:px-5 lg:px-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lilac-300/80 to-transparent" />
          <div className="pointer-events-none absolute -right-12 top-1/2 size-36 -translate-y-1/2 rounded-full bg-lilac-200/40 blur-3xl" />
          <div className="pointer-events-none absolute left-10 top-0 h-20 w-28 rounded-full bg-permdal-100/30 blur-3xl" />

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Link
              to="/"
              className="group inline-flex min-w-0 items-center gap-3 text-foreground no-underline sm:gap-4"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-[1.15rem] border border-lilac-200/70 bg-white/90 shadow-brand-soft transition-transform duration-[var(--duration-base)] group-hover:scale-[1.02]">
                <img
                  src="/img/agroforst_ff_icon_bg.png"
                  alt="Agroforst Frank Fege Logo"
                  className="size-8 object-contain"
                />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-lg font-semibold tracking-[-0.03em] text-foreground sm:text-xl">
                  Agroforst Frank Fege
                </span>
              </span>
            </Link>

            <div className="flex flex-1 flex-col gap-3 lg:max-w-4xl lg:flex-row lg:items-center lg:justify-end">
              <div className="flex flex-col gap-3 lg:w-full lg:max-w-[44rem] lg:flex-row lg:items-center lg:justify-end">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
                  <Link
                    to="/produkte"
                    className={`inline-flex min-h-10 items-center justify-center rounded-full border px-4 py-2 text-sm font-medium no-underline transition-colors lg:self-auto ${
                      isProductsPage
                        ? "border-lilac-300 bg-[color:var(--color-accent)] text-lilac-900 shadow-accent-lilac"
                        : "border-lilac-200/60 bg-background/80 text-foreground hover:bg-[color:var(--color-accent)]/80"
                    }`}
                  >
                    Produkte
                  </Link>

                  <div className="group/soon relative">
                    <span
                      aria-disabled="true"
                      className="inline-flex min-h-10 cursor-help flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-border/75 bg-muted/80 px-3 py-2 text-[0.77rem] font-medium text-muted-foreground transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-base)] ease-[var(--ease-emphasized)] group-hover/soon:border-lilac-300/80 group-hover/soon:bg-[color:var(--color-accent)] group-hover/soon:text-lilac-900 group-hover/soon:shadow-accent-lilac"
                    >
                      <Clock3 className="size-3.5 shrink-0" />
                      <span>Marktplatz</span>
                      <span className="text-border/90 group-hover/soon:text-lilac-400/90">•</span>
                      <span>Schwarzes Brett</span>
                      <span className="text-border/90 group-hover/soon:text-lilac-400/90">•</span>
                      <span>Blog</span>
                    </span>
                    <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 rounded-full border border-lilac-200/80 bg-background/96 px-3 py-1 text-[0.68rem] font-medium tracking-[0.08em] text-lilac-800 opacity-0 shadow-brand-soft backdrop-blur transition-all duration-200 group-hover/soon:translate-y-0 group-hover/soon:opacity-100 group-focus-within/soon:translate-y-0 group-focus-within/soon:opacity-100 translate-y-1 whitespace-nowrap">
                      Bald verfuegbar
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                  {isAdmin ? (
                    <Link
                      to="/zentrale"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-lilac-300/80 bg-[color:var(--color-accent)] px-3 py-2 text-[0.78rem] font-medium tracking-[0.14em] text-lilac-900 no-underline shadow-accent-lilac transition-colors hover:bg-lilac-200"
                    >
                      <ShieldCheck className="size-3.5" />
                      Adminbereich
                      <ArrowRight className="size-3.5" />
                    </Link>
                  ) : null}

                  <div className="flex items-center justify-end gap-2">
                    <Button asChild variant="ghost" size="sm" className="rounded-full px-3">
                      <Link to={user ? "/konto" : "/login"}>
                        <UserRound className="size-3.5" />
                        {user ? "Konto" : "Anmelden"}
                      </Link>
                    </Button>

                    {!user ? (
                      <CTAButton
                        asChild
                        size="sm"
                        className="rounded-full border border-lilac-200/70 bg-lilac-200 px-4 text-lilac-900 shadow-accent-lilac hover:bg-lilac-100"
                      >
                        <Link to="/signup" search={{ redirect: "/" }}>
                          <Sprout className="size-3.5" />
                          Erntepost
                        </Link>
                      </CTAButton>
                    ) : null}
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
