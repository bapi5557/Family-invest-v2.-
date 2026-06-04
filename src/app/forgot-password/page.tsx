
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const auth = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSubmitted(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send reset email.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Link href="/login" className="absolute top-8 left-8 flex items-center text-sm font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
      </Link>

      <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden rounded-[2rem]">
        {!submitted ? (
          <>
            <CardHeader className="bg-primary text-white p-8 text-center">
              <CardTitle className="text-3xl font-headline">Reset Password</CardTitle>
              <CardDescription className="text-primary-foreground/70">Enter your email to receive a link</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-4">
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
                <Button type="submit" className="w-full h-12 text-lg shadow-lg" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Link"}
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <CardContent className="p-12 text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-headline text-primary">Check your email</h2>
              <p className="text-sm text-muted-foreground">We've sent password reset instructions to your email address.</p>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/login">Return to Login</Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
