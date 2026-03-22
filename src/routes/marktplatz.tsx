import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import Page from "@/app/marktplatz/page";

export const Route = createFileRoute("/marktplatz")({ component: RouteComponent });

function RouteComponent() {
  return (
    <ProtectedRoute requireAuth redirectTo="/login?redirect=%2Fmarktplatz">
      <Page />
    </ProtectedRoute>
  );
}
