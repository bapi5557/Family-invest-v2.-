
"use client";

import { useState, useMemo } from "react";
import { Bell, Clock, Loader2, Sparkles, User, CreditCard, Calendar, X, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, where, limit, doc, updateDoc, arrayUnion, deleteDoc } from "firebase/firestore";
import { Notification, FamilySettings } from "@/lib/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export function NotificationsBell() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const settingsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "settings", user.uid);
  }, [db, user]);
  
  const { data: settings, loading: loadingSettings } = useDoc<FamilySettings>(settingsRef);
  const effectiveOwnerId = settings?.familyOwnerId || user?.uid;
  const isAdmin = user?.uid === effectiveOwnerId;

  const notificationsQuery = useMemoFirebase(() => {
    if (!db || !effectiveOwnerId || loadingSettings) return null;
    // We simplified this query to avoid needing a composite index on ownerId + timestamp.
    // Instead, we fetch the latest 50 and filter/sort client-side.
    return query(
      collection(db, "notifications"),
      where("ownerId", "==", effectiveOwnerId),
      limit(50)
    );
  }, [db, effectiveOwnerId, loadingSettings]);

  const { data: rawNotifications, loading } = useCollection<Notification>(notificationsQuery);

  const notifications = useMemo(() => {
    if (!rawNotifications || !user) return [];
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    return [...rawNotifications]
      .filter(n => !n.hiddenBy?.includes(user.uid) && n.timestamp > ninetyDaysAgo)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);
  }, [rawNotifications, user]);

  const unreadCount = useMemo(() => {
    if (!notifications || !user) return 0;
    return notifications.filter((n) => !n.readBy?.includes(user.uid)).length;
  }, [notifications, user]);

  const markAllAsRead = async () => {
    if (!db || !user || !notifications.length) return;
    
    notifications.forEach((n) => {
      if (!n.readBy?.includes(user.uid)) {
        const nRef = doc(db, "notifications", n.id);
        updateDoc(nRef, {
          readBy: arrayUnion(user.uid)
        }).catch(async () => {
          const err = new FirestorePermissionError({ 
            path: nRef.path, 
            operation: 'update',
            requestResourceData: { readBy: [user.uid] }
          });
          errorEmitter.emit('permission-error', err);
        });
      }
    });
  };

  const markAsRead = (id: string) => {
    if (!db || !user) return;
    const nRef = doc(db, "notifications", id);
    updateDoc(nRef, {
      readBy: arrayUnion(user.uid)
    }).catch(async () => {
      const err = new FirestorePermissionError({ 
        path: nRef.path, 
        operation: 'update',
        requestResourceData: { readBy: [user.uid] }
      });
      errorEmitter.emit('permission-error', err);
    });
  };

  const hideNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!db || !user) return;
    const nRef = doc(db, "notifications", id);
    updateDoc(nRef, {
      hiddenBy: arrayUnion(user.uid)
    }).catch(async () => {
      const err = new FirestorePermissionError({ 
        path: nRef.path, 
        operation: 'update',
        requestResourceData: { hiddenBy: [user.uid] }
      });
      errorEmitter.emit('permission-error', err);
    });
    toast({ title: "Notification Hidden", description: "This will no longer show for you." });
  };

  const deleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!db || !isAdmin) return;
    const nRef = doc(db, "notifications", id);
    deleteDoc(nRef).catch(async () => {
      const err = new FirestorePermissionError({ path: nRef.path, operation: 'delete' });
      errorEmitter.emit('permission-error', err);
    });
    toast({ variant: "destructive", title: "Activity Deleted", description: "Removed for the entire family." });
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
        <div className="max-h-[400px] overflow-y-auto">
          {loading || loadingSettings ? (
            <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary/20" /></div>
          ) : notifications.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Bell className="w-8 h-8 text-slate-200 mx-auto" />
              <p className="text-sm text-slate-400 font-medium">No family alerts yet.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                className={cn(
                  "p-4 flex flex-col items-start gap-1 cursor-pointer transition-colors border-b border-slate-50 last:border-0 relative group",
                  !n.readBy?.includes(user?.uid || "") ? "bg-primary/5" : "bg-white"
                )}
                onClick={() => markAsRead(n.id)}
              >
                <div className="flex items-center gap-2 pr-12">
                   <div className={cn(
                     "p-1.5 rounded-lg",
                     n.type === 'expense' ? "bg-red-50 text-red-500" : 
                     n.type === 'member' ? "bg-blue-50 text-blue-500" : 
                     "bg-amber-50 text-amber-500"
                   )}>
                     {getTypeIcon(n.type)}
                   </div>
                   <p className="text-xs font-bold text-slate-800 leading-tight">{n.message}</p>
                </div>
                
                <div className="flex items-center gap-2 mt-1 ml-8 text-[9px]">
                  <span className="text-slate-400 font-bold uppercase tracking-tighter">
                    {n.createdByName ? `by ${n.createdByName}` : "System"}
                  </span>
                  <span className="text-slate-200">•</span>
                  <div className="flex items-center gap-1 text-slate-300">
                    <Clock className="w-2.5 h-2.5" />
                    {format(n.timestamp, "MMM d, h:mm a")}
                  </div>
                </div>

                <div className="absolute right-2 top-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 rounded-md hover:bg-slate-100 text-slate-400"
                    onClick={(e) => hideNotification(e, n.id)}
                    title="Hide for me"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                  {isAdmin && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-md hover:bg-red-50 text-red-300 hover:text-red-500"
                      onClick={(e) => deleteNotification(e, n.id)}
                      title="Delete for everyone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
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
