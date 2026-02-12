'use client';

import { Header } from '@/components/layout/Header';
import { Feed } from '@/components/feed/Feed';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      {/* Header is visible only on medium screens and up */}
      <div className="hidden md:block">
        <Header />
      </div>
      
      {/* The main content area */}
      <main className="md:container md:py-8 h-dvh md:h-auto bg-black md:bg-transparent">
        <Feed />
      </main>

      {/* Floating Action Button for mobile */}
      <Button asChild size="icon" className="fixed bottom-6 right-6 z-50 rounded-full h-16 w-16 shadow-lg block md:hidden transition-transform hover:scale-110 active:scale-100 [&_svg]:size-8">
        <Link href="/add-person">
          <Plus />
          <span className="sr-only">Create Post</span>
        </Link>
      </Button>
    </>
  );
}
