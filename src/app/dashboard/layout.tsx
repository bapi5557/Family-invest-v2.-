
"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { doc } from "firebase/firestore";
import { FamilySettings } from "@/lib/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const settingsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "settings", user.uid);
  }, [db, user]);

  const { data: settings, loading: settingsLoading, error: settingsError } = useDoc<FamilySettings>(settingsRef);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // If we've finished loading and settings still don't exist for this user,
    // they are not part of any family ledger yet.
    if (!authLoading && !settingsLoading && user && !settings) {
      console.log("No family connection found for UID:", user.uid);
      router.replace("/join?reason=no_family_connection");
    }
  }, [user, authLoading, settingsLoading, settings, router]);

  // Handle loading states
  if (authLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-primary animate-pulse">Synchronizing Ledger...</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Verifying Family Access</p>
          </div>
        </div>
      </div>
    );
  }

  // If settings error occurred, display it
  if (settingsError) {
    return (
      <div className="flex items-center justify-center h-screen bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-[2rem] shadow-xl">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <h2 className="text-2xl font-headline">Connection Error</h2>
          <p className="text-sm text-muted-foreground font-medium">We couldn't verify your family membership. Please check your internet connection.</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full h-12 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // If we have a user but still no settings after loading, keep showing the loader
  // while the useEffect redirect kicks in to avoid a flash of empty dashboard.
  if (user && !settings) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pt-16">
      <Navbar />
      <main className="max-w-5xl mx-auto p-4 md:p-8">
        <Suspense fallback={
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="w-6 h-6 animate-spin text-primary/30" />
          </div>
        }>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
