"use client";
import AuthGuard from "@/components/auth-guard";
import Sidebar from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col md:flex-row bg-zinc-50">
        <Sidebar />
        <main className="flex-1 p-4 pt-16 md:p-6 md:pt-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
