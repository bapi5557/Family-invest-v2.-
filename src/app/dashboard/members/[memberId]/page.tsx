
"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, StickyNote, CreditCard, Loader2, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";
import { doc, collection, query, where, deleteDoc, orderBy } from "firebase/firestore";
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { FamilyMember, Expense } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function MemberProfilePage() {
  const { memberId } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();

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
        .then(() => router.push("/dashboard/members"))
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: "delete",
          });
          errorEmitter.emit("permission-error", permissionError);
        });
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
      <div className="text-center py-20">
        <p className="text-muted-foreground">Member not found.</p>
        <Button variant="link" asChild>
          <Link href="/dashboard/members">Back to Network</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/members" className="flex items-center text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Network
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/members/${memberId}/edit`}>
              <Edit2 className="w-4 h-4 mr-2" /> Edit
            </Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <div className="w-24 h-24 rounded-3xl bg-primary/10 text-primary flex items-center justify-center font-bold text-4xl mx-auto mb-4">
              {member.name.charAt(0)}
            </div>
            <CardTitle className="font-headline text-2xl">{member.name}</CardTitle>
            <CardDescription className="flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" /> {member.phone}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border">
              <div className="flex items-center gap-2 text-primary font-semibold mb-2 text-sm">
                <StickyNote className="w-4 h-4" /> Member Notes
              </div>
              <p className="text-sm text-muted-foreground italic">
                {member.notes || "No notes provided for this member."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Expense History</CardTitle>
            <CardDescription>Personal spending attributed to {member.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {expenses?.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg border shadow-sm">
                    <CreditCard className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{expense.category}</p>
                    <p className="text-xs text-muted-foreground">{new Date(expense.date).toLocaleDateString()} - {expense.description}</p>
                  </div>
                </div>
                <p className="font-bold text-primary">-${expense.amount.toFixed(2)}</p>
              </div>
            ))}
            {!loadingExpenses && expenses?.length === 0 && (
              <p className="text-center py-10 text-sm text-muted-foreground">No expenses recorded for this member.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
