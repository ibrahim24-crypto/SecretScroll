'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Feed } from '@/components/feed/Feed';
import { Button } from '@/components/ui/button';
import { Plus, BookLock } from 'lucide-react';
import Link from 'next/link';

function WelcomeScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="h-dvh w-screen flex flex-col items-center justify-center text-center bg-background text-foreground p-8">
      <div className="flex items-center space-x-4 mb-8">
        <BookLock className="h-16 w-16 text-primary" />
        <h1 className="text-4xl md:text-6xl font-headline font-bold">SecretReels</h1>
      </div>
      <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-md">Uncover secrets, share truths. Your anonymous stage awaits.</p>
      <Button onClick={onEnter} size="lg">
        Enter the Feed
      </Button>
    </div>
  );
}

export default function HomePage() {
  const [isEntered, setIsEntered] = useState(false);

  if (!isEntered) {
    return <WelcomeScreen onEnter={() => setIsEntered(true)} />;
  }


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
      <Button asChild size="icon" className="fixed bottom-6 right-6 z-50 rounded-full h-16 w-16 shadow-lg block md:hidden">
        <Link href="/add-person">
          <Plus className="h-8 w-8" />
          <span className="sr-only">Create Post</span>
        </Link>
      </Button>
    </>
  );
}
