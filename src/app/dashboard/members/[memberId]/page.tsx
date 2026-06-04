
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, StickyNote, CreditCard, Loader2, Edit2, Trash2, Lock, Camera } from "lucide-react";
import Link from "next/link";
import { doc, collection, query, where, deleteDoc, orderBy } from "firebase/firestore";
import { useDoc, useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { FamilyMember, Expense, FamilySettings } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function MemberProfilePage() {
  const { memberId } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pendingAction, setPendingAction] = useState<'edit' | 'delete' | null>(null);

  const memberRef = useMemoFirebase(() => {
    if (!db || !memberId) return null;
    return doc(db, "members", memberId as string);
  }, [db, memberId]);

  const settingsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "settings", user.uid);
  }, [db, user]);

  const { data: member, loading: loadingMember } = useDoc<FamilyMember>(memberRef);
  const { data: settings } = useDoc<FamilySettings>(settingsRef);

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !memberId || !user) return null;
    // CRITICAL: Queries must include the ownerId filter to satisfy security rules
    return query(
      collection(db, "expenses"),
      where("ownerId", "==", user.uid),
      where("memberId", "==", memberId as string),
      orderBy("date", "desc")
    );
  }, [db, memberId, user]);

  const { data: expenses, loading: loadingExpenses } = useCollection<Expense>(expensesQuery);

  const requestAdminAction = (action: 'edit' | 'delete') => {
    setPendingAction(action);
    setIsPinDialogOpen(true);
  };

  const handleVerifyPin = () => {
    const correctPin = settings?.adminPin || "1234";
    if (pinInput === correctPin) {
      setIsPinDialogOpen(false);
      setPinInput("");
      if (pendingAction === 'edit') {
        router.push(`/dashboard/members/${memberId}/edit`);
      } else if (pendingAction === 'delete') {
        performDelete();
      }
    } else {
      toast({ variant: "destructive", title: "Invalid PIN", description: "Access restricted to family admins." });
      setPinInput("");
    }
  };

  const performDelete = () => {
    if (!db || !memberId) return;
    const docRef = doc(db, "members", memberId as string);
    deleteDoc(docRef).catch(async () => {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: "delete",
      });
      errorEmitter.emit("permission-error", permissionError);
    });
    toast({ title: "Member Removed", description: "Profile has been deleted." });
    router.push("/dashboard/members");
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
          <Button variant="outline" size="sm" onClick={() => requestAdminAction('edit')} className="rounded-xl h-10 px-4">
            <Edit2 className="w-4 h-4 mr-2" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => requestAdminAction('delete')} className="rounded-xl h-10 px-4">
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-none shadow-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="text-center bg-slate-50 border-b p-10">
            <Avatar className="w-28 h-28 rounded-3xl mx-auto mb-6 shadow-xl border-4 border-white">
              <AvatarImage src={member.photoUrl || ""} />
              <AvatarFallback className="bg-primary text-white font-bold text-5xl flex items-center justify-center">
                {member.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <CardTitle className="font-headline text-3xl text-primary">{member.name}</CardTitle>
            <CardDescription className="flex items-center justify-center gap-2 mt-2">
              <Phone className="w-4 h-4" /> {member.phone || "No contact info"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <div className="bg-accent/5 p-6 rounded-[2rem] border border-accent/10">
              <div className="flex items-center gap-2 text-accent font-bold mb-3 text-sm uppercase tracking-wider">
                <StickyNote className="w-4 h-4" /> Member Profile
              </div>
              <p className="text-sm text-slate-600 leading-relaxed italic">
                {member.notes || "No special instructions for this member."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 border-b">
            <CardTitle className="font-headline text-2xl">Ledger History</CardTitle>
            <CardDescription>Personal outflows attributed to {member.name}</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            {expenses?.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-transparent hover:border-slate-200 transition-all hover:shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl border shadow-sm text-primary">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-lg">{expense.category}</p>
                    <p className="text-xs text-muted-foreground">{new Date(expense.date).toLocaleDateString()} — {expense.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary text-xl">₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            ))}
            {!loadingExpenses && expenses?.length === 0 && (
              <div className="text-center py-20 space-y-2">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <CreditCard className="w-8 h-8" />
                </div>
                <p className="text-muted-foreground font-medium">No activity for this member.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
        <DialogContent className="rounded-[2rem] max-w-sm">
          <DialogHeader className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="font-headline text-2xl">Admin Verify</DialogTitle>
            <DialogDescription>
              Action restricted: Enter family PIN.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Input 
              type="password" 
              placeholder="0 0 0 0" 
              maxLength={4} 
              className="text-center text-3xl tracking-[0.5em] h-16 rounded-2xl font-bold"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button className="w-full h-12 rounded-xl text-lg" onClick={handleVerifyPin}>
              Authorize
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setIsPinDialogOpen(false)}>
              Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
