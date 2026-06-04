"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Wallet, CreditCard, ChevronRight } from "lucide-react";
import Link from "next/link";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { Expense, FamilyMember } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrencyVal = (val: number) => `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function DashboardPage() {
  const { user } = useUser();
  const db = useFirestore();

  // Optimized queries with limits where possible
  const totalExpensesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "expenses"),
      where("ownerId", "==", user.uid)
    );
  }, [db, user]);

  const recentExpensesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "expenses"),
      where("ownerId", "==", user.uid),
      orderBy("date", "desc"),
      limit(10) // Limit fetching for faster initial load
    );
  }, [db, user]);

  const membersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "members"), where("ownerId", "==", user.uid));
  }, [db, user]);

  const { data: allExpenses, loading: loadingTotal } = useCollection<Expense>(totalExpensesQuery);
  const { data: recentExpenses, loading: loadingRecent } = useCollection<Expense>(recentExpensesQuery);
  const { data: members, loading: loadingMembers } = useCollection<FamilyMember>(membersQuery);

  const totalSpent = useMemo(() => {
    return allExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
  }, [allExpenses]);

  const topCategory = useMemo(() => {
    if (!allExpenses || allExpenses.length === 0) return "N/A";
    const totals: Record<string, number> = {};
    allExpenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0][0];
  }, [allExpenses]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline text-primary">Overview</h1>
          <p className="text-muted-foreground text-sm">Real-time household tracking</p>
        </div>
        <Button className="rounded-full shadow-lg h-10 px-5" asChild>
          <Link href="/dashboard/expenses/new">
            <Plus className="w-4 h-4 mr-2" /> Add Expense
          </Link>
        </Button>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary text-white border-none shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/70">Total Outflow</CardDescription>
            {loadingTotal ? (
              <Skeleton className="h-10 w-32 bg-white/20" />
            ) : (
              <CardTitle className="text-4xl font-headline">{formatCurrencyVal(totalSpent)}</CardTitle>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs text-primary-foreground/80">
              <Wallet className="w-3.5 h-3.5 mr-1" />
              <span>INR Currency</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>Family Members</CardDescription>
            {loadingMembers ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <CardTitle className="text-3xl font-headline">{members?.length || 0}</CardTitle>
            )}
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/members" className="text-accent flex items-center text-xs font-semibold hover:underline">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription>Major Expense</CardDescription>
            {loadingTotal ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <CardTitle className="text-3xl font-headline">{topCategory}</CardTitle>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">Highest allocation</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-headline text-xl">Recent Activity</CardTitle>
              <CardDescription className="text-xs">Last 10 transactions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
               <Link href="/dashboard/reports">All Reports</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingRecent ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))
            ) : (
              recentExpenses?.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-xs">
                      <CreditCard className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{expense.category}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{new Date(expense.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="font-bold text-sm text-primary">-{formatCurrencyVal(expense.amount)}</p>
                </div>
              ))
            )}
            {!loadingRecent && recentExpenses?.length === 0 && (
              <div className="text-center py-10 space-y-3 border-2 border-dashed rounded-2xl">
                <p className="text-xs text-muted-foreground">No recent activity detected.</p>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/expenses/new">Add first</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Quick Profiles</CardTitle>
            <CardDescription className="text-xs">Family shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
             {loadingMembers ? (
               Array.from({ length: 3 }).map((_, i) => (
                 <div key={i} className="flex items-center justify-between p-3">
                   <div className="flex items-center gap-3">
                     <Skeleton className="w-10 h-10 rounded-lg" />
                     <div className="space-y-2">
                       <Skeleton className="h-4 w-28" />
                       <Skeleton className="h-3 w-20" />
                     </div>
                   </div>
                   <Skeleton className="h-4 w-4" />
                 </div>
               ))
             ) : (
               members?.slice(0, 5).map((member) => (
                <Link key={member.id} href={`/dashboard/members/${member.id}`} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{member.phone || 'No Contact'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))
            )}
            
            {!loadingMembers && members?.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">No profiles saved.</p>
            )}

            <Button variant="outline" className="w-full border-dashed rounded-xl h-10 mt-2" asChild>
              <Link href="/dashboard/members/new">
                <Plus className="w-4 h-4 mr-2" /> Add Member
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
