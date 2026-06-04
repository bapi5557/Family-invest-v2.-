
'use client';

import React, { createContext, useContext } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';

interface FirebaseContextProps {
  app: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

const FirebaseContext = createContext<FirebaseContextProps | undefined>(undefined);

export function FirebaseProvider({
  children,
  app,
  firestore,
  auth,
}: {
  children: React.ReactNode;
  app: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}) {
  return (
    <FirebaseContext.Provider value={{ app, firestore, auth }}>
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
