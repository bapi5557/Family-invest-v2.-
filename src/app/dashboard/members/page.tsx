
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Phone, StickyNote, MoreVertical, Search, Edit2, Trash2, Loader2, Users, Lock } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { collection, query, where, deleteDoc, doc } from "firebase/firestore";
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from "@/firebase";
import { FamilyMember, FamilySettings } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function MembersPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pendingAction, setPendingAction] = useState<{ type: 'add' | 'edit' | 'delete', id?: string } | null>(null);

  const membersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "members"), where("ownerId", "==", user.uid));
  }, [db, user]);

  const settingsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "settings", user.uid);
  }, [db, user]);

  const { data: members, loading } = useCollection<FamilyMember>(membersQuery);
  const { data: settings } = useDoc<FamilySettings>(settingsRef);

  const requestAdminAction = (action: { type: 'add' | 'edit' | 'delete', id?: string }) => {
    setPendingAction(action);
    setIsPinDialogOpen(true);
  };

  const handleVerifyPin = () => {
    const correctPin = settings?.adminPin || "1234";
    if (pinInput === correctPin) {
      setIsPinDialogOpen(false);
      setPinInput("");
      
      if (pendingAction?.type === 'add') {
        router.push("/dashboard/members/new");
      } else if (pendingAction?.type === 'edit' && pendingAction.id) {
        router.push(`/dashboard/members/${pendingAction.id}/edit`);
      } else if (pendingAction?.type === 'delete' && pendingAction.id) {
        performDelete(pendingAction.id);
      }
    } else {
      toast({ variant: "destructive", title: "Access Denied", description: "Incorrect Admin PIN." });
      setPinInput("");
    }
  };

  const performDelete = (memberId: string) => {
    if (!db) return;
    const docRef = doc(db, "members", memberId);
    deleteDoc(docRef).catch(async () => {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: "delete",
      });
      errorEmitter.emit("permission-error", permissionError);
    });
    toast({ title: "Member Removed", description: "The family profile was deleted." });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline text-primary">Family Network</h1>
          <p className="text-muted-foreground font-body">Manage member profiles and access</p>
        </div>
        <Button className="rounded-full shadow-lg h-12 px-6" onClick={() => requestAdminAction({ type: 'add' })}>
          <Plus className="w-4 h-4 mr-2" /> Add Member
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members?.map((member) => (
          <Card key={member.id} className="overflow-hidden group hover:shadow-md transition-shadow rounded-3xl border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-start justify-between pb-2 p-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14 rounded-2xl border-none">
                  <AvatarImage src={member.photoUrl || ""} />
                  <AvatarFallback className="bg-primary/5 text-primary font-bold text-2xl flex items-center justify-center">
                    {member.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="font-headline text-xl group-hover:text-primary transition-colors">
                    <Link href={`/dashboard/members/${member.id}`}>{member.name}</Link>
                  </CardTitle>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <Phone className="w-3 h-3 mr-1" /> {member.phone || 'No Contact'}
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl p-2">
                  <DropdownMenuItem onClick={() => requestAdminAction({ type: 'edit', id: member.id })} className="rounded-lg">
                    <Edit2 className="w-4 h-4 mr-2" /> Edit Member
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => requestAdminAction({ type: 'delete', id: member.id })}
                    className="text-destructive focus:text-destructive rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Member
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-start gap-3">
                <StickyNote className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-slate-500 italic line-clamp-2">
                  {member.notes || "No additional notes provided."}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && members?.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
              <Users className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 font-bold">Your network is empty.</p>
              <p className="text-sm text-muted-foreground">Admins can add new members using the PIN.</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
        <DialogContent className="rounded-[2rem] max-w-sm">
          <DialogHeader className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="font-headline text-2xl">Admin Verification</DialogTitle>
            <DialogDescription>
              Enter the 4-digit family PIN to manage members.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Input 
              type="password" 
              placeholder="0 0 0 0" 
              maxLength={4} 
              className="text-center text-3xl tracking-[0.5em] h-16 rounded-2xl font-bold"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button className="w-full h-12 rounded-xl text-lg" onClick={handleVerifyPin}>
              Confirm PIN
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setIsPinDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
