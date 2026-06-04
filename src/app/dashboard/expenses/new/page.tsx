
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { collection, addDoc } from "firebase/firestore";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { EXPENSE_CATEGORIES, ExpenseCategory, FamilyMember } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { query, where } from "firebase/firestore";

export default function NewExpensePage() {
  const [category, setCategory] = useState<ExpenseCategory>("Other");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [memberId, setMemberId] = useState("unassigned");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const membersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "members"), where("ownerId", "==", user.uid));
  }, [db, user]);

  const { data: members, loading: loadingMembers } = useCollection<FamilyMember>(membersQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;

    setIsSubmitting(true);

    const expenseData = {
      category,
      amount: parseFloat(amount),
      description: description.trim(),
      memberId: memberId === "unassigned" ? null : memberId,
      date: Date.now(),
      ownerId: user.uid,
      createdAt: Date.now(),
    };

    // FAST NON-BLOCKING CLOUD SAVE
    addDoc(collection(db, "expenses"), expenseData)
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: "expenses",
          operation: "create",
          requestResourceData: expenseData,
        });
        errorEmitter.emit("permission-error", permissionError);
      });

    toast({ 
      title: "Transaction Recorded", 
      description: `₹${parseFloat(amount).toLocaleString('en-IN')} added to your shared family ledger.` 
    });
    router.push("/dashboard");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Link href="/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Link>

      <Card className="rounded-[2.5rem] shadow-2xl overflow-hidden border-none">
        <CardHeader className="bg-accent text-white p-10">
          <CardTitle className="text-3xl font-headline tracking-tight">Record Expense</CardTitle>
          <CardDescription className="text-accent-foreground/80 font-medium">Add to the family's shared ledger in real-time.</CardDescription>
        </CardHeader>
        <CardContent className="p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Transaction Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                  <SelectTrigger className="h-14 rounded-2xl border-slate-200 font-medium text-lg">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="rounded-xl h-12">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs font-black uppercase tracking-widest text-slate-400">Amount (₹)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  step="0.01" 
                  required 
                  placeholder="0.00"
                  className="h-14 rounded-2xl border-slate-200 text-2xl font-bold text-accent shadow-sm"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Associated Member (Optional)</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger className="h-14 rounded-2xl border-slate-200 font-medium text-lg">
                  <SelectValue placeholder="General Household" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="unassigned" className="rounded-xl h-12">General Household</SelectItem>
                  {members?.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="rounded-xl h-12">{m.name}</SelectItem>
                  ))}
                  {loadingMembers && <div className="p-4 text-center"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading members...</div>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-slate-400">Description / Details</Label>
              <Textarea 
                id="description" 
                placeholder="e.g., Weekly grocery stock from BigBasket"
                className="min-h-[120px] rounded-2xl border-slate-200 text-base shadow-sm p-4 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button type="submit" className="flex-1 h-14 text-xl font-headline rounded-2xl shadow-xl bg-accent hover:bg-accent/90" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Save className="w-6 h-6 mr-3" />}
                {isSubmitting ? "Syncing..." : "Record Transaction"}
              </Button>
              <Button type="button" variant="outline" className="flex-1 h-14 rounded-2xl text-lg border-slate-200" asChild disabled={isSubmitting}>
                <Link href="/dashboard">Discard</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
