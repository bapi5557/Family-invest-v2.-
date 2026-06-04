"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, AlertCircle, Camera, Loader2 } from "lucide-react";
import Link from "next/link";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useFirestore, useUser, useStorage } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { compressAndResizeImage } from "@/lib/image-utils";

export default function NewMemberPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const { user } = useUser();
  const { toast } = useToast();

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
    setFormError(null);

    if (!db || !user) {
      setFormError("Connection not established. Please sign in again.");
      return;
    }

    setIsUploading(true);

    try {
      let photoUrl = "";
      
      if (photoFile && storage) {
        // 1. FAST COMPRESS AND RESIZE
        const optimizedBlob = await compressAndResizeImage(photoFile);
        
        // 2. UPLOAD WITH PROGRESS
        const storageRef = ref(storage, `member_photos/${user.uid}_${Date.now()}.jpg`);
        const uploadTask = uploadBytesResumable(storageRef, optimizedBlob);

        photoUrl = await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => reject(error),
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            }
          );
        });
      }

      const memberData = {
        name: name.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
        photoUrl,
        ownerId: user.uid,
        createdAt: Date.now(),
      };

      // Faster UX: non-blocking firestore write
      addDoc(collection(db, "members"), memberData)
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: "members",
            operation: "create",
            requestResourceData: memberData,
          });
          errorEmitter.emit("permission-error", permissionError);
        });

      toast({ title: "Member Added!", description: `${name} is now part of your family.` });
      router.push("/dashboard");
    } catch (error: any) {
      console.error(error);
      setFormError("Failed to process photo or save member data.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Link href="/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Link>

      <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-primary text-white p-8">
          <CardTitle className="text-3xl font-headline">Add Member</CardTitle>
          <CardDescription className="text-primary-foreground/80">Instantly sync family profiles.</CardDescription>
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
            <div className="flex flex-col items-center gap-4 mb-4">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-4 border-slate-100 shadow-md">
                  <AvatarImage src={photoPreview || ""} className="object-cover" />
                  <AvatarFallback className="bg-primary/5 text-primary text-2xl font-bold">
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
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Member Photo</p>
                {isUploading && (
                   <div className="mt-2 w-32 mx-auto space-y-1">
                     <Progress value={uploadProgress} className="h-1" />
                     <p className="text-[10px] text-primary animate-pulse font-bold">{Math.round(uploadProgress)}%</p>
                   </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. Sarah Johnson"
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
                type="tel"
                placeholder="e.g. +91 98765 43210"
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
                placeholder="e.g. Family admin access..."
                className="min-h-[120px] rounded-xl resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isUploading}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="submit" className="flex-1 h-12 text-lg shadow-lg rounded-xl" disabled={isUploading}>
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {isUploading ? "Processing..." : "Quick Save"}
              </Button>
              <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" asChild disabled={isUploading}>
                <Link href="/dashboard">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
