"use client";

import { useAuthStore } from "@/store/Auth";

export default function UserProfile() {
  const { user, session } = useAuthStore();

  if (!user || !session) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Benutzerprofil</h2>
        <p className="text-muted-foreground">Nicht angemeldet</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Benutzerprofil</h2>
      <div className="space-y-2">
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Labels:</strong> {user.labels?.join(", ") || "Keine"}</p>
        <p><strong>Email verifiziert:</strong> {user.emailVerification ? "Ja" : "Nein"}</p>
        <p><strong>Session ID:</strong> {session.$id}</p>
      </div>
    </div>
  );
}
