"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useAuth } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Firebase Authentication is not initialized.",
      });
      return;
    }
    
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: familyName });
      }
      
      toast({
        title: "Account Created!",
        description: `${familyName} family registered successfully.`,
      });
      
      // Use replace to clear register from navigation history
      router.replace("/dashboard");
    } catch (error: any) {
      let errorMessage = "Registration failed. Please try again.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This family email is already registered.";
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "Email/Password sign-in is not enabled in the Firebase Console.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Minimum 6 characters.";
      }
      
      toast({
        variant: "destructive",
        title: "Setup Failed",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Link href="/" className="absolute top-8 left-8 flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Link>

      <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden rounded-[2rem]">
        <CardHeader className="bg-primary text-white p-8 text-center">
          <CardTitle className="text-3xl font-headline">New Family Account</CardTitle>
          <CardDescription className="text-primary-foreground/70">Create shared credentials for your family</CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-4">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Family / Last Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. The Johnsons" 
                required 
                className="h-12"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Shared Family Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="family@example.com" 
                required 
                className="h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Shared Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                className="h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                disabled={loading}
              />
              <p className="text-[10px] text-muted-foreground">Share this password with all family members.</p>
            </div>
            <Button type="submit" className="w-full h-12 text-lg shadow-lg" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Shared Account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="p-8 pt-0 text-center">
          <p className="text-sm text-muted-foreground w-full">
            Family already registered?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
