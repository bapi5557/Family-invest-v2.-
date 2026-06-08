"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, CreditCard, ChevronRight, ShieldCheck, Loader2, Bell, X, Trash2, PieChart, User, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { collection, query, where, doc, limit, updateDoc, arrayUnion, deleteDoc } from "firebase/firestore";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { Expense, FamilyMember, FamilySettings, Reminder, FamilyNotification } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
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
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DailySpendingAnalytics } from "@/components/DailySpendingAnalytics";
import { cn } from "@/lib/utils";

const formatCurrencyVal = (val: number) => `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function DashboardPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

  useEffect(() => {
    window.history.pushState({ dashboard: true }, "");
    const handlePopState = () => {
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
  
  const { data: settings, loading: loadingSettings } = useDoc<FamilySettings>(settingsRef);
  const effectiveOwnerId = settings?.familyOwnerId || user?.uid;
  const isAdmin = user?.uid === effectiveOwnerId;

  const allExpensesQuery = useMemoFirebase(() => {
    if (!db || !effectiveOwnerId || loadingSettings) return null;
    return query(collection(db, "expenses"), where("ownerId", "==", effectiveOwnerId));
  }, [db, effectiveOwnerId, loadingSettings]);

  const membersQuery = useMemoFirebase(() => {
    if (!db || !effectiveOwnerId || loadingSettings) return null;
    return query(collection(db, "members"), where("ownerId", "==", effectiveOwnerId));
  }, [db, effectiveOwnerId, loadingSettings]);

  const upcomingRemindersQuery = useMemoFirebase(() => {
    if (!db || !effectiveOwnerId || loadingSettings) return null;
    return query(
      collection(db, "reminders"), 
      where("ownerId", "==", effectiveOwnerId),
      where("completed", "==", false),
      limit(5)
    );
  }, [db, effectiveOwnerId, loadingSettings]);

  const notificationsQuery = useMemoFirebase(() => {
    if (!db || !effectiveOwnerId || loadingSettings) return null;
    return query(
      collection(db, "notifications"),
      where("ownerId", "==", effectiveOwnerId),
      limit(50)
    );
  }, [db, effectiveOwnerId, loadingSettings]);

  const { data: allExpenses, loading: loadingExp } = useCollection<Expense>(allExpensesQuery);
  const { data: members, loading: loadingMembers } = useCollection<FamilyMember>(membersQuery);
  const { data: upcomingReminders, loading: loadingReminders } = useCollection<Reminder>(upcomingRemindersQuery);
  const { data: rawNotifications, loading: loadingNotifications } = useCollection<FamilyNotification>(notificationsQuery);

  const notifications = useMemo(() => {
    if (!rawNotifications || !user) return [];
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    return [...rawNotifications]
      .filter(n => !n.hiddenBy?.includes(user.uid) && n.timestamp > ninetyDaysAgo)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  }, [rawNotifications, user]);

  const totalSpent = useMemo(() => allExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0, [allExpenses]);

  const categoryBreakdown = useMemo(() => {
    if (!allExpenses || allExpenses.length === 0) return [];
    const totals: Record<string, number> = {};
    allExpenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return Object.entries(totals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [allExpenses, totalSpent]);

  const hideNotification = (id: string) => {
    if (!db || !user) return;
    const nRef = doc(db, "notifications", id);
    updateDoc(nRef, {
      hiddenBy: arrayUnion(user.uid)
    });
    toast({ title: "Dismissed", description: "Activity hidden from your view." });
  };

  const deleteNotification = (id: string) => {
    if (!db || !isAdmin) return;
    const nRef = doc(db, "notifications", id);
    deleteDoc(nRef);
    toast({ variant: "destructive", title: "Deleted", description: "Removed for the entire family." });
  };

  const handleExitApp = () => { window.location.href = "about:blank"; };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {settings && (
        <Alert className="bg-green-50 border-green-200 text-green-700 rounded-2xl animate-in slide-in-from-top duration-500">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            Family Database: {settings.familyName || 'Shared Ledger'} Synchronized
          </AlertDescription>
        </Alert>
      )}

      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline text-primary">Family Overview</h1>
          <p className="text-muted-foreground text-sm font-medium">Real-time household tracking (₹ INR)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full h-12 px-6" asChild>
            <Link href="/dashboard/reminders">
              <Bell className="w-4 h-4 mr-2" /> Reminders
            </Link>
          </Button>
          <Button className="rounded-full shadow-lg h-12 px-6" asChild>
            <Link href="/dashboard/expenses/new">
              <Plus className="w-4 h-4 mr-2" /> Record Expense
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary text-white border-none shadow-xl rounded-3xl overflow-hidden transition-all hover:scale-[1.01]">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/70 uppercase tracking-widest text-[10px] font-bold">Total Family Outflow</CardDescription>
            <CardTitle className="text-4xl font-headline">
              {allExpenses ? formatCurrencyVal(totalSpent) : <Skeleton className="h-10 w-32 bg-white/20" />}
            </CardTitle>
          </CardHeader>
          <CardContent><div className="flex items-center text-xs text-primary-foreground/80"><Wallet className="w-3.5 h-3.5 mr-1" /> Ledger Balance</div></CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-3xl">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold">Family Network</CardDescription>
            {loadingMembers ? <Skeleton className="h-8 w-16" /> : <CardTitle className="text-3xl font-headline text-primary">{members?.length || 0}</CardTitle>}
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/members" className="text-accent flex items-center text-xs font-bold hover:underline">Manage Network <ChevronRight className="w-3.5 h-3.5" /></Link>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-3xl">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold">Upcoming Obligations</CardDescription>
            {loadingReminders ? <Skeleton className="h-8 w-16" /> : <CardTitle className="text-3xl font-headline text-accent">{upcomingReminders?.length || 0}</CardTitle>}
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/reminders" className="text-xs text-muted-foreground hover:underline">View Timelines</Link>
          </CardContent>
        </Card>
      </div>

      <DailySpendingAnalytics expenses={allExpenses || []} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 p-6">
            <div>
              <CardTitle className="font-headline text-2xl">Family Activity</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest mt-1">Recent Notifications</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-10 rounded-xl" asChild><Link href="/dashboard/expenses">More <ChevronRight className="w-4 h-4 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {loadingNotifications ? <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary/30" /></div> : 
              notifications.length === 0 ? <div className="p-10 text-center text-slate-400 font-medium">No recent family activity recorded.</div> :
              notifications.map((n) => (
                <div key={n.id} className="flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group relative">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-10 h-10 rounded-xl">
                      <AvatarImage src={n.memberPhoto} />
                      <AvatarFallback className={cn(
                        "rounded-xl",
                        n.type === 'expense' ? "bg-red-50 text-red-500" : 
                        n.type === 'member' ? "bg-blue-50 text-blue-500" : 
                        "bg-amber-50 text-amber-500"
                      )}>
                        {n.memberName?.charAt(0) || <Sparkles className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                          {n.memberName || "System"}
                        </span>
                        <span className="text-slate-200 text-[10px]">•</span>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">{format(n.timestamp, "MMM d, p")}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => hideNotification(n.id)}>
                      <X className="w-4 h-4 text-slate-400" />
                    </Button>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => deleteNotification(n.id)}>
                        <Trash2 className="w-4 h-4 text-red-300" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            }
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="p-6 border-b bg-slate-50/50">
            <CardTitle className="font-headline text-2xl flex items-center gap-2">
              <PieChart className="w-5 h-5 text-accent" /> Household Spending Breakdown
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest mt-1">All Recorded Outflows</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] p-8">
              <div className="space-y-6">
                {categoryBreakdown.length > 0 ? (
                  categoryBreakdown.map((item) => (
                    <div key={item.category} className="space-y-2">
                      <div className="flex justify-between text-sm items-center">
                        <span className="font-bold text-slate-700">{item.category}</span>
                        <span className="font-mono text-muted-foreground">₹{item.amount.toLocaleString('en-IN')} — {item.percentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={item.percentage} className="h-2 rounded-full bg-slate-100" />
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-400 font-medium">No spending data to visualize.</div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-2xl">Exit KinVest?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-slate-500">Are you sure you want to close the shared family dashboard?</AlertDialogDescription>
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
