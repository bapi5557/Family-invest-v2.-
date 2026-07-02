"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, ArrowLeft, Loader2, Share2, Filter, Wallet, ArrowUpRight, Camera, Calendar } from "lucide-react";
import Link from "next/link";
import { collection, query, where, doc } from "firebase/firestore";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { Expense, Income, FamilySettings, getCategoryIcon } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { ShareExpensesDialog } from "@/components/ShareExpensesDialog";
import { format } from "date-fns";

export default function AllExpensesPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isShareOpen, setIsShareOpen] = useState(false);

  const settingsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "settings", user.uid);
  }, [db, user]);

  const { data: settings, loading: loadingSettings } = useDoc<FamilySettings>(settingsRef);
  const effectiveOwnerId = settings?.familyOwnerId || user?.uid;

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !effectiveOwnerId) return null;
    return query(collection(db, "expenses"), where("ownerId", "==", effectiveOwnerId));
  }, [db, effectiveOwnerId]);

  const incomeQuery = useMemoFirebase(() => {
    if (!db || !effectiveOwnerId) return null;
    return query(collection(db, "income"), where("ownerId", "==", effectiveOwnerId));
  }, [db, effectiveOwnerId]);

  const { data: expenses, loading: loadingExp } = useCollection<Expense>(expensesQuery);
  const { data: income, loading: loadingInc } = useCollection<Income>(incomeQuery);

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    return [...expenses]
      .filter((e) => 
        e.category.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.date - a.date);
  }, [expenses, searchTerm]);

  const groupedExpenses = useMemo(() => {
    const groups: { month: string; data: Expense[]; total: number }[] = [];
    filteredExpenses.forEach((expense) => {
      const monthLabel = format(expense.date, "MMMM yyyy");
      let group = groups.find((g) => g.month === monthLabel);
      if (!group) {
        group = { month: monthLabel, data: [], total: 0 };
        groups.push(group);
      }
      group.data.push(expense);
      group.total += expense.amount;
    });
    return groups;
  }, [filteredExpenses]);

  const totalExp = useMemo(() => expenses?.reduce((s, e) => s + e.amount, 0) || 0, [expenses]);
  const totalInc = useMemo(() => income?.reduce((s, i) => s + i.amount, 0) || 0, [income]);

  const canExport = settings?.canExport !== false;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Overview
        </Link>
        <div className="flex gap-2">
          {canExport && (
            <Button variant="outline" size="sm" onClick={() => setIsShareOpen(true)} className="rounded-xl h-10 px-4">
              <Share2 className="w-4 h-4 mr-2" /> Share Ledger
            </Button>
          )}
          <Button variant="outline" size="sm" className="rounded-xl h-10 px-4 border-accent text-accent hover:bg-accent/5" asChild>
            <Link href="/dashboard/expenses/scan">
              <Camera className="w-4 h-4 mr-2" /> AI Scan
            </Link>
          </Button>
          <Button size="sm" className="rounded-xl h-10 px-4 shadow-md" asChild>
            <Link href="/dashboard/expenses/new">
              <Plus className="w-4 h-4 mr-2" /> New Record
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white border-none shadow-sm rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-green-50 rounded-2xl">
              <ArrowUpRight className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Total Income</p>
              <h3 className="text-2xl font-headline font-bold text-slate-800">₹{totalInc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
          </div>
        </Card>
        <Card className="bg-white border-none shadow-sm rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-red-50 rounded-2xl">
              <Wallet className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Total Expenses</p>
              <h3 className="text-2xl font-headline font-bold text-slate-800">₹{totalExp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 p-8 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-headline text-3xl">Shared Ledger</CardTitle>
              <CardDescription className="font-medium text-slate-500">Every single outflow recorded by the family.</CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search category or notes..." 
                className="pl-10 h-12 rounded-2xl border-slate-200" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-8 space-y-10">
          {loadingExp ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>
          ) : groupedExpenses.length > 0 ? (
            groupedExpenses.map((group) => (
              <div key={group.month} className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <div className="h-px flex-1 bg-slate-100" />
                  <div className="flex items-center gap-4 px-6 py-2.5 bg-slate-50 rounded-full border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary/60" />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">{group.month}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-200" />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Total Outflow:</span>
                      <span className="text-xl font-black text-primary tracking-tight">₹{group.total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
                <div className="space-y-3">
                  {group.data.map((expense) => {
                    const Icon = getCategoryIcon(expense.category);
                    return (
                      <Link key={expense.id} href={`/dashboard/expenses/${expense.id}`} className="flex items-center justify-between p-5 rounded-3xl bg-white hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-slate-50 rounded-[1.25rem] flex items-center justify-center group-hover:bg-white transition-colors border border-transparent group-hover:border-slate-100">
                            <Icon className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-lg">{expense.category}</p>
                            <p className="text-xs text-muted-foreground font-medium">{format(expense.date, "MMM dd")} • {expense.description || "General Ledger"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary text-xl">₹{expense.amount.toLocaleString('en-IN')}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Confirmed</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            !loadingExp && (
              <div className="text-center py-20 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                 <Filter className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                 <p className="text-slate-500 font-bold">No transactions match your search.</p>
              </div>
            )
          )}
        </CardContent>
      </Card>

      <ShareExpensesDialog 
        isOpen={isShareOpen} 
        onOpenChange={setIsShareOpen} 
        expenses={expenses || []} 
        income={income || []}
        familyName={settings?.familyName}
      />
    </div>
  );
}
