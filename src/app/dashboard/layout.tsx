
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

  const { data: settings, loading: settingsLoading } = useDoc<FamilySettings>(settingsRef);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // If we've finished loading and settings still don't exist for this user,
    // they might need to join a family or complete setup.
    if (!authLoading && !settingsLoading && user && !settings) {
      router.replace("/join");
    }
  }, [user, authLoading, settingsLoading, settings, router]);

  // Only show the global loading screen while we are actually fetching data.
  // Once loading is false, if settings is null, the useEffect above handles the redirect.
  if (authLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground animate-pulse font-medium">Verifying Family Access...</p>
        </div>
      </div>
    );
  }

  // If we have a user but still no settings after loading, keep showing the loader
  // for a split second until the redirect takes effect.
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
