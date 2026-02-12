'use client';

import { Header } from '@/components/layout/Header';
import { Feed } from '@/components/feed/Feed';
import { Button } from '@/components/ui/button';
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
      <Button
        onClick={() => router.push('/add-person')}
        className="fixed bottom-6 right-6 z-50 rounded-full h-16 w-16 p-0 
             bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500
             shadow-lg shadow-purple-500/50
             hover:shadow-xl hover:shadow-purple-600/60
             block md:hidden transition-all duration-300 hover:scale-110 active:scale-100"
      >
        <Plus className="h-8 w-8 text-white transition-transform duration-300 hover:rotate-90" />
        <span className="sr-only">Create Post</span>
      </Button>
    </>
  );
}
