"use client";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Link } from "@tanstack/react-router";

import { useAuthStore } from "@/store/Auth";

export default function Navbar() {
  const { user } = useAuthStore();
  return (
    <header className="sticky top-0 z-50 border-b border-permdal-200/60 bg-[#f9f5ee]/90 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4">
        <NavigationMenu className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center py-3">
          <NavigationMenuList className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4">
            <NavigationMenuItem>
              <Link to="/" className="flex items-center gap-2 rounded-full border border-permdal-200/70 bg-white/90 px-3 py-1 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:px-4 sm:py-1.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-permdal-100/80">
                  <img src="/img/agroforst_ff_blume.png" className="h-7 w-7 object-contain" alt="Agroforst Logo" />
                </span>
                <span className="text-sm font-semibold text-earth-500 sm:text-base">Agroforst</span>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link to="/marktplatz" className="rounded-full border border-permdal-200 bg-white/90 px-3 py-1 text-xs font-medium text-earth-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-permdal-50/80 hover:shadow-md sm:px-4 sm:py-1.5 sm:text-sm">Marktplatz</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link to="/blog" className="rounded-full border border-permdal-200 bg-white/90 px-3 py-1 text-xs font-medium text-earth-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-permdal-50/80 hover:shadow-md sm:px-4 sm:py-1.5 sm:text-sm">Blog</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link to={user ? "/konto" : "/login"} className="max-w-[160px] truncate rounded-full border border-permdal-300 bg-permdal-600/10 px-3 py-1 text-xs font-semibold text-earth-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-permdal-600/15 hover:shadow-md sm:px-4 sm:py-1.5 sm:text-sm">{user ? "Mein Konto" : "Anmelden"}</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  );
}
