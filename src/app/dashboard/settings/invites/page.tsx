
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Clock, CheckCircle2, QrCode, ArrowLeft, Loader2, Copy } from "lucide-react";
import Link from "next/link";
import { collection, query, where, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { Invite } from "@/lib/types";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function InviteManagementPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null);

  const invitesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "invites"), where("ownerId", "==", user.uid));
  }, [db, user]);

  const { data: invites, loading } = useCollection<Invite>(invitesQuery);

  const generateInvite = async () => {
    if (!db || !user) return;
    setIsGenerating(true);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `KINVEST-${randomSuffix}`;
    const inviteData = {
      code,
      ownerId: user.uid,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      revoked: false,
    };

    try {
      await addDoc(collection(db, "invites"), inviteData);
      toast({ title: "Invite Code Generated", description: `Code ${code} is active for 7 days.` });
    } catch (err) {
      const permsError = new FirestorePermissionError({ path: "invites", operation: "create", requestResourceData: inviteData });
      errorEmitter.emit("permission-error", permsError);
    } finally {
      setIsGenerating(false);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    if (!db) return;
    const docRef = doc(db, "invites", inviteId);
    try {
      await updateDoc(docRef, { revoked: true });
      toast({ title: "Invite Revoked", description: "The code can no longer be used." });
    } catch (err) {
      const permsError = new FirestorePermissionError({ path: docRef.path, operation: "update" });
      errorEmitter.emit("permission-error", permsError);
    }
  };

  const deleteInvite = async (inviteId: string) => {
    if (!db) return;
    const docRef = doc(db, "invites", inviteId);
    try {
      await deleteDoc(docRef);
      toast({ variant: "destructive", title: "Invite Deleted", description: "Code removed from history." });
    } catch (err) {
      const permsError = new FirestorePermissionError({ path: docRef.path, operation: "delete" });
      errorEmitter.emit("permission-error", permsError);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Invite code copied to clipboard." });
  };

  const joinUrl = (code: string) => `${window.location.origin}/join?code=${code}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/settings" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Settings
        </Link>
        <Button onClick={generateInvite} disabled={isGenerating} className="rounded-full shadow-lg h-12 px-6">
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          Generate New Invite
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-headline text-primary">Family Invites</h1>
        <p className="text-muted-foreground font-body">Manage member access codes and QR invitations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary/20" /></div>
        ) : invites?.map((invite) => {
          const isExpired = invite.expiresAt < Date.now();
          const isActive = !invite.revoked && !isExpired;

          return (
            <Card key={invite.id} className={`rounded-[2rem] border-none shadow-sm transition-all overflow-hidden ${!isActive ? 'opacity-50' : ''}`}>
              <div className={`h-2 w-full ${isActive ? 'bg-green-400' : 'bg-slate-300'}`} />
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {isActive ? 'Active' : invite.revoked ? 'Revoked' : 'Expired'}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => copyToClipboard(invite.code)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedInvite(invite)}>
                      <QrCode className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-black tracking-tight text-primary font-code">{invite.code}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <Clock className="w-3 h-3" />
                    Expires {format(invite.expiresAt, "PP")}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-50">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs font-bold text-slate-400 hover:text-destructive rounded-xl"
                    onClick={() => isActive ? revokeInvite(invite.id) : deleteInvite(invite.id)}
                  >
                    <Trash2 className="w-3 h-3 mr-2" /> {isActive ? 'Revoke Access' : 'Delete History'}
                  </Button>
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                    Created {format(invite.createdAt, "MMM d")}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!loading && invites?.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <QrCode className="w-12 h-12 text-slate-200 mx-auto" />
            <p className="text-slate-500 font-bold">No invite codes generated yet.</p>
            <Button onClick={generateInvite} variant="link" className="text-primary font-bold">Create your first invite</Button>
          </div>
        )}
      </div>

      <Dialog open={!!selectedInvite} onOpenChange={(open) => !open && setSelectedInvite(null)}>
        <DialogContent className="rounded-[2.5rem] max-w-sm">
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-headline">Family Invite QR</DialogTitle>
            <DialogDescription>
              Scan this code to join the <strong>{user?.displayName || 'Family'}</strong> instantly.
            </DialogDescription>
          </DialogHeader>
          {selectedInvite && (
            <div className="py-6 flex flex-col items-center space-y-6">
              <div className="bg-white p-4 rounded-3xl shadow-inner border">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl(selectedInvite.code))}`} 
                  alt="Invite QR Code"
                  className="w-48 h-48"
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Invite Code</p>
                <p className="text-2xl font-code font-bold text-primary">{selectedInvite.code}</p>
              </div>
              <Button className="w-full h-12 rounded-xl font-bold" onClick={() => copyToClipboard(joinUrl(selectedInvite.code))}>
                Copy Invite Link
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
