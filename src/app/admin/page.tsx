'use client';

import { Header } from "@/components/layout/Header";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="flex flex-col h-dvh bg-background md:h-auto md:bg-transparent">
        {/* Header for mobile */}
        <header className="sticky top-0 z-10 flex items-center justify-between p-2 border-b bg-background md:hidden">
            <Button variant="ghost" size="icon" asChild>
                <Link href="/">
                    <ArrowLeft />
                    <span className="sr-only">Back</span>
                </Link>
            </Button>
            <h1 className="text-lg font-semibold">Admin Dashboard</h1>
            <div className="w-10" /> {/* Spacer */}
        </header>
        
      {/* Desktop Header */}
      <div className="hidden md:block">
        <Header />
      </div>

      <main className="flex-1 overflow-y-auto md:container md:py-8">
        <div className="hidden md:block space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight font-headline">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and delete posts from the application.
          </p>
        </div>
        <div className="p-4 md:p-0">
            <AdminDashboard />
        </div>
      </main>
    </div>
  );
}
