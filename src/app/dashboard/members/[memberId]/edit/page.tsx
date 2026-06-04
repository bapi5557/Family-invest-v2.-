
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Save, Camera } from "lucide-react";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useFirestore, useDoc, useMemoFirebase, useStorage } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { FamilyMember } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function EditMemberPage() {
  const { memberId } = useParams();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
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
      setPhotoUrl(member.photoUrl || "");
    }
  }, [member]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !memberId) return;

    setIsUploading(true);

    try {
      let finalPhotoUrl = photoUrl;
      if (photoFile && storage) {
        const storageRef = ref(storage, `member_photos/${memberId}_${Date.now()}_${photoFile.name}`);
        const snapshot = await uploadBytes(storageRef, photoFile);
        finalPhotoUrl = await getDownloadURL(snapshot.ref);
      }

      const updateData = { name, phone, notes, photoUrl: finalPhotoUrl };
      const docRef = doc(db, "members", memberId as string);

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
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Update Failed", description: "Error uploading photo or saving data." });
    } finally {
      setIsUploading(false);
    }
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
            <div className="flex flex-col items-center gap-4 mb-4">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-4 border-slate-100 shadow-md">
                  <AvatarImage src={photoPreview || photoUrl || ""} />
                  <AvatarFallback className="bg-accent/5 text-accent text-2xl font-bold">
                    {name ? name.charAt(0) : <Camera className="w-8 h-8 opacity-30" />}
                  </AvatarFallback>
                </Avatar>
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="icon" 
                  className="absolute bottom-0 right-0 rounded-full shadow-lg border-2 border-white"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handlePhotoChange} 
              />
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Change Photo</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
              <Input 
                id="name" 
                required 
                className="h-12 rounded-xl"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isUploading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold">Phone Number</Label>
              <Input 
                id="phone" 
                className="h-12 rounded-xl"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isUploading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-semibold">Notes</Label>
              <Textarea 
                id="notes" 
                className="min-h-[120px] rounded-xl"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isUploading}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 h-12 text-lg rounded-xl shadow-lg" disabled={isUploading}>
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {isUploading ? "Saving..." : "Update Profile"}
              </Button>
              <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" asChild disabled={isUploading}>
                <Link href={`/dashboard/members/${memberId}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
