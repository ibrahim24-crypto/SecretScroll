'use client';

import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react';

export function LoginButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
      toast({
        title: 'Successfully signed in!',
        description: 'Welcome to SecretScroll.',
      });
    } catch (error) {
      console.error('Error signing in with Google: ', error);
      toast({
        title: 'Authentication failed',
        description: 'Could not sign you in. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleLogin} disabled={loading}>
      <LogIn className="mr-2 h-4 w-4" />
      {loading ? 'Signing In...' : 'Sign In with Google'}
    </Button>
  );
}
