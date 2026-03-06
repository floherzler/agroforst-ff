"use client";

import { Link, useLocation } from "@tanstack/react-router";
import { Sprout } from "lucide-react";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/Auth";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    label: "Marktplatz",
    to: "/marktplatz" as const,
    href: "/marktplatz",
  },
  {
    label: "Produkte",
    to: "/produkte" as const,
    href: "/produkte",
  },
  {
    label: "Blog",
    to: "/blog" as const,
    href: "/blog",
  },
];

export default function Navbar() {
  const { user } = useAuthStore();
  const pathname = useLocation({ select: (state) => state.pathname });

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-3 text-foreground no-underline"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
                <Sprout className="size-5" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">Agroforst Frank Fege</span>
                <span className="text-xs text-muted-foreground">
                  Direktvermarktung aus Brandenburg
                </span>
              </span>
            </Link>
            <Badge variant="secondary" className="sm:hidden">
              Beta
            </Badge>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <NavigationMenu className="hidden md:flex" align="center">
              <NavigationMenuList className="gap-1">
                {navigationItems.map((item) => (
                  <NavigationMenuItem key={item.href}>
                    <NavigationMenuLink
                      className={cn(
                        pathname === item.href && "bg-muted text-foreground",
                      )}
                    >
                      <Link
                        to={item.to}
                        className={cn(
                          "text-muted-foreground no-underline transition-colors",
                          pathname === item.href && "text-foreground",
                        )}
                      >
                        {item.label}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>

            <nav className="flex flex-wrap items-center gap-2 md:hidden">
              {navigationItems.map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant={pathname === item.href ? "secondary" : "ghost"}
                  size="sm"
                >
                  <Link to={item.to}>{item.label}</Link>
                </Button>
              ))}
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <Badge variant="secondary">Beta</Badge>
              <Separator orientation="vertical" className="h-6" />
            </div>

            <Button asChild variant="secondary" size="sm">
              <Link to={user ? "/konto" : "/login"}>
                {user ? "Mein Konto" : "Anmelden"}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
