"use client";

import { Link } from "@tanstack/react-router";
import { Sprout } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/Auth";

export default function Navbar() {
  const { user } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-3 text-foreground no-underline"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
            <Sprout className="size-5" />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold">Agroforst Frank Fege</span>
            <span className="text-xs text-muted-foreground">
              Direktvermarktung aus Brandenburg
            </span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/marktplatz">Marktplatz</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/produkte">Produkte</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/blog">Blog</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to={user ? "/konto" : "/login"}>
              {user ? "Mein Konto" : "Anmelden"}
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
