
"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Suspense, useEffect, useState } from "react";
import { Loader2, ShieldAlert, UserPlus, Sparkles, LayoutDashboard, ArrowRight } from "lucide-react";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { FamilySettings } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [isInitializing, setIsInitializing] = useState(false);

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

  const handleInitializeFamily = () => {
    if (!db || !user) return;
    setIsInitializing(true);
    
    const settingsData = {
      adminPin: "1234",
      familyName: user.displayName || "My Family",
      ownerId: user.uid,
      updatedAt: Date.now(),
      canExport: true
    };

    const docRef = doc(db, "settings", user.uid);

    setDoc(docRef, settingsData)
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: "write",
          requestResourceData: settingsData,
        });
        errorEmitter.emit("permission-error", permissionError);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  };

  if (authLoading || (settingsLoading && !settings)) {
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
        </div>
      </div>
    );
  }

  if (user && !settings && !settingsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-xl mb-4">
               <span className="text-white font-headline text-4xl">K</span>
            </div>
            <h1 className="text-4xl font-headline text-primary">Welcome to KinVest</h1>
            <p className="text-muted-foreground font-medium">Your family ledger is ready for setup.</p>
          </div>

          <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-accent text-white p-8 text-center relative">
               <CardTitle className="text-2xl font-headline">Finish Account Setup</CardTitle>
               <CardDescription className="text-accent-foreground/80">Choose how you want to use the app</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center gap-3 text-primary">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="font-bold">I am the Family Admin</h3>
                  </div>
                  <p className="text-xs text-slate-500">Starting a new ledger or restoring an existing admin account.</p>
                  <Button 
                    className="w-full h-12 rounded-xl shadow-lg" 
                    onClick={handleInitializeFamily}
                    disabled={isInitializing}
                  >
                    {isInitializing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LayoutDashboard className="w-4 h-4 mr-2" />}
                    Initialize My Dashboard
                  </Button>
                </div>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-slate-300"><span className="bg-white px-4">OR</span></div>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center gap-3 text-accent">
                    <UserPlus className="w-5 h-5" />
                    <h3 className="font-bold">I have an Invite Code</h3>
                  </div>
                  <p className="text-xs text-slate-500">Joining a family ledger created by someone else.</p>
                  <Button variant="outline" className="w-full h-12 rounded-xl border-accent text-accent hover:bg-accent/5" asChild>
                    <Link href="/join">
                      Enter 10-Digit Code <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (settingsError) {
    return (
      <div className="flex items-center justify-center h-screen bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-[2rem] shadow-xl">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
             <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-headline">Connection Error</h2>
          <p className="text-sm text-muted-foreground font-medium">We couldn't verify your family membership status.</p>
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
