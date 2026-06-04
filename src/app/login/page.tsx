
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      toast({
        variant: "destructive",
        title: "Firebase Error",
        description: "Authentication service is not available.",
      });
      return;
    }
    
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      router.push("/dashboard");
    } catch (error: any) {
      let errorMessage = "Invalid email or password.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = "Invalid credentials. Please try again.";
      }
      
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Link href="/" className="absolute top-8 left-8 flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Link>

      <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden rounded-[2rem]">
        <CardHeader className="bg-primary text-white p-8 text-center">
          <CardTitle className="text-3xl font-headline">Welcome Back</CardTitle>
          <CardDescription className="text-primary-foreground/70">Login to your family dashboard</CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-4">
          {!auth && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Firebase Not Configured</AlertTitle>
              <AlertDescription>
                Login is currently unavailable. Ensure your environment variables are set.
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                required 
                className="h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!auth}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" size="sm" className="text-xs text-primary hover:underline">
                  Forgot?
                </Link>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                className="h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!auth}
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg shadow-lg" disabled={loading || !auth}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="p-8 pt-0 text-center">
          <p className="text-sm text-muted-foreground w-full">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary font-bold hover:underline">
              Create one
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
