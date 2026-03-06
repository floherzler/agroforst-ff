"use client";

import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/store/Auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireEmailVerification?: boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  requireAdmin = false,
  requireEmailVerification = false,
  redirectTo = "/",
}: ProtectedRouteProps) {
  const { session, user, hydrated } = useAuthStore();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!hydrated) return;

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
  }, [session, user, hydrated, requireAuth, requireAdmin, requireEmailVerification, redirectTo, navigate]);

  if (!hydrated || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-permdal-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {!hydrated ? "Laden..." : "Überprüfe Berechtigung..."}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
