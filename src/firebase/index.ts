
'use client';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';
import { useMemo } from 'react';

/**
 * Initializes Firebase services with production configuration.
 * Rules version: 2024-05-24.3 (Forcing security rules redeployment for studio-7478833500-c0c46)
 */
export function initializeFirebase(): {
  app: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
} {
  const isConfigValid = !!firebaseConfig.apiKey && 
                        firebaseConfig.apiKey !== 'YOUR_API_KEY';

  if (!isConfigValid) {
    console.warn("Firebase configuration is incomplete. Authentication will be limited.");
    return { app: null, firestore: null, auth: null, storage: null };
  }

  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const auth = getAuth(app);
    const storage = getStorage(app);

    return { app, firestore, auth, storage };
  } catch (e) {
    console.error("Firebase initialization failed:", e);
    return { app: null, firestore: null, auth: null, storage: null };
  }
}

export { FirebaseProvider, useFirebaseApp, useFirestore, useAuth, useStorage } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useUser } from './auth/use-user';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';

/**
 * Utility hook to stabilize Firebase references and queries.
 */
export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  return useMemo(factory, deps);
}
