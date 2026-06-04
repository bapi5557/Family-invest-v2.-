
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Share2, Sparkles, CheckCircle2, PieChart, Loader2, TrendingDown, BarChart2 } from "lucide-react";
import { monthlyExpenseEfficiencySummary, MonthlyExpenseEfficiencySummaryOutput } from "@/ai/flows/monthly-expense-efficiency-summary";
import { Progress } from "@/components/ui/progress";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { Expense } from "@/lib/types";

export default function ReportsPage() {
  const [aiReport, setAiReport] = useState<MonthlyExpenseEfficiencySummaryOutput | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const db = useFirestore();
  const { user } = useUser();

  const expensesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "expenses"),
      where("ownerId", "==", user.uid),
      orderBy("date", "desc")
    );
  }, [db, user]);

  const { data: expenses, loading: loadingExpenses } = useCollection<Expense>(expensesQuery);

  const totalSpent = useMemo(() => {
    return expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
  }, [expenses]);

  const categoryBreakdown = useMemo(() => {
    if (!expenses) return [];
    const totals: Record<string, number> = {};
    expenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return Object.entries(totals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, totalSpent]);

  const generateAIInsights = async () => {
    if (!expenses || expenses.length === 0) return;
    setLoadingAi(true);
    try {
      const expenseItems = expenses.map(e => ({
        category: e.category,
        amount: e.amount,
        description: e.description
      }));
      const res = await monthlyExpenseEfficiencySummary({
        month: new Date().toLocaleString('default', { month: 'long' }),
        year: new Date().getFullYear(),
        expenses: expenseItems
      });
      setAiReport(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  if (loadingExpenses) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline text-primary">Financial Intelligence</h1>
          <p className="text-muted-foreground font-body">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} Performance Report</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-xl h-10 px-4">
            <FileDown className="w-4 h-4 mr-2" /> Print PDF
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl h-10 px-4">
            <Share2 className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden bg-accent/5">
            <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
              <CardTitle className="font-headline text-accent flex items-center text-2xl">
                <Sparkles className="w-6 h-6 mr-2" /> AI Counselor
              </CardTitle>
              {!aiReport && !loadingAi && (
                <Button 
                  size="sm" 
                  className="bg-accent hover:bg-accent/90 rounded-full h-10 px-6 shadow-md" 
                  onClick={generateAIInsights} 
                  disabled={!expenses?.length}
                >
                   Generate Analysis
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-8 pt-4">
              {loadingAi ? (
                <div className="py-12 text-center space-y-6">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 border-4 border-accent/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg text-accent font-bold animate-pulse">Analyzing Patterns...</p>
                    <p className="text-sm text-muted-foreground">Identifying efficiency opportunities in your spending.</p>
                  </div>
                </div>
              ) : aiReport ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="p-6 bg-white/60 backdrop-blur-sm border border-accent/10 rounded-2xl">
                    <p className="text-base leading-relaxed text-slate-700 font-medium italic">
                      "{aiReport.summary}"
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-accent flex items-center">
                        <TrendingDown className="w-4 h-4 mr-2" /> Efficiency Insights
                      </h4>
                      <ul className="space-y-3">
                        {aiReport.efficiencyInsights.map((insight, i) => (
                          <li key={i} className="text-sm flex items-start gap-3 bg-white/40 p-3 rounded-xl border border-accent/5">
                            <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                            <span className="text-slate-700">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center">
                        <Sparkles className="w-4 h-4 mr-2" /> Savings Action Plan
                      </h4>
                      <div className="grid grid-cols-1 gap-3">
                        {aiReport.savingsRecommendations.map((rec, i) => (
                          <div key={i} className="p-4 bg-primary/5 border border-primary/10 rounded-xl text-sm text-slate-700 font-medium">
                            {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center border-2 border-dashed border-accent/20 rounded-[2rem] bg-white/30 backdrop-blur-sm">
                  <PieChart className="w-16 h-16 text-accent/20 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">
                    {expenses?.length ? "Ready to analyze your household spending." : "Record expenses to enable AI analysis."}
                  </p>
                  {expenses?.length ? (
                    <Button variant="link" className="text-accent font-bold mt-2" onClick={generateAIInsights}>
                      Click to begin
                    </Button>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="p-8 border-b">
              <CardTitle className="font-headline text-2xl">Category Distribution</CardTitle>
              <CardDescription>Visual breakdown of monthly resource allocation</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {categoryBreakdown.map((item) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex justify-between text-sm items-center">
                    <span className="font-bold text-slate-700">{item.category}</span>
                    <span className="font-mono text-muted-foreground">₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} — {item.percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={item.percentage} className="h-2 rounded-full bg-slate-100" />
                </div>
              ))}
              {categoryBreakdown.length === 0 && (
                <div className="text-center py-12 text-slate-400 font-medium">
                  No data points captured for this period.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary text-white border-none shadow-2xl rounded-[2rem] overflow-hidden p-8 text-center relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <BarChart2 className="w-24 h-24" />
            </div>
            <CardHeader className="p-0 mb-4">
              <CardDescription className="text-primary-foreground/70 uppercase font-black tracking-widest text-[10px]">Net Household Outflow</CardDescription>
              <CardTitle className="text-5xl font-headline mt-2">
                ₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-3 bg-white/10 rounded-xl text-xs font-bold backdrop-blur-sm inline-block px-6">
                Live Ledger Status
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
             <CardHeader className="p-6 border-b">
              <CardTitle className="font-headline text-xl">Quick Controls</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <Button variant="outline" className="w-full justify-start text-sm h-12 rounded-xl border-slate-200 hover:bg-slate-50 transition-colors" onClick={() => window.print()}>
                <FileDown className="w-5 h-5 mr-3 text-primary" /> Archive as PDF
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm h-12 rounded-xl border-slate-200 hover:bg-slate-50 transition-colors">
                <Share2 className="w-5 h-5 mr-3 text-accent" /> Share with Family
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
