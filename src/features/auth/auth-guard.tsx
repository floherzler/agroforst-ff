"use client";

import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/features/auth/auth-store";

type AuthGuardProps = {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireEmailVerification?: boolean;
  redirectTo?: string;
};

export default function AuthGuard({
  children,
  requireAuth = true,
  requireAdmin = false,
  requireEmailVerification = false,
  redirectTo = "/",
}: AuthGuardProps) {
  const { session, user, hydrated } = useAuthStore();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (requireAuth && !session) {
      void navigate({ to: redirectTo, replace: true });
      return;
    }

    if (requireAdmin && !user?.labels?.includes("admin")) {
      void navigate({ to: redirectTo, replace: true });
      return;
    }

    if (requireEmailVerification && !user?.emailVerification) {
      void navigate({ to: redirectTo, replace: true });
      return;
    }

    setIsChecking(false);
  }, [
    hydrated,
    navigate,
    redirectTo,
    requireAdmin,
    requireAuth,
    requireEmailVerification,
    session,
    user,
  ]);

  if (!hydrated || isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-permdal-600" />
          <p className="text-muted-foreground">
            {!hydrated ? "Laden..." : "Überprüfe Berechtigung..."}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
