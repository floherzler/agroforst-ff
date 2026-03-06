import { create } from "zustand"
import { persist } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

import {
    createEmailPasswordAccount,
    deleteCurrentSession,
    getCurrentAuthSnapshot,
    getCurrentUser,
    signInWithEmailPassword,
    type AuthSession,
    type AuthUser,
} from "@/lib/appwrite/appwriteAuth"

export interface UserPrefs {
    name: string
    email: string
    theme: string
    labels: string[]
}

interface AuthState {
    session: AuthSession | null;
    jwt: string | null;
    user: AuthUser | null;
    hydrated: boolean;

    setHydrated(): void;
    setSession(session: AuthSession | null, user: AuthUser | null): void;
    updateUser(): Promise<void>;
    verifySession(): Promise<void>;
    login(
        email: string,
        password: string
    ): Promise<{
        success: boolean;
        error?: Error | null;
    }>;
    createAccount(
        name: string,
        email: string,
        password: string
    ): Promise<{
        success: boolean;
        error?: Error | null;
    }>;
    logout(): Promise<void>;
}


export const useAuthStore = create<AuthState>()(
    persist(
        immer((set) => ({
            session: null as AuthSession | null,
            jwt: null as string | null,
            user: null as AuthUser | null,
            hydrated: false,

            setHydrated() {
                set((state) => {
                    state.hydrated = true;
                });
            },

            setSession(session: AuthSession | null, user: AuthUser | null) {
                set((state) => {
                    state.session = session;
                    state.user = user;
                });
            },

            async updateUser() {
                try {
                    const updatedUser = await getCurrentUser();
                    set((state) => {
                        state.user = updatedUser;
                    });
                } catch (error) {
                    console.log(error);
                };
            },

            async verifySession() {
                try {
                    const snapshot = await getCurrentAuthSnapshot();
                    set((state) => {
                        state.session = snapshot.session;
                        state.user = snapshot.user;
                        state.jwt = snapshot.jwt;
                    });
                } catch (error) {
                    console.log(error);
                }
            },

            async login(email: string, password: string) {
                try {
                    const snapshot = await signInWithEmailPassword({
                        email,
                        password,
                    });
                    set((state) => {
                        state.session = snapshot.session;
                        state.user = snapshot.user;
                        state.jwt = snapshot.jwt;
                    });
                    return { success: true };
                } catch (error) {
                    console.log(error);
                    return {
                        success: false,
                        error: error instanceof Error ? error : null,
                    };
                }
            },

            async createAccount(name: string, email: string, password: string) {
                try {
                    await createEmailPasswordAccount({ name, email, password });
                    return { success: true };
                } catch (error) {
                    console.log(error);
                    return {
                        success: false,
                        error: error instanceof Error ? error : null,
                    };
                }
            },

            async logout() {
                try {
                    await deleteCurrentSession();
                    set((state) => {
                        state.session = null;
                        state.jwt = null;
                        state.user = null;
                    });
                    // Redirect to home after logout
                    if (typeof window !== 'undefined') {
                        window.location.href = '/';
                    }
                } catch (error) {
                    console.log(error);
                    set((state) => {
                        state.session = null;
                        state.jwt = null;
                        state.user = null;
                    });
                    // Redirect even on error
                    if (typeof window !== 'undefined') {
                        window.location.href = '/';
                    }
                }
            },

            // async setUser(session: Models.Session | null, user: Models.User<UserPrefs> | null) {
            //     if (user) {
            //         await account.updatePrefs<UserPrefs>(user.prefs);
            //     }
            //     set((state) => {
            //         state.user = user;
            //         state.session = session;
            //     });
            // },
        })),
        {
            name: "auth",
            onRehydrateStorage() {
                return (state, error) => {
                    if (!error) state?.setHydrated();
                };
            },
        }
    )
);
