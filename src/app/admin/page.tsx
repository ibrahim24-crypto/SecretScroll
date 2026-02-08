import { Header } from "@/components/layout/Header";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export default function AdminPage() {
  return (
    <>
      <Header />
      <main className="container py-8">
        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight font-headline">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Moderate pending secrets and manage user reports.
          </p>
        </div>
        <AdminDashboard />
      </main>
    </>
  );
}
