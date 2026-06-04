"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, StickyNote, CreditCard, Loader2, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";
import { doc, collection, query, where, deleteDoc, orderBy } from "firebase/firestore";
import { useDoc, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { FamilyMember, Expense } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useToast } from "@/hooks/use-toast";

export default function MemberProfilePage() {
  const { memberId } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();

  const memberRef = useMemoFirebase(() => {
    if (!db || !memberId) return null;
    return doc(db, "members", memberId as string);
  }, [db, memberId]);

  const { data: member, loading: loadingMember } = useDoc<FamilyMember>(memberRef);

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !memberId) return null;
    return query(
      collection(db, "expenses"),
      where("memberId", "==", memberId),
      orderBy("date", "desc")
    );
  }, [db, memberId]);

  const { data: expenses, loading: loadingExpenses } = useCollection<Expense>(expensesQuery);

  const handleDelete = () => {
    if (!db || !memberId) return;
    if (confirm("Are you sure you want to delete this member?")) {
      const docRef = doc(db, "members", memberId as string);
      
      deleteDoc(docRef)
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: "delete",
          });
          errorEmitter.emit("permission-error", permissionError);
        });

      toast({ title: "Member Removed", description: "The profile has been deleted." });
      router.push("/dashboard/members");
    }
  };

  if (loadingMember) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-20 animate-in fade-in">
        <p className="text-muted-foreground">Member not found.</p>
        <Button variant="link" asChild>
          <Link href="/dashboard/members">Back to Network</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/members" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Network
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="rounded-xl">
            <Link href={`/dashboard/members/${memberId}/edit`}>
              <Edit2 className="w-4 h-4 mr-2" /> Edit
            </Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} className="rounded-xl">
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-none shadow-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="text-center bg-slate-50 border-b p-8">
            <div className="w-24 h-24 rounded-3xl bg-primary text-white flex items-center justify-center font-bold text-4xl mx-auto mb-4 shadow-lg">
              {member.name.charAt(0)}
            </div>
            <CardTitle className="font-headline text-3xl text-primary">{member.name}</CardTitle>
            <CardDescription className="flex items-center justify-center gap-2 mt-2">
              <Phone className="w-4 h-4" /> {member.phone || "No phone added"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <div className="bg-accent/5 p-6 rounded-2xl border border-accent/10">
              <div className="flex items-center gap-2 text-accent font-bold mb-3 text-sm uppercase tracking-wider">
                <StickyNote className="w-4 h-4" /> Member Notes
              </div>
              <p className="text-sm text-slate-600 leading-relaxed italic">
                {member.notes || "No additional notes provided for this member."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="p-8 border-b">
            <CardTitle className="font-headline text-2xl">Expense History</CardTitle>
            <CardDescription>Personal spending attributed to {member.name}</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            {expenses?.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-transparent hover:border-slate-200 transition-all hover:shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white rounded-xl border shadow-sm text-primary">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{expense.category}</p>
                    <p className="text-xs text-muted-foreground">{new Date(expense.date).toLocaleDateString()} — {expense.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary text-lg">-₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            ))}
            {!loadingExpenses && expenses?.length === 0 && (
              <div className="text-center py-16 space-y-2">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <CreditCard className="w-8 h-8" />
                </div>
                <p className="text-muted-foreground font-medium">No expenses recorded yet.</p>
                <Button variant="link" asChild>
                  <Link href="/dashboard/expenses/new">Record first expense</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}