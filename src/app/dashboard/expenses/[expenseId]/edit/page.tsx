"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { doc, updateDoc, collection, query, where } from "firebase/firestore";
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { EXPENSE_CATEGORIES, ExpenseCategory, Expense, FamilyMember } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function EditExpensePage() {
  const { expenseId } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [category, setCategory] = useState<ExpenseCategory>("Other");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [memberId, setMemberId] = useState("unassigned");
  const [dateStr, setDateStr] = useState("");

  const expenseRef = useMemoFirebase(() => {
    if (!db || !expenseId) return null;
    return doc(db, "expenses", expenseId as string);
  }, [db, expenseId]);

  const { data: expense, loading: loadingExpense } = useDoc<Expense>(expenseRef);

  const membersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "members"), where("ownerId", "==", user.uid));
  }, [db, user]);

  const { data: members } = useCollection<FamilyMember>(membersQuery);

  useEffect(() => {
    if (expense) {
      setCategory(expense.category);
      setAmount(expense.amount.toString());
      setDescription(expense.description);
      setMemberId(expense.memberId || "unassigned");
      setDateStr(new Date(expense.date).toISOString().split('T')[0]);
    }
  }, [expense]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !expenseId) return;

    const updateData = {
      category,
      amount: parseFloat(amount),
      description,
      memberId: memberId === "unassigned" ? null : memberId,
      date: new Date(dateStr).getTime(),
    };

    const docRef = doc(db, "expenses", expenseId as string);

    // NON-BLOCKING for speed
    updateDoc(docRef, updateData)
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: "update",
          requestResourceData: updateData,
        });
        errorEmitter.emit("permission-error", permissionError);
      });

    toast({ title: "Expense Updated Successfully", description: "All changes saved instantly." });
    router.push(`/dashboard/expenses/${expenseId}`);
  };

  if (loadingExpense) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Link href={`/dashboard/expenses/${expenseId}`} className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Link>

      <Card className="rounded-[2rem] shadow-xl overflow-hidden border-none">
        <CardHeader className="bg-accent text-white p-8">
          <CardTitle className="text-2xl font-headline">Edit Transaction</CardTitle>
          <CardDescription className="text-accent-foreground/80">Modify expense details</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-semibold">Amount (₹)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  step="0.01" 
                  required 
                  className="h-12 rounded-xl"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-semibold">Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  required 
                  className="h-12 rounded-xl"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Family Member</Label>
                <Select value={memberId} onValueChange={setMemberId}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Associate with member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">General Household</SelectItem>
                    {members?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">Description / Notes</Label>
              <Textarea 
                id="description" 
                placeholder="Details about this purchase..."
                className="min-h-[100px] rounded-xl"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 h-12 text-lg rounded-xl shadow-lg">
                <Save className="w-5 h-5 mr-2" />
                Save Changes
              </Button>
              <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" asChild>
                <Link href={`/dashboard/expenses/${expenseId}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}