
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Bell, Calendar, Clock, Loader2, CheckCircle2, Circle, AlertTriangle, Share2, Filter, Trash2, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { collection, query, where, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { Reminder } from "@/lib/types";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function RemindersPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "active" | "completed">("active");

  const remindersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "reminders"), where("ownerId", "==", user.uid));
  }, [db, user]);

  const { data: rawReminders, loading } = useCollection<Reminder>(remindersQuery);

  const reminders = useMemo(() => {
    if (!rawReminders) return [];
    let filtered = [...rawReminders];
    
    if (filter === "active") filtered = filtered.filter(r => !r.completed);
    if (filter === "completed") filtered = filtered.filter(r => r.completed);

    return filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.date - b.date;
    });
  }, [rawReminders, filter]);

  const toggleComplete = (reminderId: string, currentStatus: boolean) => {
    if (!db) return;
    const docRef = doc(db, "reminders", reminderId);
    updateDoc(docRef, { completed: !currentStatus })
      .catch(async () => {
        const err = new FirestorePermissionError({ path: docRef.path, operation: 'update' });
        errorEmitter.emit('permission-error', err);
      });
    toast({ title: currentStatus ? "Marked Pending" : "Task Completed", description: "Ledger status updated." });
  };

  const deleteReminder = (reminderId: string) => {
    if (!db) return;
    const docRef = doc(db, "reminders", reminderId);
    deleteDoc(docRef).catch(async () => {
      const err = new FirestorePermissionError({ path: docRef.path, operation: 'delete' });
      errorEmitter.emit('permission-error', err);
    });
    toast({ variant: "destructive", title: "Reminder Removed", description: "Obligation cleared from ledger." });
  };

  const getStatusInfo = (reminder: Reminder) => {
    if (reminder.completed) return { label: "Completed", color: "text-emerald-500", bg: "bg-emerald-50" };
    
    const reminderDate = new Date(reminder.date);
    const [h, m] = (reminder.time || "00:00").split(':').map(Number);
    reminderDate.setHours(h, m, 0, 0);

    if (isPast(reminderDate)) return { label: "Overdue", color: "text-red-500", bg: "bg-red-50", icon: AlertTriangle };
    if (isToday(reminderDate)) return { label: "Due Today", color: "text-amber-600", bg: "bg-amber-50", icon: Clock };
    if (isTomorrow(reminderDate)) return { label: "Tomorrow", color: "text-blue-500", bg: "bg-blue-50" };
    
    return { label: "Upcoming", color: "text-slate-500", bg: "bg-slate-50" };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline text-primary">Family Reminders</h1>
          <p className="text-muted-foreground font-body">Never miss a bill, SIP, or family celebration.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="rounded-xl h-10 shadow-md" asChild>
            <Link href="/dashboard/reminders/new">
              <Plus className="w-4 h-4 mr-2" /> New Reminder
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
        {(["all", "active", "completed"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-xl capitalize h-9 px-6 transition-all",
              filter === f ? "shadow-md" : "text-muted-foreground"
            )}
          >
            {f}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>
      ) : reminders.length === 0 ? (
        <Card className="rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50/50 p-20 text-center">
          <Bell className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-bold text-lg">Your ledger is clear.</p>
          <p className="text-sm text-muted-foreground mb-6">Start by adding a recurring bill or a family birthday.</p>
          <Button asChild className="rounded-full px-8">
            <Link href="/dashboard/reminders/new">Add First Reminder</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reminders.map((reminder) => {
            const status = getStatusInfo(reminder);
            return (
              <Card 
                key={reminder.id} 
                className={cn(
                  "rounded-[2.5rem] border-none shadow-sm transition-all hover:shadow-xl group overflow-hidden bg-white flex flex-col",
                  reminder.completed && "opacity-60 grayscale-[0.5]"
                )}
              >
                <div className={cn(
                  "h-2 w-full",
                  reminder.priority === "High" ? "bg-red-500" : reminder.priority === "Medium" ? "bg-amber-400" : "bg-emerald-400"
                )} />
                <CardContent className="p-8 space-y-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                          status.bg, status.color
                        )}>
                          {status.icon && <status.icon className="w-2.5 h-2.5 inline mr-1" />}
                          {status.label}
                        </span>
                        {reminder.isRecurring && (
                          <span className="text-[9px] font-black uppercase tracking-widest bg-primary/5 text-primary px-2.5 py-1 rounded-full">
                            {reminder.recurringType}
                          </span>
                        )}
                      </div>
                      <h3 className={cn(
                        "font-bold text-2xl leading-tight group-hover:text-primary transition-colors",
                        reminder.completed && "line-through text-slate-400"
                      )}>
                        {reminder.title}
                      </h3>
                    </div>
                    <button 
                      onClick={() => toggleComplete(reminder.id, reminder.completed)}
                      className={cn(
                        "transition-all scale-125",
                        reminder.completed ? "text-emerald-500" : "text-slate-200 hover:text-primary"
                      )}
                    >
                      {reminder.completed ? <CheckCircle2 className="w-7 h-7" /> : <Circle className="w-7 h-7" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Date</p>
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                        <Calendar className="w-4 h-4 text-primary/40" />
                        {format(reminder.date, "MMM dd")}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Time</p>
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                        <Clock className="w-4 h-4 text-primary/40" />
                        {reminder.time || "Anytime"}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 italic leading-relaxed flex-1">
                    {reminder.description || "No specific details recorded for this family obligation."}
                  </p>

                  <div className="pt-5 flex items-center justify-between border-t border-slate-50">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      {reminder.isGlobal ? "Family-Wide" : "Personal"}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 text-slate-200 hover:text-destructive hover:bg-red-50 rounded-full transition-all" 
                      onClick={() => deleteReminder(reminder.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
