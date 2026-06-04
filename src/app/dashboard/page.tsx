
"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Wallet, CreditCard, ChevronRight, LogOut, ShieldCheck, AlertCircle, Share2 } from "lucide-react";
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

  const totalExpensesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "expenses"), where("ownerId", "==", user.uid));
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

      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline text-primary">Family Overview</h1>
          <p className="text-muted-foreground text-sm font-medium">Secured with 256-bit encryption</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full h-12 px-6" asChild>
            <Link href="/dashboard/expenses">
              <CreditCard className="w-4 h-4 mr-2" /> All Expenses
            </Link>
          </Button>
          <Button className="rounded-full shadow-lg h-12 px-6" asChild>
            <Link href="/dashboard/expenses/new">
              <Plus className="w-4 h-4 mr-2" /> Record New
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary text-white border-none shadow-xl rounded-3xl overflow-hidden transition-all hover:scale-[1.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/70 uppercase tracking-widest text-[10px] font-bold">Net Family Outflow</CardDescription>
            {loadingExpenses ? (
              <Skeleton className="h-10 w-32 bg-white/20" />
            ) : (
              <CardTitle className="text-4xl font-headline">{formatCurrencyVal(totalSpent)}</CardTitle>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-primary-foreground/80">
              <Wallet className="w-3.5 h-3.5 mr-1" />
              <span>Synced Ledger</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-3xl transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold">Family Members</CardDescription>
            {loadingMembers ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <CardTitle className="text-3xl font-headline text-primary">{members?.length || 0}</CardTitle>
            )}
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/members" className="text-accent flex items-center text-xs font-bold hover:underline">
              Manage Access <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-3xl transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold">Top Expense</CardDescription>
            {loadingExpenses ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <CardTitle className="text-3xl font-headline text-accent">{topCategory}</CardTitle>
            )}
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/reports" className="text-xs text-muted-foreground hover:underline">Full Analytics Dashboard</Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 p-6">
            <div>
              <CardTitle className="font-headline text-2xl">Ledger Activity</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest mt-1">Real-time Cloud Stream</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-10 rounded-xl" asChild>
               <Link href="/dashboard/expenses">See All <ChevronRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {loadingExpenses ? (
              <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary/30" /></div>
            ) : (
              recentExpenses.map((expense) => (
                <Link key={expense.id} href={`/dashboard/expenses/${expense.id}`} className="flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/5 rounded-2xl group-hover:bg-primary/10 transition-colors">
                      <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{expense.category}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">{new Date(expense.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-primary text-lg">-{formatCurrencyVal(expense.amount)}</p>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 p-6">
            <CardTitle className="font-headline text-2xl">Quick Export</CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest mt-1">Share financial data</CardDescription>
          </CardHeader>
          <CardContent className="p-8 flex flex-col items-center justify-center space-y-4">
             <div className="w-20 h-20 bg-accent/10 rounded-[2rem] flex items-center justify-center text-accent mb-2">
                <Share2 className="w-10 h-10" />
             </div>
             <p className="text-center text-slate-500 text-sm max-w-[200px]">
               Generate and share your family's financial reports in PDF or CSV format instantly.
             </p>
             <Button className="rounded-2xl h-14 w-full shadow-lg" asChild>
               <Link href="/dashboard/expenses">Open Share Menu</Link>
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
