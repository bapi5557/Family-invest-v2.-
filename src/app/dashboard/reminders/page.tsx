
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Bell, Calendar, Clock, Loader2, CheckCircle2, Circle, AlertTriangle, Share2, Filter, Trash2 } from "lucide-react";
import Link from "next/link";
import { collection, query, where, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { Reminder } from "@/lib/types";
import { format, isPast } from "date-fns";
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline text-primary">Family Reminders</h1>
          <p className="text-muted-foreground font-body">Never miss a bill, SIP, or family celebration.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl h-10">
            <Share2 className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button size="sm" className="rounded-xl h-10 shadow-md" asChild>
            <Link href="/dashboard/reminders/new">
              <Plus className="w-4 h-4 mr-2" /> New Reminder
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl w-fit">
        {(["all", "active", "completed"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter(f)}
            className="rounded-xl capitalize h-8"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reminders.map((reminder) => {
            const isOverdue = !reminder.completed && isPast(reminder.date);
            return (
              <Card 
                key={reminder.id} 
                className={cn(
                  "rounded-[2rem] border-none shadow-sm transition-all hover:shadow-md group overflow-hidden bg-white",
                  reminder.completed && "opacity-60",
                  isOverdue && "ring-2 ring-red-100"
                )}
              >
                <div className={cn(
                  "h-2 w-full",
                  reminder.priority === "High" ? "bg-red-400" : reminder.priority === "Medium" ? "bg-amber-400" : "bg-emerald-400"
                )} />
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md",
                          isOverdue ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"
                        )}>
                          {reminder.category}
                        </span>
                        {reminder.isRecurring && (
                          <span className="text-[10px] font-black uppercase tracking-tighter bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                            {reminder.recurringType}
                          </span>
                        )}
                      </div>
                      <h3 className={cn(
                        "font-bold text-xl leading-tight group-hover:text-primary transition-colors",
                        reminder.completed && "line-through text-slate-400"
                      )}>
                        {reminder.title}
                      </h3>
                    </div>
                    <button 
                      onClick={() => toggleComplete(reminder.id, reminder.completed)}
                      className="text-slate-300 hover:text-primary transition-colors"
                    >
                      {reminder.completed ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Circle className="w-6 h-6" />}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Calendar className={cn("w-4 h-4", isOverdue ? "text-red-500" : "text-primary")} />
                      <span className={isOverdue ? "text-red-600 font-bold" : ""}>
                        {format(reminder.date, "PP")}
                        {isOverdue && " (Overdue)"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
                      <Clock className="w-4 h-4" />
                      {reminder.time || "No specific time"}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 italic">
                    {reminder.description || "No specific details recorded."}
                  </p>

                  <div className="pt-4 flex items-center justify-between border-t border-slate-50">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                      {reminder.isGlobal ? "Family-Wide" : "Personal"}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-destructive" onClick={() => deleteReminder(reminder.id)}>
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
