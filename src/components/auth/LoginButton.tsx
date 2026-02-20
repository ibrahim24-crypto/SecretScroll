'use client';

import { useState } from 'react';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, googleAuthProvider } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Loader2 } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

export function LoginButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLocale();

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
      toast({
        title: t('toasts.signedInSuccess'),
      });
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        toast({
            title: t('toasts.popupBlockedTitle'),
            description: t('toasts.popupBlockedDescription'),
            variant: 'destructive',
        });
        // Fallback to redirect.
        signInWithRedirect(auth, googleAuthProvider);
        return;
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
    }
    setLoading(false);
  };

  return (
    <Button onClick={handleLogin} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
      {t('welcome.continueWithGoogle')}
    </Button>
  );
}
