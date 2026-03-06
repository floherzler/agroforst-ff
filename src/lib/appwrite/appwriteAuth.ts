import { Account, Client, ID } from "appwrite";
import { z } from "zod";

import {
  appwriteConfig,
  ensureConfigured,
  parseOptionalString,
  parseStringArray,
} from "@/lib/appwrite/shared";

const client = new Client()
  .setEndpoint(ensureConfigured(appwriteConfig.endpoint, "Appwrite Endpoint"))
  .setProject(ensureConfigured(appwriteConfig.projectId, "Appwrite Projekt-ID"));

const account = new Account(client);

const authUserPrefsSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  theme: z.string().optional(),
  labels: z.array(z.string()).optional(),
});

const authUserSchema = z.object({
  $id: z.string().min(1),
  name: z.string().optional().default(""),
  email: z.string().optional().default(""),
  emailVerification: z.boolean().optional().default(false),
  labels: z.array(z.string()).optional().default([]),
  prefs: z.unknown().optional(),
});

const authSessionSchema = z.object({
  $id: z.string().min(1),
  userId: z.string().min(1),
  expire: z.string().min(1),
  provider: z.string().optional().default(""),
});

const signInInputSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const signUpInputSchema = z.object({
  name: z.string().trim().min(1),
  email: z.email(),
  password: z.string().min(8),
});

const completeVerificationInputSchema = z.object({
  userId: z.string().trim().min(1),
  secret: z.string().trim().min(1),
});

const verificationUrlInputSchema = z.object({
  verificationUrl: z.url(),
});

export type AuthUserPrefs = {
  name?: string;
  email?: string;
  theme?: string;
  labels: string[];
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerification: boolean;
  labels: string[];
  prefs: AuthUserPrefs;
};

export type AuthSession = {
  id: string;
  userId: string;
  expire: string;
  provider: string;
};

export type AuthSnapshot = {
  session: AuthSession;
  jwt: string;
  user: AuthUser;
};

function normalizeAuthUser(raw: unknown): AuthUser {
  const parsed = authUserSchema.parse(raw);
  const prefs = authUserPrefsSchema.safeParse(parsed.prefs);
  const normalizedPrefs = prefs.success ? prefs.data : {};

  return {
    id: parsed.$id,
    name: parsed.name ?? "",
    email: parsed.email ?? "",
    emailVerification: parsed.emailVerification,
    labels: parseStringArray(parsed.labels),
    prefs: {
      name: parseOptionalString(normalizedPrefs.name),
      email: parseOptionalString(normalizedPrefs.email),
      theme: parseOptionalString(normalizedPrefs.theme),
      labels: parseStringArray(normalizedPrefs.labels),
    },
  };
}

function normalizeAuthSession(raw: unknown): AuthSession {
  const parsed = authSessionSchema.parse(raw);
  return {
    id: parsed.$id,
    userId: parsed.userId,
    expire: parsed.expire,
    provider: parsed.provider,
  };
}

export async function getCurrentUser(): Promise<AuthUser> {
  return normalizeAuthUser(await account.get());
}

export async function getCurrentSession(): Promise<AuthSession> {
  return normalizeAuthSession(await account.getSession("current"));
}

export async function getCurrentAuthSnapshot(): Promise<AuthSnapshot> {
  const [session, user, jwtResponse] = await Promise.all([
    account.getSession("current"),
    account.get(),
    account.createJWT(),
  ]);

  return {
    session: normalizeAuthSession(session),
    user: normalizeAuthUser(user),
    jwt: z.object({ jwt: z.string().min(1) }).parse(jwtResponse).jwt,
  };
}

export async function signInWithEmailPassword(input: {
  email: string;
  password: string;
}): Promise<AuthSnapshot> {
  const parsedInput = signInInputSchema.parse(input);

  await account.createEmailPasswordSession(parsedInput.email, parsedInput.password);

  const snapshot = await getCurrentAuthSnapshot();
  if (!snapshot.user.prefs.theme) {
    await account.updatePrefs({
      theme: "light",
      labels: snapshot.user.prefs.labels,
      name: snapshot.user.prefs.name,
      email: snapshot.user.prefs.email,
    });
    return getCurrentAuthSnapshot();
  }

  return snapshot;
}

export async function createEmailPasswordAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<void> {
  const parsedInput = signUpInputSchema.parse(input);

  await account.create(ID.unique(), parsedInput.email, parsedInput.password, parsedInput.name);
}

export async function deleteCurrentSession(): Promise<void> {
  await account.deleteSession("current");
}

export async function sendVerificationEmail(input: {
  verificationUrl: string;
}): Promise<void> {
  const parsedInput = verificationUrlInputSchema.parse(input);
  await account.createVerification(parsedInput.verificationUrl);
}

export async function completeEmailVerification(input: {
  userId: string;
  secret: string;
}): Promise<void> {
  const parsedInput = completeVerificationInputSchema.parse(input);
  await account.updateVerification(parsedInput.userId, parsedInput.secret);
}
