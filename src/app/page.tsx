'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Feed } from '@/components/feed/Feed';
import { Plus, AlertTriangle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function Disclaimer({ onAgree }: { onAgree: () => void }) {
  const handleExit = () => {
    // Note: window.close() may not work in all browsers for security reasons.
    // It can typically only close windows that were opened by a script.
    window.close();
  };

  return (
    <div className="flex items-center justify-center min-h-dvh bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 rounded-full border-4 border-destructive/20 bg-destructive/10 p-2 text-destructive">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Disclaimer</CardTitle>
          <CardDescription>Please read carefully before proceeding.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            I am not responsible for any content, including pictures or personal details, that you may find on this platform. The content shared here is not published by me, and I do not endorse it. By entering, you acknowledge and agree to these terms.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" className="w-full" onClick={handleExit}>
            <LogOut className="mr-2" /> Exit
          </Button>
          <Button className="w-full" onClick={onAgree}>
            Agree & Enter
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}


export default function HomePage() {
  const router = useRouter();
  const [showDisclaimer, setShowDisclaimer] = useState<boolean | null>(null);

  useEffect(() => {
    const hasAgreed = localStorage.getItem('hasAgreedToDisclaimer');
    if (hasAgreed === 'true') {
      setShowDisclaimer(false);
    } else {
      setShowDisclaimer(true);
    }
  }, []);

  const handleAgree = () => {
    localStorage.setItem('hasAgreedToDisclaimer', 'true');
    setShowDisclaimer(false);
  };

  if (showDisclaimer === null) {
    // Loading state to prevent flash of content before localStorage is checked
    return (
        <div className="flex items-center justify-center h-dvh w-full">
            <Skeleton className="h-96 w-full max-w-md" />
        </div>
    );
  }

  if (showDisclaimer) {
    return <Disclaimer onAgree={handleAgree} />;
  }

  // Original HomePage content
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
                   block md:hidden transition-transform hover:scale-110 active:scale-100"
      >
        <Plus className="h-8 w-8" />
        <span className="sr-only">Create Post</span>
      </button>
    </>
  );
}
