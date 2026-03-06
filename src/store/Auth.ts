import { create } from "zustand"
import { persist } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

import { account } from "@/models/client/config"
import { AppwriteException, ID, Models } from "appwrite"

export interface UserPrefs {
    name: string
    email: string
    theme: string
    labels: string[]
}

interface AuthState {
    session: Models.Session | null;
    jwt: string | null;
    user: Models.User<UserPrefs> | null;
    hydrated: boolean;

    setHydrated(): void;
    setSession(session: Models.Session | null, user: Models.User<UserPrefs> | null): void;
    updateUser(user: Models.User<Models.Preferences>): void;
    verifySession(): Promise<void>;
    login(
        email: string,
        password: string
    ): Promise<{
        success: boolean;
        error?: AppwriteException | null;
    }>;
    createAccount(
        name: string,
        email: string,
        password: string
    ): Promise<{
        success: boolean;
        error?: AppwriteException | null;
    }>;
    logout(): Promise<void>;
}


export const useAuthStore = create<AuthState>()(
    persist(
        immer((set) => ({
            session: null as Models.Session | null,
            jwt: null as string | null,
            user: null as Models.User<UserPrefs> | null,
            hydrated: false,

            setHydrated() {
                set((state) => {
                    state.hydrated = true;
                });
            },

            setSession(session: Models.Session | null, user: Models.User<UserPrefs> | null) {
                set((state) => {
                    state.session = session;
                    state.user = user;
                });
            },

            async updateUser() {
                try {
                    const updatedUser = await account.get<UserPrefs>();
                    set((state) => {
                        state.user = updatedUser;
                    });
                } catch (error) {
                    console.log(error);
                };
            },

            async verifySession() {
                try {
                    const session = await account.getSession("current");
                    set((state) => {
                        state.session = session;
                    });
                    const [user, { jwt }] = await Promise.all([
                        account.get<UserPrefs>(),
                        account.createJWT(),
                    ]);
                    set((state) => {
                        state.user = user;
                        state.jwt = jwt;
                    });
                } catch (error) {
                    console.log(error);
                }
            },

            async login(email: string, password: string) {
                try {
                    const session = await account.createEmailPasswordSession(
                        email,
                        password
                    );
                    const [user, { jwt }] = await Promise.all([
                        account.get<UserPrefs>(),
                        account.createJWT(),
                    ]);
                    if (!user.prefs) await account.updatePrefs<UserPrefs>({ theme: "light" });
                    set((state) => {
                        state.session = session;
                        state.user = user;
                        state.jwt = jwt;
                    });
                    return { success: true };
                } catch (error) {
                    console.log(error);
                    return {
                        success: false,
                        error: error instanceof AppwriteException ? error : null,
                    };
                }
            },

            async createAccount(name: string, email: string, password: string) {
                try {
                    await account.create(ID.unique(), email, password, name);
                    return { success: true };
                } catch (error) {
                    console.log(error);
                    return {
                        success: false,
                        error: error instanceof AppwriteException ? error : null,
                    };
                }
            },

            async logout() {
                try {
                    await account.deleteSession('current');
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
