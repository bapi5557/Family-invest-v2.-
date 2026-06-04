
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useAuth, useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Firebase connection could not be established.",
      });
      return;
    }
    
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      if (user) {
        await updateProfile(user, { displayName: familyName });

        // INITIALIZE PERMANENT FAMILY CLOUD SETTINGS
        const settingsData = {
          adminPin: "1234",
          updatedAt: Date.now(),
          familyName: familyName.trim(),
          ownerId: user.uid,
        };

        const docRef = doc(db, "settings", user.uid);
        
        // Use non-blocking write with rich error handling
        setDoc(docRef, settingsData)
          .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: docRef.path,
              operation: "create",
              requestResourceData: settingsData,
            });
            errorEmitter.emit("permission-error", permissionError);
          });

        toast({
          title: "Family Account Created!",
          description: `The ${familyName} family cloud database is now active.`,
        });
        
        router.replace("/dashboard");
      }
    } catch (error: any) {
      console.error(error);
      let errorMessage = "Registration failed. Try again shortly.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This family email is already registered.";
      }
      
      toast({
        variant: "destructive",
        title: "Account Setup Failed",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <Link href="/" className="absolute top-8 left-8 flex items-center text-sm font-bold text-slate-500 hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Link>

      <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden rounded-[2.5rem] bg-white">
        <CardHeader className="bg-primary text-white p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="w-20 h-20" />
          </div>
          <CardTitle className="text-3xl font-headline tracking-tight">Setup Family</CardTitle>
          <CardDescription className="text-primary-foreground/70 font-medium mt-1">Initialize your shared family cloud ledger.</CardDescription>
        </CardHeader>
        <CardContent className="p-10 space-y-6">
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-slate-400">Family Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. The Johnsons" 
                required 
                className="h-14 rounded-2xl text-lg border-slate-200"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-400">Shared Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="family@example.com" 
                required 
                className="h-14 rounded-2xl text-lg border-slate-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-slate-400">Shared Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                className="h-14 rounded-2xl text-lg border-slate-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                disabled={loading}
              />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Shared across all family devices.</p>
            </div>
            <Button type="submit" className="w-full h-14 text-xl font-headline shadow-xl rounded-2xl mt-4" disabled={loading}>
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Start Family Ledger"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="p-10 pt-0 text-center">
          <p className="text-sm text-slate-500 font-medium w-full">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
