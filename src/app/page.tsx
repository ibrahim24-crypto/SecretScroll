'use client';

import { Header } from '@/components/layout/Header';
import { Feed } from '@/components/feed/Feed';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

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
      <button
        onClick={() => router.push('/add-person')}
        className="fixed bottom-6 right-6 z-50 rounded-full h-16 w-16 p-0 
                   flex items-center justify-center
                   bg-primary text-primary-foreground
                   shadow-lg
                   block md:hidden transition-transform hover:scale-110 active:scale-100
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-background"
      >
        <Plus className="h-8 w-8" />
        <span className="sr-only">Create Post</span>
      </button>
    </>
  );
}
