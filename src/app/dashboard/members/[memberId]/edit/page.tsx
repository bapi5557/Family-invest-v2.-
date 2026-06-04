"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { FamilyMember } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function EditMemberPage() {
  const { memberId } = useParams();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();

  const memberRef = useMemoFirebase(() => {
    if (!db || !memberId) return null;
    return doc(db, "members", memberId as string);
  }, [db, memberId]);

  const { data: member, loading: loadingMember } = useDoc<FamilyMember>(memberRef);

  useEffect(() => {
    if (member) {
      setName(member.name);
      setPhone(member.phone);
      setNotes(member.notes);
    }
  }, [member]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !memberId) return;

    const updateData = { name, phone, notes };
    const docRef = doc(db, "members", memberId as string);

    // NON-BLOCKING: Update Firestore and immediately redirect
    updateDoc(docRef, updateData)
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: "update",
          requestResourceData: updateData,
        });
        errorEmitter.emit("permission-error", permissionError);
      });

    toast({ title: "Changes Saved", description: "Member profile updated successfully." });
    router.push(`/dashboard/members/${memberId}`);
  };

  if (loadingMember) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Link href={`/dashboard/members/${memberId}`} className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Profile
      </Link>

      <Card className="rounded-[2rem] shadow-xl overflow-hidden border-none">
        <CardHeader className="bg-accent text-white p-8">
          <CardTitle className="text-2xl font-headline">Edit Member</CardTitle>
          <CardDescription className="text-accent-foreground/80">Update details for {member?.name}</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
              <Input 
                id="name" 
                required 
                className="h-12 rounded-xl"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold">Phone Number</Label>
              <Input 
                id="phone" 
                className="h-12 rounded-xl"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-semibold">Notes</Label>
              <Textarea 
                id="notes" 
                className="min-h-[120px] rounded-xl"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 h-12 text-lg rounded-xl shadow-lg">
                <Save className="w-5 h-5 mr-2" />
                Update Profile
              </Button>
              <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" asChild>
                <Link href={`/dashboard/members/${memberId}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
