
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Sparkles, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import { Invite } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

function JoinFamilyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode) setCode(urlCode);
  }, [searchParams]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;

    setIsVerifying(true);
    setError(null);

    const cleanCode = code.trim();

    try {
      // OPTIMIZED: Query ONLY by code to avoid composite index requirement
      const invitesQuery = query(
        collection(db, "invites"), 
        where("code", "==", cleanCode)
      );
      const inviteSnap = await getDocs(invitesQuery);

      if (inviteSnap.empty) {
        throw new Error("Invalid 10-digit invite code.");
      }

      // Filter in memory for safety
      const inviteDoc = inviteSnap.docs[0];
      const inviteData = inviteDoc.data() as Invite;

      if (inviteData.revoked) {
        throw new Error("This invite code has been revoked by the admin.");
      }

      // 2. Check expiration
      if (inviteData.expiresAt < Date.now()) {
        throw new Error("This invite code has expired.");
      }

      // 3. Link user to family
      const settingsRef = doc(db, "settings", user.uid);
      await setDoc(settingsRef, {
        familyOwnerId: inviteData.ownerId,
        updatedAt: Date.now(),
        ownerId: user.uid,
        adminPin: "1234", // Default PIN for new member profiles
      }, { merge: true });

      setSuccess(true);
      toast({ title: "Joined Family!", description: "You now have access to the shared ledger." });
      
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);

    } catch (err: any) {
      setError(err.message || "Failed to join family.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (authLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;

  if (!user) {
    return (
      <Card className="border-none shadow-2xl rounded-[2.5rem] p-10 text-center space-y-6">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-headline">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in or create an account before joining a family.</p>
        </div>
        <Button className="w-full h-12 rounded-xl shadow-lg" asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
      <CardHeader className="bg-accent text-white p-10 text-center relative">
        <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-20 h-20" /></div>
        <CardTitle className="text-4xl font-headline tracking-tight">Join Family</CardTitle>
        <CardDescription className="text-accent-foreground/80 font-medium">Connect to a shared family ledger via 10-digit code.</CardDescription>
      </CardHeader>
      <CardContent className="p-10">
        {!success ? (
          <form onSubmit={handleJoin} className="space-y-6">
            <div className="space-y-2 text-center">
              <Label htmlFor="code" className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Enter 10-Digit Invite Code</Label>
              <Input 
                id="code" 
                placeholder="1234567890" 
                required 
                maxLength={10}
                className="h-16 rounded-2xl text-center text-3xl font-code font-bold tracking-[0.2em] uppercase border-slate-200 focus:ring-accent"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                disabled={isVerifying}
              />
              {error && <p className="text-sm font-bold text-destructive mt-2">{error}</p>}
            </div>

            <Button type="submit" className="w-full h-14 text-xl font-headline shadow-xl rounded-2xl bg-accent hover:bg-accent/90" disabled={isVerifying}>
              {isVerifying ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <ShieldCheck className="w-6 h-6 mr-3" />}
              Verify & Join
            </Button>
          </form>
        ) : (
          <div className="py-10 text-center space-y-6 animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-headline text-primary">Connected!</h2>
              <p className="text-muted-foreground font-medium">Syncing with family cloud ledger...</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function JoinFamilyPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <Link href="/" className="absolute top-8 left-8 flex items-center text-sm font-bold text-slate-500 hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Home
      </Link>
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>}>
          <JoinFamilyForm />
        </Suspense>
      </div>
    </div>
  );
}
