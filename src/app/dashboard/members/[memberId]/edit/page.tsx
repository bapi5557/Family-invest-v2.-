
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
  const [loading, setLoading] = useState(false);
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
    setLoading(true);

    const updateData = { name, phone, notes };
    const docRef = doc(db, "members", memberId as string);

    updateDoc(docRef, updateData)
      .then(() => {
        toast({ title: "Updated", description: "Member details updated." });
        router.push(`/dashboard/members/${memberId}`);
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: "update",
          requestResourceData: updateData,
        });
        errorEmitter.emit("permission-error", permissionError);
      })
      .finally(() => setLoading(false));
  };

  if (loadingMember) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href={`/dashboard/members/${memberId}`} className="flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Profile
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Edit Member</CardTitle>
          <CardDescription>Update profile for {member?.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/dashboard/members/${memberId}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
