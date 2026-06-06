
'use client';

import { useEffect, useState, useRef } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Reminder, FamilySettings, SnoozeOption } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { createNotification } from '@/lib/notifications-service';
import { format, isPast, addMinutes, addHours, addDays, startOfDay } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, Clock, CheckCircle2, AlertTriangle, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Reliable public CDN sound for notifications
const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export function ReminderMonitor() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [activeReminders, setActiveReminders] = useState<Reminder[]>([]);
  const [currentTrigger, setCurrentTrigger] = useState<Reminder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const settingsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "settings", user.uid);
  }, [db, user]);
  
  const { data: settings } = useDoc<FamilySettings>(settingsRef);
  const effectiveOwnerId = settings?.familyOwnerId || user?.uid;

  const remindersQuery = useMemoFirebase(() => {
    if (!db || !effectiveOwnerId) return null;
    return query(
      collection(db, "reminders"),
      where("ownerId", "==", effectiveOwnerId),
      where("completed", "==", false)
    );
  }, [db, effectiveOwnerId]);

  const { data: reminders } = useCollection<Reminder>(remindersQuery);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    }
  }, []);

  useEffect(() => {
    if (!reminders) return;

    const checkInterval = setInterval(() => {
      const now = new Date();
      
      reminders.forEach((reminder) => {
        // Prevent re-triggering the same reminder multiple times in the same minute
        if (reminder.triggeredAt && (Date.now() - reminder.triggeredAt < 60000)) return;

        const reminderDate = new Date(reminder.date);
        const [hours, minutes] = (reminder.time || "00:00").split(':').map(Number);
        reminderDate.setHours(hours, minutes, 0, 0);

        // Trigger if time has arrived or passed and wasn't triggered recently
        if (isPast(reminderDate) && (!reminder.triggeredAt || Date.now() - reminder.triggeredAt > 60000)) {
          triggerReminder(reminder);
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkInterval);
  }, [reminders, effectiveOwnerId]);

  const triggerReminder = (reminder: Reminder) => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.warn("Audio play blocked by browser policies"));
    }
    
    setCurrentTrigger(reminder);
    
    // Log as a Family Activity
    if (db && effectiveOwnerId) {
      const timeStr = format(new Date(), "h:mm a");
      createNotification(
        db,
        effectiveOwnerId,
        `Reminder Alert: "${reminder.title}" is due now!`,
        'reminder',
        reminder.description,
        user?.uid || "system",
        user?.displayName || "System"
      );

      // Mark as triggered in DB to prevent duplicate alerts on other devices
      const rRef = doc(db, "reminders", reminder.id);
      updateDoc(rRef, { triggeredAt: Date.now() });
    }
  };

  const handleSnooze = (option: SnoozeOption) => {
    if (!currentTrigger || !db) return;
    
    let newDate = new Date();
    if (option === "10_MIN") newDate = addMinutes(new Date(), 10);
    if (option === "1_HOUR") newDate = addHours(new Date(), 1);
    if (option === "TOMORROW") {
      newDate = startOfDay(addDays(new Date(), 1));
      newDate.setHours(9, 0, 0, 0); // Default to 9 AM
    }

    const rRef = doc(db, "reminders", currentTrigger.id);
    const updateData = {
      date: newDate.getTime(),
      time: format(newDate, "HH:mm"),
      triggeredAt: null // Reset trigger
    };

    updateDoc(rRef, updateData);
    toast({ title: "Reminder Snoozed", description: `We'll remind you at ${format(newDate, "p")}.` });
    setCurrentTrigger(null);
  };

  const handleComplete = () => {
    if (!currentTrigger || !db) return;
    const rRef = doc(db, "reminders", currentTrigger.id);
    updateDoc(rRef, { completed: true, triggeredAt: Date.now() });
    toast({ title: "Task Completed", description: `"${currentTrigger.title}" marked as done.` });
    setCurrentTrigger(null);
  };

  return (
    <Dialog open={!!currentTrigger} onOpenChange={(open) => !open && setCurrentTrigger(null)}>
      <DialogContent className="rounded-[2.5rem] max-w-sm border-none shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="bg-primary p-8 text-white text-center space-y-4">
          <div className="w-16 h-16 bg-white/20 rounded-[2rem] flex items-center justify-center mx-auto animate-bounce">
            <Bell className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-2xl font-headline font-bold">Reminder Alert</DialogTitle>
            <DialogDescription className="text-primary-foreground/70 text-xs font-black uppercase tracking-widest">
              Happening Now
            </DialogDescription>
          </div>
        </DialogHeader>
        
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-slate-800">{currentTrigger?.title}</h3>
            <p className="text-sm text-slate-500 italic">
              {currentTrigger?.description || "Time to attend to this family obligation."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button onClick={handleComplete} className="h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 shadow-lg text-lg">
              <CheckCircle2 className="w-5 h-5 mr-2" /> Mark as Completed
            </Button>
            
            <div className="relative py-2">
               <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100" /></div>
               <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-slate-300"><span className="bg-white px-4">Snooze For</span></div>
            </div>

            <div className="grid grid-cols-3 gap-2">
               <Button variant="outline" size="sm" className="rounded-xl flex-col h-16 gap-1" onClick={() => handleSnooze("10_MIN")}>
                 <Clock className="w-4 h-4" /> <span className="text-[10px] font-bold">10m</span>
               </Button>
               <Button variant="outline" size="sm" className="rounded-xl flex-col h-16 gap-1" onClick={() => handleSnooze("1_HOUR")}>
                 <Clock className="w-4 h-4" /> <span className="text-[10px] font-bold">1h</span>
               </Button>
               <Button variant="outline" size="sm" className="rounded-xl flex-col h-16 gap-1" onClick={() => handleSnooze("TOMORROW")}>
                 <Moon className="w-4 h-4" /> <span className="text-[10px] font-bold">Tmro</span>
               </Button>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-50 p-4 text-center">
           <Button variant="ghost" className="text-xs text-muted-foreground" onClick={() => setCurrentTrigger(null)}>
             Dismiss for now
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
