"use client";

import { useMemo, useState } from "react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  format, 
  subDays, 
  addDays,
  eachDayOfInterval, 
  isSameDay, 
  startOfDay, 
  endOfDay,
} from "date-fns";
import { Expense } from "@/lib/types";
import { TrendingUp, ChevronLeft, ChevronRight, Info, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailySpendingAnalyticsProps {
  expenses: Expense[];
  className?: string;
}

type RangeOption = "7D" | "30D" | "ALL";

export function DailySpendingAnalytics({ expenses, className }: DailySpendingAnalyticsProps) {
  const [range, setRange] = useState<RangeOption>("7D");
  const [baseDate, setBaseDate] = useState<Date>(new Date());

  const chartData = useMemo(() => {
    if (!expenses) return [];

    let startDate: Date;
    let endDate: Date;

    if (range === "7D") {
      endDate = endOfDay(baseDate);
      startDate = startOfDay(subDays(endDate, 6));
    } else if (range === "30D") {
      endDate = endOfDay(new Date());
      startDate = startOfDay(subDays(endDate, 29));
    } else {
      // ALL Time
      endDate = endOfDay(new Date());
      const oldest = expenses.length > 0 
        ? new Date(Math.min(...expenses.map(e => e.date))) 
        : subDays(endDate, 30);
      startDate = startOfDay(oldest);
    }

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map(day => {
      const dailyTotal = expenses
        .filter(e => isSameDay(new Date(e.date), day))
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        date: format(day, "MMM dd"),
        fullDate: format(day, "PPPP"),
        amount: dailyTotal,
      };
    });
  }, [expenses, range, baseDate]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return { avg: 0, max: 0, total: 0 };
    const amounts = chartData.map(d => d.amount);
    const sum = amounts.reduce((a, b) => a + b, 0);
    return {
      avg: sum / chartData.length,
      max: Math.max(...amounts),
      total: sum
    };
  }, [chartData]);

  const currentRangeLabel = useMemo(() => {
    if (chartData.length < 2) return "...";
    const first = chartData[0].date;
    const last = chartData[chartData.length - 1].date;
    const year = range === "ALL" ? "" : `, ${format(baseDate, "yyyy")}`;
    return `${first} — ${last}${year}`;
  }, [chartData, baseDate, range]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setRange("7D");
    setBaseDate(prev => direction === 'prev' ? subDays(prev, 7) : addDays(prev, 7));
  };

  const resetToToday = () => {
    setBaseDate(new Date());
    setRange("7D");
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 shadow-2xl rounded-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{payload[0].payload.fullDate}</p>
          <p className="text-xl font-headline font-bold text-primary">₹{payload[0].value.toLocaleString('en-IN')}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={cn("rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden", className)}>
      <CardHeader className="p-8 pb-4 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-2xl flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" /> Daily Outflow Timeline
            </CardTitle>
            <CardDescription className="font-medium">Tracking household liquidity fluctuations</CardDescription>
          </div>
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
            {(["7D", "30D", "ALL"] as const).map((r) => (
              <Button
                key={r}
                variant={range === r ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setRange(r);
                  if (r !== "7D") setBaseDate(new Date());
                }}
                className={cn(
                  "h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  range === r ? "shadow-md" : "text-slate-500 hover:text-primary"
                )}
              >
                {r === "7D" ? "1 Week" : r === "30D" ? "1 Month" : "All Time"}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between bg-slate-50/80 p-2 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-sm transition-all"
              onClick={() => navigateWeek('prev')}
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <div className="px-4 flex flex-col">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Period</p>
              <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-primary/40" />
                {currentRangeLabel}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-sm transition-all"
              onClick={() => navigateWeek('next')}
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </Button>
          </div>
          {range === "7D" && !isSameDay(baseDate, new Date()) && (
            <Button variant="link" size="sm" className="text-[10px] font-black uppercase text-primary h-8" onClick={resetToToday}>
              Back to Today
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-8 pt-2 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Daily Average</p>
            <p className="text-lg font-headline font-bold text-slate-700">₹{stats.avg.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Period Peak</p>
            <p className="text-lg font-headline font-bold text-accent">₹{stats.max.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="col-span-2 space-y-1 bg-primary/5 p-4 rounded-2xl border border-primary/10">
            <p className="text-[9px] font-black text-primary uppercase tracking-widest">Total Period Outflow</p>
            <p className="text-lg font-headline font-bold text-primary">₹{stats.total.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorAmount)" 
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium bg-amber-50 p-3 rounded-xl border border-amber-100/50">
          <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <p>This graph aggregates all recorded expenses from all family members for the selected period.</p>
        </div>
      </CardContent>
    </Card>
  );
}
