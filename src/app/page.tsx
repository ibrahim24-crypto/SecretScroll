'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Feed } from '@/components/feed/Feed';
import { Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { signInWithPopup, signInAnonymously, updateProfile, signInWithRedirect } from 'firebase/auth';
import { auth, googleAuthProvider, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { AnonymousIcon } from '@/components/icons/AnonymousIcon';
import Link from 'next/link';
import { useLocale } from '@/hooks/useLocale';

function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const { t } = useLocale();
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

  const canProceed = isReady && confirmationText.toLowerCase() === t('welcome.agreePlaceholder').toLowerCase();

  const handleGoogleLogin = async () => {
    setLoading('google');
    try {
      await signInWithPopup(auth, googleAuthProvider);
      toast({ title: t('toasts.signedInSuccess') });
      onComplete();
    } catch (error: any) {
        if (error.code === 'auth/popup-blocked') {
            toast({
                title: t('toasts.popupBlockedTitle'),
                description: t('toasts.popupBlockedDescription'),
                variant: 'destructive',
            });
        } else if (error.code === 'auth/popup-closed-by-user') {
            console.log('Sign-in popup closed by user.');
        } else {
            console.error('Error signing in with Google: ', error);
            toast({
                title: t('toasts.authFailed'),
                description: t('toasts.authFailedDescription'),
                variant: 'destructive',
            });
        }
    } finally {
        setLoading(null);
    }
  };

  const handleAnonymousLogin = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({ title: t('toasts.nameRequired'), variant: 'destructive' });
      return;
    }
    setLoading('anonymous');

    try {
        // Check if display name is already taken by another anonymous user
        const displayNameRef = doc(db, 'userDisplayNames', trimmedName);
        const docSnap = await getDoc(displayNameRef);

        if (docSnap.exists()) {
            toast({
              title: t('toasts.nameTakenTitle'),
              description: t('toasts.nameTakenDescription'),
              variant: 'destructive',
            });
            setLoading(null);
            return;
        }
        
        // If name is not taken, proceed with login
        const userCredential = await signInAnonymously(auth);
        await updateProfile(userCredential.user, { displayName: trimmedName });
        toast({ title: t('toasts.welcomeUser', { name: trimmedName }) });
        onComplete();
        // No need to set dialog or loading state to false as the component unmounts
    } catch (error) {
        console.error('Error signing in anonymously: ', error);
        toast({
            title: t('toasts.authFailed'),
            description: t('toasts.authFailedDescription'),
            variant: 'destructive',
        });
        setLoading(null);
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
            <CardTitle className="text-2xl font-bold">{t('welcome.disclaimerTitle')}</CardTitle>
            <CardDescription>{t('welcome.disclaimerText')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 pt-4">
                <Label htmlFor="agreement" className={!canProceed && isReady ? 'text-destructive' : ''}>
                    {t('welcome.agreePrompt')}
                </Label>
                <Input
                    id="agreement"
                    placeholder={t('welcome.agreePlaceholder')}
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                />
                {!isReady && <p className="text-xs text-center text-muted-foreground pt-1 animate-pulse">{t('welcome.readingDisclaimer')}</p>}
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button className="w-full" onClick={handleGoogleLogin} disabled={!!loading || !canProceed}>
                {loading === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-6 w-6" />}
                {t('welcome.continueWithGoogle')}
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => setDialogOpen(true)} disabled={!!loading || !canProceed}>
                {loading === 'anonymous' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AnonymousIcon className="mr-2 h-6 w-6" />}
                {t('welcome.continueAnonymously')}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-center justify-center gap-2 pt-4 border-t">
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                <Link href="/about" className="hover:text-primary transition-colors">{t('userMenu.about')}</Link>
                <Link href="/terms" className="hover:text-primary transition-colors">{t('userMenu.terms')}</Link>
                <Link href="/copyright" className="hover:text-primary transition-colors">{t('userMenu.copyright')}</Link>
            </div>
            <p className="text-xs text-muted-foreground">
                © 2024 {t('appName')}. All Rights Reserved.
            </p>
          </CardFooter>
        </Card>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('welcome.anonymousDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('welcome.anonymousDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              id="name"
              placeholder={t('welcome.displayNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAnonymousLogin();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>{t('buttons.cancel')}</Button>
            <Button onClick={handleAnonymousLogin} disabled={loading === 'anonymous'}>
              {loading === 'anonymous' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('buttons.continue')}
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
  const { t } = useLocale();
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
        <span className="sr-only">{t('header.createPost')}</span>
      </button>
    </>
  );
}
