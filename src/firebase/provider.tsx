
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, onSnapshotsInSync } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';

interface FirebaseContextProps {
  app: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  isOnline: boolean;
  isSyncing: boolean;
}

const FirebaseContext = createContext<FirebaseContextProps | undefined>(undefined);

export function FirebaseProvider({
  children,
  app,
  firestore,
  auth,
  storage,
}: {
  children: React.ReactNode;
  app: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
}) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      // Brief syncing state when coming back online
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsSyncing(false);
    };

    setIsOnline(window.navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor Firestore's sync status
    let unsubscribeSync: (() => void) | undefined;
    if (firestore) {
      unsubscribeSync = onSnapshotsInSync(firestore, () => {
        // This fires when local changes have been written to the server
        // We use it as a hint that a sync operation just completed
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (unsubscribeSync) unsubscribeSync();
    };
  }, [firestore]);

  return (
    <FirebaseContext.Provider value={{ app, firestore, auth, storage, isOnline, isSyncing }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebaseApp() {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useFirebaseApp must be used within a FirebaseProvider');
  return context.app;
}

export function useFirestore() {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useFirestore must be used within a FirebaseProvider');
  return context.firestore;
}

export function useAuth() {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useAuth must be used within a FirebaseProvider');
  return context.auth;
}

export function useStorage() {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useStorage must be used within a FirebaseProvider');
  return context.storage;
}

export function useConnectionStatus() {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useConnectionStatus must be used within a FirebaseProvider');
  return { isOnline: context.isOnline, isSyncing: context.isSyncing };
}
