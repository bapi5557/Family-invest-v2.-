"use client";

import { useState, useMemo } from "react";
import { Bell, Check, Clock, Loader2, Sparkles, User, CreditCard, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, limit, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { Notification, FamilySettings } from "@/lib/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function NotificationsBell() {
  const { user } = userUser();
  const db = useFirestore();
  const [isOpen, setIsOpen] = useState(false);

  const settingsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "settings", user.uid);
  }, [db, user]);
  
  const { data: settings } = useDoc<FamilySettings>(settingsRef);
  const effectiveOwnerId = settings?.familyOwnerId || user?.uid;

  // Fetch notifications from the last 90 days
  const notificationsQuery = useMemoFirebase(() => {
    if (!db || !effectiveOwnerId) return null;
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    return query(
      collection(db, "notifications"),
      where("ownerId", "==", effectiveOwnerId),
      where("timestamp", ">", ninetyDaysAgo),
      limit(20)
    );
  }, [db, effectiveOwnerId]);

  const { data: rawNotifications, loading } = useCollection<Notification>(notificationsQuery);

  const notifications = useMemo(() => {
    if (!rawNotifications) return [];
    return [...rawNotifications].sort((a, b) => b.timestamp - a.timestamp);
  }, [rawNotifications]);

  const unreadCount = useMemo(() => {
    if (!notifications || !user) return 0;
    return notifications.filter((n) => !n.readBy?.includes(user.uid)).length;
  }, [notifications, user]);

  const markAllAsRead = async () => {
    if (!db || !user || !notifications.length) return;
    
    notifications.forEach(async (n) => {
      if (!n.readBy?.includes(user.uid)) {
        const nRef = doc(db, "notifications", n.id);
        updateDoc(nRef, {
          readBy: arrayUnion(user.uid)
        });
      }
    });
  };

  const markAsRead = (id: string) => {
    if (!db || !user) return;
    const nRef = doc(db, "notifications", id);
    updateDoc(nRef, {
      readBy: arrayUnion(user.uid)
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'expense': return <CreditCard className="w-3.5 h-3.5" />;
      case 'member': return <User className="w-3.5 h-3.5" />;
      case 'reminder': return <Calendar className="w-3.5 h-3.5" />;
      default: return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (v) markAllAsRead(); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-slate-100 transition-colors">
          <Bell className={cn("w-5 h-5", unreadCount > 0 ? "text-primary animate-pulse" : "text-muted-foreground")} />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-[1.5rem] p-0 shadow-2xl overflow-hidden border-none animate-in zoom-in-95 duration-200">
        <div className="bg-primary p-4 text-white flex items-center justify-between">
          <h3 className="font-headline text-lg">Family Activity</h3>
          {unreadCount > 0 && <span className="text-[10px] uppercase font-bold tracking-widest bg-white/20 px-2 py-0.5 rounded-full">{unreadCount} New</span>}
        </div>
        <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary/20" /></div>
          ) : notifications.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Bell className="w-8 h-8 text-slate-200 mx-auto" />
              <p className="text-sm text-slate-400 font-medium">No family alerts yet.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem 
                key={n.id} 
                className={cn(
                  "p-4 flex flex-col items-start gap-1 cursor-pointer transition-colors border-b border-slate-50 last:border-0",
                  !n.readBy?.includes(user?.uid || "") ? "bg-primary/5" : "bg-white"
                )}
                onClick={() => markAsRead(n.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                   <div className={cn(
                     "p-1.5 rounded-lg",
                     n.type === 'expense' ? "bg-red-50 text-red-500" : 
                     n.type === 'member' ? "bg-blue-50 text-blue-500" : 
                     "bg-amber-50 text-amber-500"
                   )}>
                     {getTypeIcon(n.type)}
                   </div>
                   <p className="text-xs font-bold text-slate-800 line-clamp-1">{n.message}</p>
                </div>
                {n.details && <p className="text-[10px] text-slate-500 font-medium ml-8">{n.details}</p>}
                <div className="flex items-center gap-1.5 text-[9px] text-slate-300 mt-1 ml-8">
                  <Clock className="w-2.5 h-2.5" />
                  {format(n.timestamp, "MMM d, h:mm a")}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <Button variant="ghost" className="w-full rounded-none h-12 text-xs font-bold text-primary hover:bg-slate-50" asChild>
          <Link href="/dashboard/expenses">View All Activity</Link>
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Utility function fix for the typo in the hook call
function userUser() {
  const { useUser } = require('@/firebase');
  return useUser();
}
