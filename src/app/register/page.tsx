
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useAuth } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Firebase Authentication is not initialized. Check your environment variables.",
      });
      return;
    }
    
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name if user was created
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      
      toast({
        title: "Welcome to KinVest!",
        description: `Account created for ${name}. Redirecting to dashboard...`,
      });
      
      router.push("/dashboard");
    } catch (error: any) {
      // Handle specific Firebase Auth errors
      let errorMessage = "Registration failed. Please try again.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already registered.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "The email address is badly formatted.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The password is too weak. Please use at least 6 characters.";
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "Email/Password sign-in is not enabled in the Firebase Console. Please enable it in the Authentication settings.";
      } else {
        // Emit for central logging if it's an unexpected error
        errorEmitter.emit('firebase-error', error);
        errorMessage = error.message || errorMessage;
      }

      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Link href="/" className="absolute top-8 left-8 flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
      </Link>

      <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden rounded-[2rem]">
        <CardHeader className="bg-primary text-white p-8 text-center">
          <CardTitle className="text-3xl font-headline">Join KinVest</CardTitle>
          <CardDescription className="text-primary-foreground/70 font-body">Start managing your family's future</CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-4">
          {!auth && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Firebase Not Configured</AlertTitle>
              <AlertDescription>
                Registration is unavailable. Please ensure your environment variables are set in the .env file.
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                placeholder="John Doe" 
                required 
                className="h-12 rounded-xl"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading || !auth}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                required 
                className="h-12 rounded-xl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || !auth}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                className="h-12 rounded-xl"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                disabled={loading || !auth}
              />
              <p className="text-[10px] text-muted-foreground">Minimum 6 characters</p>
            </div>
            <Button type="submit" className="w-full h-12 text-lg shadow-lg rounded-xl mt-6" disabled={loading || !auth}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="p-8 pt-0 text-center border-t border-slate-50 mt-4">
          <p className="text-sm text-muted-foreground w-full mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline transition-all">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
      
      <div className="mt-8 text-center max-w-xs">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed">
          By registering, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  );
}
