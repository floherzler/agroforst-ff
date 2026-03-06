import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import Page from "@/app/konto/page";

export const Route = createFileRoute("/konto")({ component: RouteComponent });

function RouteComponent() {
  return (
    <ProtectedRoute requireAuth redirectTo="/login?redirect=%2Fkonto">
      <Page />
    </ProtectedRoute>
  );
}
