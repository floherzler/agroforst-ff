"use client";

import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { CTAButton } from "@/components/brand/cta-button";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/features/auth/auth-store";

const navigationItems = [
  {
    label: "Start",
    to: "/" as const,
    href: "/",
  },
  {
    label: "Produkte",
    to: "/produkte" as const,
    href: "/produkte",
  },
];

export default function Navbar() {
  const { user } = useAuthStore();
  const pathname = useLocation({ select: (state) => state.pathname });
  const navigate = useNavigate();
  const activeTab = pathname.startsWith("/produkte") ? "/produkte" : "/";

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-3 text-foreground no-underline"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-[rgba(255,252,247,0.9)] ring-1 ring-[var(--color-soil-900)]/8">
                <img
                  src="/img/agroforst_ff_icon_bg.png"
                  alt=""
                  aria-hidden="true"
                  className="size-7 object-contain"
                />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">Agroforst Frank Fege</span>
                <span className="text-xs text-muted-foreground">
                  Frisch aus der Prignitz
                </span>
              </span>
            </Link>
          </div>

          <div className="flex flex-1 flex-col gap-3 lg:max-w-4xl lg:flex-row lg:items-center lg:justify-end">
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                void navigate({ to: value as "/" | "/produkte" })
              }
              className="w-full lg:max-w-[16rem]"
            >
              <TabsList variant="pill" className="grid w-full grid-cols-2">
                {navigationItems.map((item) => (
                  <TabsTrigger key={item.href} value={item.href}>
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex items-center justify-end gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="rounded-full">
                  <Link to={user ? "/konto" : "/login"}>
                    {user ? "Konto" : "Anmelden"}
                  </Link>
                </Button>
                {!user ? (
                  <CTAButton
                    asChild
                    size="sm"
                    className="rounded-full px-4 tracking-[0.14em]"
                  >
                    <Link to="/signup" search={{ redirect: "/" }}>
                      Erntepost
                    </Link>
                  </CTAButton>
                ) : null}
                {user?.labels?.includes("admin") ? (
                  <Button asChild variant="secondary" size="sm" className="rounded-full">
                    <Link to="/zentrale">
                      Zentrale
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
