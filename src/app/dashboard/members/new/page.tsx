
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Save, AlertCircle } from "lucide-react";
import Link from "next/link";
import { collection, addDoc } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function NewMemberPage() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!db || !user) {
      const msg = "Database connection not established. Please check your login status.";
      setFormError(msg);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: msg,
      });
      return;
    }

    if (!name.trim()) {
      setFormError("Member name is required.");
      return;
    }

    setLoading(true);

    const memberData = {
      name: name.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      ownerId: user.uid,
      createdAt: Date.now(),
    };

    addDoc(collection(db, "members"), memberData)
      .then(() => {
        toast({ 
          title: "Success", 
          description: `${name} has been added to your family network.` 
        });
        // Navigation to dashboard as requested
        router.push("/dashboard");
      })
      .catch(async (serverError) => {
        console.error("Failed to add member:", serverError);
        const permissionError = new FirestorePermissionError({
          path: "members",
          operation: "create",
          requestResourceData: memberData,
        });
        errorEmitter.emit("permission-error", permissionError);
        setFormError("You don't have permission to add members or a database error occurred.");
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link href="/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Link>

      <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-primary text-white p-8">
          <CardTitle className="text-3xl font-headline">Add New Member</CardTitle>
          <CardDescription className="text-primary-foreground/80">Create a profile for a family member to track their expenses.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          {formError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. Sarah Johnson"
                required 
                className="h-12 rounded-xl"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold">Phone Number (Optional)</Label>
              <Input 
                id="phone" 
                type="tel"
                placeholder="e.g. +1 555 0123"
                className="h-12 rounded-xl"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-semibold">Notes (Relationship, details, etc.)</Label>
              <Textarea 
                id="notes" 
                placeholder="e.g. College student, primary contact for utilities..."
                className="min-h-[120px] rounded-xl resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="submit" className="flex-1 h-12 text-lg shadow-lg rounded-xl" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                Save Member
              </Button>
              <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" asChild disabled={loading}>
                <Link href="/dashboard">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
