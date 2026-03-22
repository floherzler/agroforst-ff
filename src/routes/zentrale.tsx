import { Outlet, createFileRoute } from "@tanstack/react-router";

import ProtectedRoute from "@/components/ProtectedRoute";

export const Route = createFileRoute("/zentrale")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ProtectedRoute requireAuth requireAdmin>
      <Outlet />
    </ProtectedRoute>
  );
}
