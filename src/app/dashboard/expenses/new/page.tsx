
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
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { collection, addDoc, query, where } from "firebase/firestore";
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { EXPENSE_CATEGORIES, ExpenseCategory, FamilyMember } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function NewExpensePage() {
  const [category, setCategory] = useState<ExpenseCategory>("Other");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [memberId, setMemberId] = useState("unassigned");
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const membersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "members"), where("ownerId", "==", user.uid));
  }, [db, user]);

  const { data: members } = useCollection<FamilyMember>(membersQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;

    const expenseData = {
      category,
      amount: parseFloat(amount),
      description,
      memberId: memberId === "unassigned" ? null : memberId,
      date: Date.now(),
      ownerId: user.uid,
      createdAt: Date.now(),
    };

    // Non-blocking write for immediate UI responsiveness
    addDoc(collection(db, "expenses"), expenseData)
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: "expenses",
          operation: "create",
          requestResourceData: expenseData,
        });
        errorEmitter.emit("permission-error", permissionError);
      });

    toast({ title: "Expense Recorded", description: "The transaction has been added to your dashboard." });
    router.push("/dashboard");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Link>

      <Card className="rounded-[2rem] shadow-xl overflow-hidden border-none">
        <CardHeader className="bg-accent text-white p-8">
          <CardTitle className="text-2xl font-headline">Add Expense</CardTitle>
          <CardDescription className="text-accent-foreground/80">Record a new household cost</CardDescription>
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
                <Label htmlFor="amount" className="text-sm font-semibold">Amount ($)</Label>
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

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Family Member (Optional)</Label>
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

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
              <Textarea 
                id="description" 
                placeholder="e.g., Weekly grocery run"
                className="min-h-[100px] rounded-xl"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 h-12 text-lg rounded-xl shadow-lg">
                <Save className="w-5 h-5 mr-2" />
                Add Expense
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
