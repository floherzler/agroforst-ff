import { createFileRoute } from "@tanstack/react-router";
import ProtectedRoute from "@/components/ProtectedRoute";
import Page from "@/app/zentrale/page";

export const Route = createFileRoute("/zentrale")({ component: RouteComponent });

function RouteComponent() {
  return (
    <ProtectedRoute requireAuth requireAdmin>
      <Page />
    </ProtectedRoute>
  );
}
