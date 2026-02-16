'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Feed } from '@/components/feed/Feed';
import { Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { signInWithPopup, signInAnonymously, updateProfile } from 'firebase/auth';
import { auth, googleAuthProvider } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<'google' | 'anonymous' | null>(null);
  const [name, setName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, []);

  const canProceed = isReady && confirmationText.toLowerCase() === 'i agree';

  const handleGoogleLogin = async () => {
    setLoading('google');
    try {
      await signInWithPopup(auth, googleAuthProvider);
      toast({ title: 'Successfully signed in!' });
      onComplete();
    } catch (error) {
      console.error('Error signing in with Google: ', error);
      toast({
        title: 'Authentication failed',
        description: 'Could not sign you in with Google. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleAnonymousLogin = async () => {
    if (!name.trim()) {
      toast({ title: 'Please enter a name.', variant: 'destructive' });
      return;
    }
    setLoading('anonymous');
    try {
      const userCredential = await signInAnonymously(auth);
      await updateProfile(userCredential.user, { displayName: name.trim() });
      toast({ title: `Welcome, ${name.trim()}!` });
      onComplete();
    } catch (error) {
      console.error('Error signing in anonymously: ', error);
      toast({
        title: 'Authentication failed',
        description: 'Could not sign you in. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
      setDialogOpen(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center min-h-dvh bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <div className="mb-2 rounded-full border-4 border-destructive/20 bg-destructive/10 p-2 text-destructive">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold">Disclaimer</CardTitle>
            <CardDescription>Please read carefully and choose how to proceed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              I am not responsible for any content, including pictures or personal details, that you may find on this platform. The content shared here is not published by me, and I do not endorse it. By entering, you acknowledge and agree to these terms.
            </p>

            <div className="space-y-2 pt-4">
                <Label htmlFor="agreement" className={!canProceed && isReady ? 'text-destructive' : ''}>
                    Type "I agree" to accept the terms
                </Label>
                <Input
                    id="agreement"
                    placeholder="I agree"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                />
                {!isReady && <p className="text-xs text-center text-muted-foreground pt-1 animate-pulse">Please take a moment to read the disclaimer...</p>}
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button className="w-full" onClick={handleGoogleLogin} disabled={!!loading || !canProceed}>
                {loading === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Continue with Google'}
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => setDialogOpen(true)} disabled={!!loading || !canProceed}>
                Continue Anonymously
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Continue Anonymously</DialogTitle>
            <DialogDescription>
              Please enter a display name. This name will only be visible to administrators.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              id="name"
              placeholder="Your display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAnonymousLogin();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAnonymousLogin} disabled={loading === 'anonymous'}>
              {loading === 'anonymous' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [showWelcome, setShowWelcome] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading) {
      setShowWelcome(null); // Show loading state
    } else {
      setShowWelcome(!user); // If user exists (anon or google), hide welcome. Otherwise show it.
    }
  }, [user, authLoading]);
  
  const handleLoginComplete = () => {
    setShowWelcome(false);
  };

  if (showWelcome === null) {
    // Loading state to prevent flash of content before auth is checked
    return (
        <div className="flex items-center justify-center h-dvh w-full bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  if (showWelcome) {
    return <WelcomeScreen onComplete={handleLoginComplete} />;
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
