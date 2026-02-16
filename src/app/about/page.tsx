'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="container py-8 max-w-4xl mx-auto px-4">
      <header className="flex items-center justify-between mb-8">
        <Button asChild variant="ghost">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </header>

      <div className="space-y-6">
        <h1 className="text-4xl font-bold font-headline">About SecretReels</h1>
        <p className="text-lg text-muted-foreground">
          Uncover secrets, share truths.
        </p>
        
        <div className="space-y-4 text-secondary-foreground">
            <p>
            SecretReels is a platform for anonymous expression. We believe in the power of sharing stories, thoughts, and confessions without the fear of judgment. Our community is built on trust, respect, and the shared human experience.
            </p>
            <p>
            Whether you have a funny anecdote, a deep reflection, a random thought, or need some advice, this is your space to share it with the world, protected by anonymity.
            </p>
            <p>
            Our mission is to create a safe and open environment where every voice can be heard.
            </p>
        </div>
      </div>
    </main>
  );
}
