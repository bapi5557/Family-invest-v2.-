
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
      setFormError("Family connection lost. Please re-login.");
      return;
    }

    setIsUploading(true);

    try {
      let photoUrl = "";
      
      if (photoFile && storage) {
        // OPTIMIZATION: Hardware-accelerated image processing
        const optimizedBlob = await compressAndResizeImage(photoFile);
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

      // OPTIMIZATION: Non-blocking write
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
        title: "Member Saved", 
        description: `${name} is now part of your family network.` 
      });
      router.push("/dashboard");
    } catch (error: any) {
      console.error(error);
      setFormError("Persistence failed. Check your internet connection.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Link href="/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Link>

      <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="bg-primary text-white p-10">
          <CardTitle className="text-4xl font-headline">New Member</CardTitle>
          <CardDescription className="text-primary-foreground/80 font-medium">Add someone to your family's secure network.</CardDescription>
        </CardHeader>
        <CardContent className="p-10">
          {formError && (
            <Alert variant="destructive" className="mb-6 rounded-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-bold">Save Error</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex flex-col items-center gap-6 mb-4">
              <div className="relative group">
                <Avatar className="w-32 h-32 border-4 border-slate-50 shadow-xl rounded-[2rem]">
                  <AvatarImage src={photoPreview || ""} className="object-cover" />
                  <AvatarFallback className="bg-slate-100 text-primary text-4xl font-bold">
                    {name ? name.charAt(0) : <Camera className="w-12 h-12 opacity-20" />}
                  </AvatarFallback>
                </Avatar>
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="icon" 
                  className="absolute -bottom-2 -right-2 rounded-2xl h-12 w-12 shadow-xl border-4 border-white"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Camera className="w-5 h-5" />
                </Button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handlePhotoChange} 
              />
              <div className="text-center space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Member Identity Photo</p>
                {isUploading && (
                   <div className="mt-3 w-40 mx-auto space-y-2">
                     <Progress value={uploadProgress} className="h-1.5" />
                     <p className="text-[10px] text-primary animate-pulse font-black uppercase tracking-tighter">Uploading... {Math.round(uploadProgress)}%</p>
                   </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs uppercase font-black text-slate-400 tracking-wider">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Rahul Sharma"
                  required 
                  className="h-14 rounded-2xl text-lg font-medium border-slate-200 shadow-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs uppercase font-black text-slate-400 tracking-wider">Contact Number</Label>
                <Input 
                  id="phone" 
                  type="tel"
                  placeholder="e.g. +91 90000 00000"
                  className="h-14 rounded-2xl text-lg font-medium border-slate-200 shadow-sm"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isUploading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs uppercase font-black text-slate-400 tracking-wider">Biography / Notes</Label>
              <Textarea 
                id="notes" 
                placeholder="Key details for the family network..."
                className="min-h-[140px] rounded-2xl resize-none text-base border-slate-200 shadow-sm p-4"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isUploading}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button type="submit" className="flex-1 h-14 text-xl font-headline shadow-xl rounded-2xl" disabled={isUploading}>
                {isUploading ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Save className="w-6 h-6 mr-3" />}
                {isUploading ? "Processing..." : "Save Member"}
              </Button>
              <Button type="button" variant="outline" className="flex-1 h-14 rounded-2xl text-lg border-slate-200" asChild disabled={isUploading}>
                <Link href="/dashboard">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
