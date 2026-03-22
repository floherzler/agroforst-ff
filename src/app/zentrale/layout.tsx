"use client";

import ProtectedRoute from "@/components/ProtectedRoute";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <ProtectedRoute requireAuth requireAdmin>
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(106,168,114,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(39,38,21,0.14),transparent_26%)]" />
        <div className="pointer-events-none absolute left-[8%] top-24 size-72 rounded-full bg-permdal-200/60 blur-3xl" />
        <div className="pointer-events-none absolute bottom-12 right-[10%] size-96 rounded-full bg-earth-100/70 blur-3xl" />
        <div className="relative">{children}</div>
      </div>
    </ProtectedRoute>
  );
};

export default AdminLayout;
