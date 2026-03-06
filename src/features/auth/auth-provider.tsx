"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/features/auth/auth-store";

type AuthProviderProps = {
  children: ReactNode;
};

export default function AuthProvider({ children }: AuthProviderProps) {
  const { verifySession, hydrated } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (!hydrated) {
      const fallbackTimer = setTimeout(() => {
        setIsInitializing(false);
      }, 1000);

      return () => clearTimeout(fallbackTimer);
    }

    void verifySession().finally(() => {
      setIsInitializing(false);
    });
  }, [hydrated, verifySession]);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-permdal-600" />
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
