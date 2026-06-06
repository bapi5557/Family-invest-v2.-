
"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Tag, CreditCard, Loader2, Edit2, Trash2, StickyNote, User } from "lucide-react";
import Link from "next/link";
import { doc, deleteDoc } from "firebase/firestore";
import { useDoc, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { Expense, FamilyMember, FamilySettings } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useToast } from "@/hooks/use-toast";
import { createNotification } from "@/lib/notifications-service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ExpenseDetailPage() {
  const { expenseId } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const settingsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "settings", user.uid);
  }, [db, user]);
  
  const { data: settings } = useDoc<FamilySettings>(settingsRef);
  const effectiveOwnerId = settings?.familyOwnerId || user?.uid;

  const expenseRef = useMemoFirebase(() => {
    if (!db || !expenseId) return null;
    return doc(db, "expenses", expenseId as string);
  }, [db, expenseId]);

  const { data: expense, loading: loadingExpense } = useDoc<Expense>(expenseRef);

  const memberRef = useMemoFirebase(() => {
    if (!db || !expense?.memberId) return null;
    return doc(db, "members", expense.memberId);
  }, [db, expense?.memberId]);

  const { data: member } = useDoc<FamilyMember>(memberRef);

  const handleDelete = () => {
    if (!db || !expenseId || !user || !effectiveOwnerId || !expense) return;
    
    const docRef = doc(db, "expenses", expenseId as string);
    const category = expense.category;
    const amount = expense.amount;
    
    deleteDoc(docRef)
      .then(() => {
        const memberName = user.displayName || "Family Member";
        createNotification(
          db, 
          effectiveOwnerId, 
          `${memberName} deleted a transaction: ₹${amount.toLocaleString('en-IN')} for ${category}`,
          'expense',
          "",
          user.uid,
          memberName,
          user.photoURL || ""
        );
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: "delete",
        });
        errorEmitter.emit("permission-error", permissionError);
      });

    toast({ title: "Expense Deleted", description: "Transaction removed from history." });
    router.push("/dashboard");
  };

  if (loadingExpense) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="text-center py-20 animate-in fade-in">
        <p className="text-muted-foreground">Expense record not found.</p>
        <Button variant="link" asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Activity
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="rounded-xl">
            <Link href={`/dashboard/expenses/${expenseId}/edit`}>
              <Edit2 className="w-4 h-4 mr-2" /> Edit
            </Link>
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="rounded-xl">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This transaction will be permanently removed from your records.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete Permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-primary text-white p-8 text-center relative">
          <CardDescription className="text-primary-foreground/70 uppercase tracking-widest text-[10px] font-bold">Transaction Detail</CardDescription>
          <CardTitle className="text-5xl font-headline mt-2">
            ₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </CardTitle>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-sm font-medium backdrop-blur-sm">
            <Tag className="w-4 h-4" /> {expense.category}
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Date of Expense</p>
              <div className="flex items-center gap-3 text-slate-700 font-semibold">
                <Calendar className="w-5 h-5 text-primary" />
                {new Date(expense.date).toLocaleDateString('en-IN', { dateStyle: 'long' })}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Associated Member</p>
              <div className="flex items-center gap-3 text-slate-700 font-semibold">
                <User className="w-5 h-5 text-accent" />
                {member ? (
                  <Link href={`/dashboard/members/${member.id}`} className="hover:text-accent transition-colors underline decoration-dotted">
                    {member.name}
                  </Link>
                ) : "General Household"}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Notes & Description</p>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex gap-4">
              <StickyNote className="w-6 h-6 text-slate-300 shrink-0" />
              <p className="text-slate-600 italic leading-relaxed">
                {expense.description || "No specific details recorded for this transaction."}
              </p>
            </div>
          </div>
          
          <div className="pt-4 flex justify-center">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest bg-slate-100 px-4 py-1 rounded-full">
              <CreditCard className="w-3 h-3" /> Recorded on {new Date(expense.createdAt).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
