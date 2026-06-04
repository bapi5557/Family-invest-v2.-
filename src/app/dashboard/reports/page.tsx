
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Share2, Sparkles, CheckCircle2, PieChart, Loader2 } from "lucide-react";
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

  const exportPDF = () => {
    window.print();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline text-primary">Monthly Report</h1>
          <p className="text-muted-foreground">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} Household Summary</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF} className="hidden sm:flex">
            <FileDown className="w-4 h-4 mr-2" /> Print PDF
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-accent/20 bg-accent/5 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-headline text-accent flex items-center">
                <Sparkles className="w-5 h-5 mr-2" /> AI Insight Counselor
              </CardTitle>
              {!aiReport && !loadingAi && (
                <Button size="sm" className="bg-accent hover:bg-accent/90" onClick={generateAIInsights} disabled={!expenses?.length}>
                   Analyze Expenses
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loadingAi ? (
                <div className="py-8 text-center space-y-4">
                  <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto" />
                  <p className="text-sm text-accent font-medium animate-pulse">Scanning spending patterns...</p>
                </div>
              ) : aiReport ? (
                <div className="space-y-6">
                  <p className="text-sm leading-relaxed text-slate-700 font-medium italic">
                    "{aiReport.summary}"
                  </p>
                  
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Efficiency Insights</h4>
                    <ul className="space-y-2">
                      {aiReport.efficiencyInsights.map((insight, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Savings Recommendations</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {aiReport.savingsRecommendations.map((rec, i) => (
                        <div key={i} className="p-3 bg-white/60 border border-accent/20 rounded-lg text-sm text-slate-700">
                          {rec}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center border-2 border-dashed border-accent/20 rounded-xl">
                  <PieChart className="w-12 h-12 text-accent/20 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {expenses?.length ? "Click the button to get AI-powered insights." : "No expenses recorded yet."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Detailed Spending</CardTitle>
              <CardDescription>Breakdown by expense category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {categoryBreakdown.map((item) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{item.category}</span>
                    <span className="text-muted-foreground">${item.amount.toFixed(2)} ({item.percentage.toFixed(1)}%)</span>
                  </div>
                  <Progress value={item.percentage} className="h-1.5" />
                </div>
              ))}
              {categoryBreakdown.length === 0 && (
                <p className="text-center py-4 text-sm text-muted-foreground">No data to display.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary text-white text-center p-6">
            <CardHeader>
              <CardDescription className="text-primary-foreground/70 uppercase tracking-widest text-[10px]">Total Household Spent</CardDescription>
              <CardTitle className="text-5xl font-headline">
                ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-white/10 rounded-lg text-xs">
                Real-time synchronized with all members
              </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader>
              <CardTitle className="font-headline text-lg">Report Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-sm h-12 border-slate-200" onClick={exportPDF}>
                <FileDown className="w-4 h-4 mr-3" /> Export Archive
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm h-12 border-slate-200">
                <Share2 className="w-4 h-4 mr-3" /> Email to Family
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
