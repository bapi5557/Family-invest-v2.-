
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error('Firebase Permission Error:', error);
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: `You do not have permission to ${error.context.operation} at ${error.context.path}.`,
      });
    };

    const handleGeneralError = (error: any) => {
      console.error('Firebase General Error:', error);
      toast({
        variant: 'destructive',
        title: 'Firebase Error',
        description: error.message || 'An unexpected error occurred with Firebase.',
      });
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
