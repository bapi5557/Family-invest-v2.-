
"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Wallet, CreditCard, ChevronRight, LogOut, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";
import { collection, query, where, doc } from "firebase/firestore";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { Expense, FamilyMember, FamilySettings } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const formatCurrencyVal = (val: number) => `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function DashboardPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

  useEffect(() => {
    window.history.pushState({ dashboard: true }, "");

    const handlePopState = (event: PopStateEvent) => {
      setIsExitDialogOpen(true);
      window.history.pushState({ dashboard: true }, "");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const settingsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "settings", user.uid);
  }, [db, user]);
  const { data: settings, error: settingsError } = useDoc<FamilySettings>(settingsRef);

  // Optimized query: Fetch all expenses for the family owner. 
  // We handle sorting and limiting in memory to avoid composite index requirements.
  const totalExpensesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "expenses"),
      where("ownerId", "==", user.uid)
    );
  }, [db, user]);

  const membersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "members"), where("ownerId", "==", user.uid));
  }, [db, user]);

  const { data: allExpenses, loading: loadingExpenses } = useCollection<Expense>(totalExpensesQuery);
  const { data: members, loading: loadingMembers } = useCollection<FamilyMember>(membersQuery);

  const totalSpent = useMemo(() => {
    return allExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
  }, [allExpenses]);

  // Derive recent expenses in memory to avoid Firestore Index requirement
  const recentExpenses = useMemo(() => {
    if (!allExpenses) return [];
    return [...allExpenses]
      .sort((a, b) => b.date - a.date)
      .slice(0, 10);
  }, [allExpenses]);

  const topCategory = useMemo(() => {
    if (!allExpenses || allExpenses.length === 0) return "N/A";
    const totals: Record<string, number> = {};
    allExpenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
  }, [allExpenses]);

  const handleExitApp = () => {
    window.location.href = "about:blank"; 
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {settings && (
        <Alert className="bg-green-50 border-green-200 text-green-700 rounded-2xl animate-in slide-in-from-top duration-500">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            Cloud Sync Active: {settings.familyName || 'Family Ledger'} Connected
          </AlertDescription>
        </Alert>
      )}
      {settingsError && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-xs font-bold">
            Cloud Connection Error: Please verify family permissions for project studio-7478833500-c0c46.
          </AlertDescription>
        </Alert>
      )}

      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline text-primary">Family Overview</h1>
          <p className="text-muted-foreground text-sm font-medium">Synced across all family devices</p>
        </div>
        <Button className="rounded-full shadow-lg h-12 px-6" asChild>
          <Link href="/dashboard/expenses/new">
            <Plus className="w-4 h-4 mr-2" /> Add Expense
          </Link>
        </Button>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary text-white border-none shadow-xl rounded-3xl overflow-hidden transition-all hover:scale-[1.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/70 uppercase tracking-widest text-[10px] font-bold">Total Family Spent</CardDescription>
            {loadingExpenses ? (
              <Skeleton className="h-10 w-32 bg-white/20" />
            ) : (
              <CardTitle className="text-4xl font-headline">{formatCurrencyVal(totalSpent)}</CardTitle>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-primary-foreground/80">
              <Wallet className="w-3.5 h-3.5 mr-1" />
              <span>Real-time Cloud Ledger</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-3xl transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold">Active Members</CardDescription>
            {loadingMembers ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <CardTitle className="text-3xl font-headline text-primary">{members?.length || 0}</CardTitle>
            )}
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/members" className="text-accent flex items-center text-xs font-bold hover:underline">
              Manage Network <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-3xl transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold">Main Outflow</CardDescription>
            {loadingExpenses ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <CardTitle className="text-3xl font-headline text-accent">{topCategory}</CardTitle>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Highest allocation</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 p-6">
            <div>
              <CardTitle className="font-headline text-2xl">Shared Ledger</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest mt-1">Last 10 transactions</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="h-10 rounded-xl" asChild>
               <Link href="/dashboard/reports">View Full Analysis</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {loadingExpenses ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))
            ) : (
              recentExpenses.map((expense) => (
                <Link key={expense.id} href={`/dashboard/expenses/${expense.id}`} className="flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/5 rounded-2xl group-hover:bg-primary/10 transition-colors">
                      <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{expense.category}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">{new Date(expense.date).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-primary text-lg">-{formatCurrencyVal(expense.amount)}</p>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))
            )}
            {!loadingExpenses && recentExpenses.length === 0 && (
              <div className="text-center py-16 space-y-4 border-2 border-dashed rounded-3xl border-slate-100">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                   <CreditCard className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 font-bold">No activity detected yet.</p>
                  <p className="text-xs text-muted-foreground">Any family member can record expenses.</p>
                </div>
                <Button size="sm" variant="outline" className="rounded-xl h-10 px-6" asChild>
                  <Link href="/dashboard/expenses/new">Add First Expense</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 p-6">
            <CardTitle className="font-headline text-2xl">Family Shortcuts</CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest mt-1">Quick profile access</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
             {loadingMembers ? (
               Array.from({ length: 3 }).map((_, i) => (
                 <div key={i} className="flex items-center justify-between p-4">
                   <div className="flex items-center gap-3">
                     <Skeleton className="w-12 h-12 rounded-2xl" />
                     <div className="space-y-2">
                       <Skeleton className="h-4 w-28" />
                       <Skeleton className="h-3 w-20" />
                     </div>
                   </div>
                   <Skeleton className="h-4 w-4" />
                 </div>
               ))
             ) : (
               members?.slice(0, 6).map((member) => (
                <Link key={member.id} href={`/dashboard/members/${member.id}`} className="flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm">
                      <AvatarImage src={member.photoUrl || ""} className="object-cover" />
                      <AvatarFallback className="bg-accent text-white font-bold text-lg">
                        {member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-slate-800">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">{member.phone || 'Personal Ledger'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-accent transition-colors" />
                </Link>
              ))
            )}
            
            {!loadingMembers && members?.length === 0 && (
              <div className="text-center py-16 space-y-4 border-2 border-dashed rounded-3xl border-slate-100">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                   <Users className="w-8 h-8" />
                </div>
                <p className="text-slate-500 font-bold">Your family network is empty.</p>
              </div>
            )}

            <Button variant="outline" className="w-full border-dashed rounded-2xl h-14 mt-4 text-slate-500 hover:text-primary transition-colors" asChild>
              <Link href="/dashboard/members/new">
                <Plus className="w-5 h-5 mr-3" /> Add Family Member
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-2xl">Exit KinVest?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-slate-500">
              Are you sure you want to close the shared family dashboard? Your session will remain active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl h-12 flex-1">Stay Here</AlertDialogCancel>
            <AlertDialogAction onClick={handleExitApp} className="rounded-xl h-12 flex-1 shadow-lg">Exit App</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
