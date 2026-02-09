'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error(error); // This will show the detailed error in the dev console
      
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You do not have permission to perform this action. Check the console for details.',
        duration: 9000,
      });

      // In a development environment, you might want to throw the error to leverage Next.js's error overlay
      if (process.env.NODE_ENV === 'development') {
        // This will be caught by the nearest error boundary and displayed by Next.js.
        throw error;
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null; // This component does not render anything
}
