"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Share2, Sparkles, AlertCircle, CheckCircle2, PieChart } from "lucide-react";
import { monthlyExpenseEfficiencySummary, MonthlyExpenseEfficiencySummaryOutput } from "@/ai/flows/monthly-expense-efficiency-summary";
import { MOCK_EXPENSES } from "@/lib/mock-data";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";

const formatCurrencyVal = (val: number) => `$${val.toLocaleString()}`;

export default function ReportsPage() {
  const [aiReport, setAiReport] = useState<MonthlyExpenseEfficiencySummaryOutput | null>(null);
  const [loading, setLoading] = useState(false);

  const generateAIInsights = async () => {
    setLoading(true);
    try {
      const expenses = MOCK_EXPENSES.map(e => ({
        category: e.category,
        amount: e.amount,
        description: e.description
      }));
      const res = await monthlyExpenseEfficiencySummary({
        month: "January",
        year: 2024,
        expenses
      });
      setAiReport(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline text-primary">Monthly Report</h1>
          <p className="text-muted-foreground">January 2024 Household Summary</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF} className="hidden sm:flex">
            <FileDown className="w-4 h-4 mr-2" /> PDF
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
              {!aiReport && !loading && (
                <Button size="sm" className="bg-accent hover:bg-accent/90" onClick={generateAIInsights}>
                   Analyze Expenses
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
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
                  <p className="text-sm text-muted-foreground">Click the button to get AI-powered insights on your spending for this month.</p>
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
              {MOCK_EXPENSES.map((expense) => (
                <div key={expense.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{expense.category}</span>
                    <span className="text-muted-foreground">{formatCurrencyVal(expense.amount)}</span>
                  </div>
                  <Progress value={(expense.amount / 1500) * 100} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary text-white text-center p-6">
            <CardHeader>
              <CardDescription className="text-primary-foreground/70 uppercase tracking-widest text-[10px]">Grand Total</CardDescription>
              <CardTitle className="text-5xl font-headline">
                {formatCurrencyVal(MOCK_EXPENSES.reduce((s, e) => s + e.amount, 0))}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-white/10 rounded-lg text-xs">
                Next billing cycle starts in 12 days
              </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader>
              <CardTitle className="font-headline text-lg">Report Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-sm h-12 border-slate-200">
                <FileDown className="w-4 h-4 mr-3" /> Monthly Archive
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