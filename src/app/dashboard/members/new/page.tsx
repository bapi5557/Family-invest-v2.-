"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import Link from "next/link";
import { collection, addDoc } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function NewMemberPage() {
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
      setFormError("Connection not established. Please sign in again.");
      return;
    }

    if (!name.trim()) {
      setFormError("Member name is required.");
      return;
    }

    const memberData = {
      name: name.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      ownerId: user.uid,
      createdAt: Date.now(),
    };

    // Non-blocking write for speed
    addDoc(collection(db, "members"), memberData)
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: "members",
          operation: "create",
          requestResourceData: memberData,
        });
        errorEmitter.emit("permission-error", permissionError);
      });

    toast({ 
      title: "Member Added!", 
      description: `${name} added to your family.` 
    });
    router.push("/dashboard");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Link href="/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Link>

      <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-primary text-white p-8">
          <CardTitle className="text-3xl font-headline">Add Member</CardTitle>
          <CardDescription className="text-primary-foreground/80">Track a new family member's expenses.</CardDescription>
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold">Phone Number (Optional)</Label>
              <Input 
                id="phone" 
                type="tel"
                placeholder="e.g. +91 98765 43210"
                className="h-12 rounded-xl"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-semibold">Notes</Label>
              <Textarea 
                id="notes" 
                placeholder="e.g. Primary contact for house rent..."
                className="min-h-[120px] rounded-xl resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="submit" className="flex-1 h-12 text-lg shadow-lg rounded-xl">
                <Save className="w-5 h-5 mr-2" />
                Quick Save
              </Button>
              <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" asChild>
                <Link href="/dashboard">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}