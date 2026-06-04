
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      // Log for development context
      console.error('Firebase Permission Error:', error);
      
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: `Access restricted: ${error.context.operation} at ${error.context.path}.`,
      });
    };

    const handleGeneralError = (error: any) => {
      // Log for development context
      console.error('Firebase General Error:', error);
      
      // Don't show redundant toasts if the page is already handling it
      // but catch unexpected background errors
      if (error?.message && !error.message.includes('auth/')) {
        toast({
          variant: 'destructive',
          title: 'System Error',
          description: error.message || 'An unexpected error occurred with the database.',
        });
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);
    errorEmitter.on('firebase-error', handleGeneralError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
      errorEmitter.off('firebase-error', handleGeneralError);
    };
  }, [toast]);

  return null;
}
