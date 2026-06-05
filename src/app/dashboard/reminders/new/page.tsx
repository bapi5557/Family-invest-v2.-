
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Loader2, Bell } from "lucide-react";
import Link from "next/link";
import { collection, addDoc, doc } from "firebase/firestore";
import { useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { REMINDER_CATEGORIES, ReminderCategory, Priority, RecurringType, FamilySettings } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { createNotification } from "@/lib/notifications-service";

export default function NewReminderPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("10:00");
  const [category, setCategory] = useState<ReminderCategory>("Bill Payment");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<RecurringType>("None");
  const [isGlobal, setIsGlobal] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const settingsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "settings", user.uid);
  }, [db, user]);
  
  const { data: settings } = useDoc<FamilySettings>(settingsRef);
  const effectiveOwnerId = settings?.familyOwnerId || user?.uid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !effectiveOwnerId) return;

    setIsSubmitting(true);

    const reminderData = {
      title: title.trim(),
      description: description.trim(),
      date: new Date(dateStr).getTime(),
      time: timeStr,
      category,
      priority,
      isRecurring,
      recurringType: isRecurring ? recurringType : "None",
      isGlobal,
      completed: false,
      ownerId: effectiveOwnerId,
      createdBy: user.uid,
      createdAt: Date.now(),
    };

    addDoc(collection(db, "reminders"), reminderData)
      .then(() => {
        const timeAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        createNotification(
          db, 
          effectiveOwnerId, 
          `${user.displayName || 'Admin'} created a new reminder: "${title}" at ${timeAt}`,
          'reminder'
        );
      })
      .catch(async () => {
        const err = new FirestorePermissionError({ path: "reminders", operation: 'create', requestResourceData: reminderData });
        errorEmitter.emit('permission-error', err);
      });

    toast({ 
      title: "Reminder Set", 
      description: `Obligation "${title}" added to the family timeline.` 
    });
    router.push("/dashboard/reminders");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <Link href="/dashboard/reminders" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Timelines
      </Link>

      <Card className="rounded-[2.5rem] shadow-2xl overflow-hidden border-none">
        <CardHeader className="bg-primary text-white p-10">
          <CardTitle className="text-3xl font-headline flex items-center gap-3">
            <Bell className="w-8 h-8" /> Create Obligation
          </CardTitle>
          <CardDescription className="text-primary-foreground/80 font-medium">Record recurring bills, investments, or family milestones.</CardDescription>
        </CardHeader>
        <CardContent className="p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-black uppercase tracking-widest text-slate-400">Reminder Title</Label>
              <Input 
                id="title" 
                required 
                placeholder="e.g., Internet Bill Payment"
                className="h-14 rounded-2xl border-slate-200 text-lg font-bold"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Classification</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ReminderCategory)}>
                  <SelectTrigger className="h-14 rounded-2xl border-slate-200 font-medium">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {REMINDER_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="rounded-xl h-10">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Priority Level</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                  <SelectTrigger className="h-14 rounded-2xl border-slate-200 font-medium">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Low" className="rounded-xl h-10">Low</SelectItem>
                    <SelectItem value="Medium" className="rounded-xl h-10">Medium</SelectItem>
                    <SelectItem value="High" className="rounded-xl h-10">High (Urgent)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-xs font-black uppercase tracking-widest text-slate-400">Target Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  required 
                  className="h-14 rounded-2xl border-slate-200"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="text-xs font-black uppercase tracking-widest text-slate-400">Notification Time</Label>
                <Input 
                  id="time" 
                  type="time" 
                  className="h-14 rounded-2xl border-slate-200"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">Recurring Obligation</Label>
                  <p className="text-xs text-muted-foreground">Automatically repeats at set intervals.</p>
                </div>
                <Switch 
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
              </div>
              {isRecurring && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                   <Label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 block">Repeat Cycle</Label>
                   <Select value={recurringType} onValueChange={(v) => setRecurringType(v as RecurringType)}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white">
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Daily">Daily</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Monthly">Monthly (Rent/SIP)</SelectItem>
                      <SelectItem value="Yearly">Yearly (Insurance/Events)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-6 bg-accent/5 rounded-[2rem] border border-accent/10">
              <div className="space-y-0.5">
                <Label className="text-base font-bold text-accent">Family-Wide Broadcast</Label>
                <p className="text-xs text-muted-foreground">Visible to everyone in the family dashboard.</p>
              </div>
              <Switch 
                checked={isGlobal}
                onCheckedChange={setIsGlobal}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-slate-400">Additional Instructions</Label>
              <Textarea 
                id="description" 
                placeholder="Instructions for other family members..."
                className="min-h-[100px] rounded-2xl resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button type="submit" className="flex-1 h-14 text-xl font-headline rounded-2xl shadow-xl" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Save className="w-6 h-6 mr-3" />}
                Save Obligation
              </Button>
              <Button type="button" variant="outline" className="flex-1 h-14 rounded-2xl text-lg border-slate-200" asChild disabled={isSubmitting}>
                <Link href="/dashboard/reminders">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
