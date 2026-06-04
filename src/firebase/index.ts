
'use client';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';
import { useMemo } from 'react';

/**
 * Initializes Firebase services if configuration is available.
 * Gracefully handles missing configuration to prevent app crashes.
 */
export function initializeFirebase(): {
  app: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
} {
  // Validate basic config existence
  const isConfigValid = !!firebaseConfig.apiKey && 
                        firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
                        !!firebaseConfig.projectId;

  if (!isConfigValid) {
    console.warn("Firebase configuration is missing or invalid. Check your .env file.");
    return { app: null, firestore: null, auth: null };
  }

  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const auth = getAuth(app);

    return { app, firestore, auth };
  } catch (e) {
    console.error("Firebase initialization failed:", e);
    return { app: null, firestore: null, auth: null };
  }
}

export { FirebaseProvider, useFirebaseApp, useFirestore, useAuth } from './provider';
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
