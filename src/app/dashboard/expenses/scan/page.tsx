
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Camera, 
  Upload, 
  Loader2, 
  Sparkles, 
  CheckCircle2, 
  Trash2, 
  ReceiptText, 
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { collection, addDoc, doc, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useFirestore, useUser, useStorage, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { scanReceipt } from "@/ai/flows/scan-receipt-flow";
import { useToast } from "@/hooks/use-toast";
import { createNotification } from "@/lib/notifications-service";
import { compressImage } from "@/lib/image-utils";
import { 
  DEFAULT_EXPENSE_CATEGORIES, 
  FamilyMember, 
  FamilySettings
} from "@/lib/types";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export default function ScanExpensePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPhotoPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [memberId, setMemberId] = useState("unassigned");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const { user } = useUser();
  const { toast } = useToast();

  const settingsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "settings", user.uid);
  }, [db, user]);
  
  const { data: settings } = useDoc<FamilySettings>(settingsRef);
  const effectiveOwnerId = settings?.familyOwnerId || user?.uid;

  const membersQuery = useMemoFirebase(() => {
    if (!db || !effectiveOwnerId) return null;
    return query(collection(db, "members"), where("ownerId", "==", effectiveOwnerId));
  }, [db, effectiveOwnerId]);

  const { data: members } = useCollection<FamilyMember>(membersQuery);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(selected);
      setScannedItems([]);
    }
  };

  const startScan = async () => {
    if (!file || !user) return;
    setIsProcessing(true);

    try {
      // 1024px is the optimized sweet-spot for Gemini OCR stability and detail
      const optimizedFile = await compressImage(file, 0.4, 1024);
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(optimizedFile);
      });

      // TRIGGER AI SCAN (Passes full data URI)
      const res = await scanReceipt({ photoDataUri: base64Data });

      // STORAGE UPLOAD (Parallel background task)
      if (storage) {
        const storageRef = ref(storage, `receipts/${user.uid}_${Date.now()}.jpg`);
        uploadBytes(storageRef, optimizedFile).then(async (snap) => {
          const url = await getDownloadURL(snap.ref);
          setReceiptUrl(url);
        }).catch(e => console.warn("Storage upload failed, but scan succeeded.", e));
      }
      
      if (!res.isReceipt || res.expenses.length === 0) {
        toast({ 
          variant: "destructive", 
          title: "Nothing Detected", 
          description: "The AI couldn't find any clear expense text. Please ensure the handwriting is legible and the photo is well-lit." 
        });
        setIsProcessing(false);
        return;
      }

      setScannedItems(res.expenses);
      toast({ title: "Scan Complete", description: `Found ${res.expenses.length} transactions.` });
    } catch (err: any) {
      console.error(err);
      toast({ 
        variant: "destructive", 
        title: "Scanner Error", 
        description: "Communication with AI failed. Check your internet or try again." 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...scannedItems];
    updated[index] = { ...updated[index], [field]: value };
    setScannedItems(updated);
  };

  const removeItem = (index: number) => {
    setScannedItems(scannedItems.filter((_, i) => i !== index));
  };

  const saveAll = async () => {
    if (!db || !user || !effectiveOwnerId || scannedItems.length === 0) return;
    setIsSaving(true);

    try {
      const promises = scannedItems.map((item) => {
        const expenseData = {
          ...item,
          memberId: memberId === "unassigned" ? null : memberId,
          ownerId: effectiveOwnerId,
          createdAt: Date.now(),
          receiptUrl: receiptUrl || null,
        };
        return addDoc(collection(db, "expenses"), expenseData);
      });

      await Promise.all(promises);

      const memberName = user.displayName || "Family Member";
      createNotification(
        db,
        effectiveOwnerId,
        `${memberName} scanned ${scannedItems.length} items to the ledger`,
        'expense',
        scannedItems.map(i => i.description).join(", "),
        user.uid,
        memberName,
        user.photoURL || ""
      );

      toast({ title: "Ledger Synced", description: "All items recorded successfully." });
      router.push("/dashboard/expenses");
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Sync Error", description: "Could not save records to database." });
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimestampForInput = (ts: number) => {
    return new Date(ts).toISOString().split('T')[0];
  };

  const handleDateChange = (index: number, dateStr: string) => {
    const timestamp = new Date(dateStr).getTime();
    updateItem(index, "date", timestamp);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/expenses" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Ledger
        </Link>
      </div>

      <Card className="rounded-[2.5rem] shadow-2xl overflow-hidden border-none">
        <CardHeader className="bg-primary text-white p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-24 h-24" /></div>
          <CardTitle className="text-4xl font-headline tracking-tight">AI Receipt Scanner</CardTitle>
          <CardDescription className="text-primary-foreground/80 font-medium">Capture notes or receipts to extract data instantly.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          
          {!preview ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-48 rounded-[2rem] border-2 border-dashed flex-col gap-3 hover:bg-primary/5 transition-all group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-800">Camera</p>
                  <p className="text-xs text-muted-foreground">Take a photo of a note</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="h-48 rounded-[2rem] border-2 border-dashed flex-col gap-3 hover:bg-accent/5 transition-all group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-accent" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-800">Choose File</p>
                  <p className="text-xs text-muted-foreground">Upload from gallery</p>
                </div>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative group max-w-sm mx-auto">
                 <img src={preview} className="w-full h-80 object-contain bg-slate-50 rounded-3xl shadow-xl border-4 border-white" alt="Preview" />
                 <Button 
                  variant="destructive" 
                  size="icon" 
                  className="absolute -top-2 -right-2 rounded-full shadow-lg"
                  onClick={() => { setFile(null); setPhotoPreview(null); setScannedItems([]); }}
                 >
                   <Trash2 className="w-4 h-4" />
                 </Button>
              </div>

              {scannedItems.length === 0 && !isProcessing && (
                <Button className="w-full h-14 rounded-2xl text-xl font-headline shadow-xl" onClick={startScan}>
                   <Sparkles className="w-6 h-6 mr-3" /> Analyze Image
                </Button>
              )}

              {isProcessing && (
                <div className="py-12 text-center space-y-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-primary animate-pulse">Scanning Handwriting...</p>
                    <p className="text-xs text-muted-foreground">Running high-resolution AI extraction.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

          {scannedItems.length > 0 && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="text-2xl font-headline flex items-center gap-2">
                  <ReceiptText className="w-6 h-6 text-primary" /> Review Extractions
                </h3>
                <div className="bg-green-100 text-green-700 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {scannedItems.length} Found
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Attributed Family Member</Label>
                  <Select value={memberId} onValueChange={setMemberId}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="General Household" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">General Household</SelectItem>
                      {members?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {scannedItems.map((item, idx) => (
                  <Card key={idx} className="p-6 rounded-3xl border-slate-100 shadow-sm relative group overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                      <div className="md:col-span-3 space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Category</Label>
                        <Select value={item.category} onValueChange={(v) => updateItem(idx, "category", v)}>
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DEFAULT_EXPENSE_CATEGORIES.map(c => (
                              <SelectItem key={c.label} value={c.label}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-4 space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Description</Label>
                        <Input 
                          value={item.description} 
                          onChange={(e) => updateItem(idx, "description", e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="md:col-span-3 space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Date Mentioned</Label>
                        <Input 
                          type="date"
                          value={formatTimestampForInput(item.date)} 
                          onChange={(e) => handleDateChange(idx, e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Amount (₹)</Label>
                        <Input 
                          type="number"
                          value={item.amount} 
                          onChange={(e) => updateItem(idx, "amount", parseFloat(e.target.value))}
                          className="h-11 rounded-xl font-bold text-primary"
                        />
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-destructive"
                      onClick={() => removeItem(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </Card>
                ))}

                <div className="pt-4 flex flex-col sm:flex-row gap-4">
                  <Button className="flex-1 h-14 rounded-2xl text-xl font-headline shadow-xl" onClick={saveAll} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <CheckCircle2 className="w-6 h-6 mr-3" />}
                    Confirm All & Save
                  </Button>
                  <Button variant="outline" className="flex-1 h-14 rounded-2xl" onClick={() => { setFile(null); setPhotoPreview(null); setScannedItems([]); }}>
                    Cancel Scan
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!preview && (
            <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex gap-4">
              <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-800">Scanning Tips</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  For handwritten notes (e.g. "500 petrol"), write clearly. The AI is now optimized to detect dates, informal scribbles and multiple items from a single shot.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
