"use client";

import { useAuthStore } from "@/store/Auth";
import { useEffect, useState } from "react";

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { verifySession, hydrated } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (hydrated) {
      // Verify session on app load
      verifySession().finally(() => {
        setIsInitializing(false);
      });
    } else {
      // If not hydrated yet, wait a bit and try again
      const timer = setTimeout(() => {
        if (!hydrated) {
          setIsInitializing(false); // Fallback if hydration takes too long
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [hydrated, verifySession]);

  // Show loading state while auth is initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-permdal-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Laden...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
