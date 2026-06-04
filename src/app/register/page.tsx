
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
  const [name, setName] = useState("");
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "An error occurred during registration.",
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
          <CardTitle className="text-3xl font-headline">Join KinVest</CardTitle>
          <CardDescription className="text-primary-foreground/70">Start managing your family's future</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                placeholder="John Doe" 
                required 
                className="h-12"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                className="h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg shadow-lg" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="p-8 pt-0 text-center">
          <p className="text-sm text-muted-foreground w-full">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
