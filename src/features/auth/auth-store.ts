"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist } from "zustand/middleware";

import {
  createEmailPasswordAccount,
  deleteCurrentSession,
  getCurrentAuthSnapshot,
  getCurrentUser,
  signInWithEmailPassword,
  type AuthSession,
  type AuthSnapshot,
  type AuthUser,
} from "@/lib/appwrite/appwriteAuth";

type AuthActionResult = {
  success: boolean;
  error?: Error | null;
};

type AuthState = {
  session: AuthSession | null;
  jwt: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setHydrated(): void;
  setSnapshot(snapshot: AuthSnapshot | null): void;
  updateUser(): Promise<void>;
  verifySession(): Promise<void>;
  login(email: string, password: string): Promise<AuthActionResult>;
  createAccount(
    name: string,
    email: string,
    password: string,
  ): Promise<AuthActionResult>;
  logout(): Promise<void>;
};

function applySnapshot(state: AuthState, snapshot: AuthSnapshot | null) {
  state.session = snapshot?.session ?? null;
  state.jwt = snapshot?.jwt ?? null;
  state.user = snapshot?.user ?? null;
}

function redirectToHome() {
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set) => ({
      session: null,
      jwt: null,
      user: null,
      hydrated: false,

      setHydrated() {
        set((state) => {
          state.hydrated = true;
        });
      },

      setSnapshot(snapshot) {
        set((state) => {
          applySnapshot(state, snapshot);
        });
      },

      async updateUser() {
        try {
          const user = await getCurrentUser();
          set((state) => {
            state.user = user;
          });
        } catch (error) {
          console.error("Failed to update auth user", error);
        }
      },

      async verifySession() {
        try {
          const snapshot = await getCurrentAuthSnapshot();
          set((state) => {
            applySnapshot(state, snapshot);
          });
        } catch (error) {
          console.error("Failed to verify auth session", error);
          set((state) => {
            applySnapshot(state, null);
          });
        }
      },

      async login(email, password) {
        try {
          const snapshot = await signInWithEmailPassword({ email, password });
          set((state) => {
            applySnapshot(state, snapshot);
          });
          return { success: true };
        } catch (error) {
          console.error("Failed to log in", error);
          return {
            success: false,
            error: error instanceof Error ? error : null,
          };
        }
      },

      async createAccount(name, email, password) {
        try {
          await createEmailPasswordAccount({ name, email, password });
          return { success: true };
        } catch (error) {
          console.error("Failed to create account", error);
          return {
            success: false,
            error: error instanceof Error ? error : null,
          };
        }
      },

      async logout() {
        try {
          await deleteCurrentSession();
        } catch (error) {
          console.error("Failed to delete auth session", error);
        } finally {
          set((state) => {
            applySnapshot(state, null);
          });
          redirectToHome();
        }
      },
    })),
    {
      name: "auth",
      onRehydrateStorage() {
        return (state, error) => {
          if (!error) {
            state?.setHydrated();
          }
        };
      },
    },
  ),
);
