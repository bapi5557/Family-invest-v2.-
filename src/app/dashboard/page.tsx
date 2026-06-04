
"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Wallet, CreditCard, ChevronRight, LogOut, ShieldCheck, AlertCircle, Share2, Loader2, Bell, CalendarClock, UserPlus, QrCode, Copy, Sparkles } from "lucide-react";
import Link from "next/link";
import { collection, query, where, doc, addDoc } from "firebase/firestore";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { Expense, FamilyMember, FamilySettings, Reminder, Invite } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isPast } from "date-fns";
import { useToast } from "@/hooks/use-toast";
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
import { cn } from "@/lib/utils";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const formatCurrencyVal = (val: number) => `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function DashboardPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

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
  
  const { data: settings } = useDoc<FamilySettings>(settingsRef);

  const effectiveOwnerId = settings?.familyOwnerId || user?.uid;

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !effectiveOwnerId) return null;
    return query(collection(db, "expenses"), where("ownerId", "==", effectiveOwnerId));
  }, [db, effectiveOwnerId]);

  const membersQuery = useMemoFirebase(() => {
    if (!db || !effectiveOwnerId) return null;
    return query(collection(db, "members"), where("ownerId", "==", effectiveOwnerId));
  }, [db, effectiveOwnerId]);

  const remindersQuery = useMemoFirebase(() => {
    if (!db || !effectiveOwnerId) return null;
    return query(collection(db, "reminders"), where("ownerId", "==", effectiveOwnerId));
  }, [db, effectiveOwnerId]);

  const invitesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, "invites"), where("ownerId", "==", user.uid), where("revoked", "==", false));
  }, [db, user]);

  const { data: allExpenses, loading: loadingExpenses } = useCollection<Expense>(expensesQuery);
  const { data: members, loading: loadingMembers } = useCollection<FamilyMember>(membersQuery);
  const { data: allReminders, loading: loadingReminders } = useCollection<Reminder>(remindersQuery);
  const { data: invites, loading: loadingInvites } = useCollection<Invite>(invitesQuery);

  const activeInvites = useMemo(() => {
    if (!invites) return [];
    return invites.filter(i => i.expiresAt > Date.now());
  }, [invites]);

  const totalSpent = useMemo(() => allExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0, [allExpenses]);

  const recentExpenses = useMemo(() => {
    if (!allExpenses) return [];
    return [...allExpenses].sort((a, b) => b.date - a.date).slice(0, 5);
  }, [allExpenses]);

  const upcomingReminders = useMemo(() => {
    if (!allReminders) return [];
    return [...allReminders]
      .filter(r => !r.completed)
      .sort((a, b) => a.date - b.date)
      .slice(0, 5);
  }, [allReminders]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code Copied", description: "10-digit invite code is ready to share." });
  };

  const handleGenerateCode = async () => {
    if (!db || !user) return;
    setIsGenerating(true);
    const code = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const inviteData = {
      code,
      ownerId: user.uid,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      revoked: false,
    };
    try {
      await addDoc(collection(db, "invites"), inviteData);
      toast({ title: "Invite Code Ready", description: `Your 10-digit code is: ${code}` });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'invites', operation: 'create', requestResourceData: inviteData }));
    } finally {
      setIsGenerating(false);
    }
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

      {/* ADMIN INVITE SECTION */}
      {!settings?.familyOwnerId && settings?.ownerId === user?.uid && (
        <div className="space-y-4">
          <Card className="bg-accent/5 border border-accent/20 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-accent text-lg">Family Invitation System</p>
                <p className="text-sm text-muted-foreground">Admins can generate secure 10-digit codes for instant joining.</p>
              </div>
            </div>
            {activeInvites.length === 0 ? (
              <Button onClick={handleGenerateCode} disabled={isGenerating} className="rounded-xl h-12 px-8 bg-accent hover:bg-accent/90 shadow-lg animate-pulse">
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                Generate Your First Invite Code
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="rounded-xl h-10 px-6 border-accent text-accent" asChild>
                <Link href="/dashboard/settings">Manage All Invites</Link>
              </Button>
            )}
          </Card>

          {activeInvites.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeInvites.map((invite) => (
                <Card key={invite.id} className="rounded-3xl border-none shadow-md bg-white overflow-hidden p-6 border-l-4 border-accent relative group">
                   <div className="flex items-center justify-between mb-2">
                     <span className="text-[10px] font-black uppercase tracking-widest text-accent bg-accent/10 px-2 py-1 rounded-md">Active 10-Digit Code</span>
                     <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-accent/5" onClick={() => copyCode(invite.code)}>
                        <Copy className="w-4 h-4 text-accent" />
                     </Button>
                   </div>
                   <p className="text-3xl font-code font-black text-primary tracking-[0.2em]">{invite.code}</p>
                   <p className="text-[10px] text-muted-foreground mt-2 font-medium flex items-center gap-1">
                     <CalendarClock className="w-3 h-3" /> Expires {format(invite.expiresAt, "PP")}
                   </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline text-primary">Family Overview</h1>
          <p className="text-muted-foreground text-sm font-medium">Real-time household tracking</p>
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
        <Card className="bg-primary text-white border-none shadow-xl rounded-3xl overflow-hidden transition-all hover:scale-[1.02]">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/70 uppercase tracking-widest text-[10px] font-bold">Total Family Outflow</CardDescription>
            {loadingExpenses ? <Skeleton className="h-10 w-32 bg-white/20" /> : <CardTitle className="text-4xl font-headline">{formatCurrencyVal(totalSpent)}</CardTitle>}
          </CardHeader>
          <CardContent><div className="flex items-center text-xs text-primary-foreground/80"><Wallet className="w-3.5 h-3.5 mr-1" /> Ledger Balance</div></CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-3xl transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold">Family Network</CardDescription>
            {loadingMembers ? <Skeleton className="h-8 w-16" /> : <CardTitle className="text-3xl font-headline text-primary">{members?.length || 0}</CardTitle>}
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/members" className="text-accent flex items-center text-xs font-bold hover:underline">Manage Network <ChevronRight className="w-3.5 h-3.5" /></Link>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-3xl transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-widest text-[10px] font-bold">Pending Reminders</CardDescription>
            {loadingReminders ? <Skeleton className="h-8 w-16" /> : <CardTitle className="text-3xl font-headline text-accent">{upcomingReminders.length}</CardTitle>}
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/reminders" className="text-xs text-muted-foreground hover:underline">View Timelines</Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 p-6">
            <div>
              <CardTitle className="font-headline text-2xl">Ledger Activity</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest mt-1">Recent Outflows</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-10 rounded-xl" asChild><Link href="/dashboard/expenses">All <ChevronRight className="w-4 h-4 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {loadingExpenses ? <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary/30" /></div> : 
              recentExpenses.map((expense) => (
                <Link key={expense.id} href={`/dashboard/expenses/${expense.id}`} className="flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/5 rounded-2xl group-hover:bg-primary/10 transition-colors"><CreditCard className="w-5 h-5 text-primary" /></div>
                    <div><p className="font-bold text-slate-800">{expense.category}</p><p className="text-[10px] text-muted-foreground uppercase font-medium">{format(expense.date, "PP")}</p></div>
                  </div>
                  <div className="flex items-center gap-3"><p className="font-bold text-primary text-lg">-{formatCurrencyVal(expense.amount)}</p><ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" /></div>
                </Link>
              ))
            }
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 p-6">
            <div>
              <CardTitle className="font-headline text-2xl">Family Timelines</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest mt-1">Upcoming Obligations</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-10 rounded-xl" asChild><Link href="/dashboard/reminders">All <ChevronRight className="w-4 h-4 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {loadingReminders ? <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary/30" /></div> : 
              upcomingReminders.map((reminder) => {
                const isOverdue = isPast(reminder.date);
                return (
                  <Link key={reminder.id} href="/dashboard/reminders" className="flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-3 rounded-2xl transition-colors", isOverdue ? "bg-red-50" : "bg-accent/5")}>
                        <CalendarClock className={cn("w-5 h-5", isOverdue ? "text-red-500" : "text-accent")} />
                      </div>
                      <div>
                        <p className={cn("font-bold", isOverdue ? "text-red-600" : "text-slate-800")}>{reminder.title}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">{format(reminder.date, "PP")} • {reminder.category}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                  </Link>
                );
              })
            }
            {!loadingReminders && upcomingReminders.length === 0 && (
              <div className="py-10 text-center text-slate-400 text-sm font-medium">No pending obligations.</div>
            )}
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
