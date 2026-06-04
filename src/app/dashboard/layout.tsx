
"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Suspense, useEffect } from "react";
import { Loader2, Fingerprint, ShieldAlert, Database } from "lucide-react";
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
    // Only redirect if we are absolutely sure data is missing
    if (!authLoading && !settingsLoading && user && !settings) {
      const reason = "no_family_connection";
      const debugInfo = `uid=${user.uid}&fid=none&reason=${reason}`;
      console.log("Redirecting to Join. Debug:", debugInfo);
      router.replace(`/join?reason=${reason}&${debugInfo}`);
    }
  }, [user, authLoading, settingsLoading, settings, router]);

  // Handle loading states with Debug Info
  if (authLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-headline text-primary animate-pulse">Synchronizing Ledger...</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">Verifying Family Access</p>
          </div>
          
          {/* Debug Panel */}
          <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 text-left space-y-3 shadow-inner">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight text-slate-400">
              <span>Diagnostic System</span>
              <span className="text-emerald-500">Live</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Fingerprint className="w-4 h-4 text-slate-300" />
                <div className="overflow-hidden">
                  <p className="text-[9px] text-slate-400 uppercase font-black">Auth UID</p>
                  <p className="text-xs font-mono truncate">{user?.uid || 'Authenticating...'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-slate-300" />
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-black">Settings Status</p>
                  <p className="text-xs font-bold">{settingsLoading ? 'Fetching Document...' : settings ? 'Found' : 'Missing (Redirecting soon)'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If settings error occurred
  if (settingsError) {
    return (
      <div className="flex items-center justify-center h-screen bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-[2rem] shadow-xl">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
             <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-headline">Connection Error</h2>
          <p className="text-sm text-muted-foreground font-medium">We couldn't verify your family membership status.</p>
          <div className="p-4 bg-red-50 rounded-xl text-left">
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">Error Details</p>
            <p className="text-xs font-mono text-red-700">{settingsError.message}</p>
          </div>
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
