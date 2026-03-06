"use client";

import ProtectedRoute from "@/components/ProtectedRoute";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <ProtectedRoute requireAuth requireAdmin>
      <div className="relative flex min-h-screen flex-col items-center justify-center py-12">
        <div className="relative">{children}</div>
      </div>
    </ProtectedRoute>
  );
};

export default AdminLayout;
