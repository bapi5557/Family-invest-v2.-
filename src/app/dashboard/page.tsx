"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Users, Wallet, CreditCard, ChevronRight } from "lucide-react";
import Link from "next/link";
import { MOCK_EXPENSES, MOCK_MEMBERS } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

// Mock helper
const formatCurrencyVal = (val: number) => `$${val.toLocaleString()}`;

export default function DashboardPage() {
  const totalSpent = MOCK_EXPENSES.reduce((sum, e) => sum + e.amount, 0);
  const recentExpenses = MOCK_EXPENSES.slice(0, 5).sort((a, b) => b.date - a.date);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline text-primary">Family Overview</h1>
          <p className="text-muted-foreground font-body">Financial pulse for the month</p>
        </div>
        <Button className="rounded-full shadow-lg" asChild>
          <Link href="/dashboard/expenses/new">
            <Plus className="w-4 h-4 mr-2" /> Add Expense
          </Link>
        </Button>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary text-white border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/70">Monthly Spending</CardDescription>
            <CardTitle className="text-4xl font-headline">{formatCurrencyVal(totalSpent)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-primary-foreground/80">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>4.5% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Family Members</CardDescription>
            <CardTitle className="text-3xl font-headline">{MOCK_MEMBERS.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/members" className="text-accent flex items-center text-sm font-medium hover:underline">
              Manage family <ChevronRight className="w-4 h-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-white border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Top Category</CardDescription>
            <CardTitle className="text-3xl font-headline">Rent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">72% of total budget</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-headline text-xl">Recent Expenses</CardTitle>
              <CardDescription>Latest family transactions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
               <Link href="/dashboard/reports">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-full border shadow-sm">
                    <CreditCard className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{expense.category}</p>
                    <p className="text-xs text-muted-foreground">{new Date(expense.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="font-semibold text-sm text-primary">-{formatCurrencyVal(expense.amount)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-xl">Family Members</CardTitle>
            <CardDescription>Active contributors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {MOCK_MEMBERS.map((member) => (
              <Link key={member.id} href={`/dashboard/members/${member.id}`} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.phone}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
            <Button variant="outline" className="w-full border-dashed" asChild>
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