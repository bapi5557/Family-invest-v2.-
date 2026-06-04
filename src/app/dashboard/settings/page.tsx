"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Key, Bell, Shield, Database, Smartphone, LogOut, Lock, Mail, CheckCircle2, Loader2, Download, UserPlus, Copy, Trash2, Clock, QrCode, ShieldCheck, Plus } from "lucide-react";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, setDoc, collection, query, where, addDoc, updateDoc } from "firebase/firestore";
import { updateEmail, updatePassword, signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { FamilySettings, Invite } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { format } from "date-fns";
import Link from "next/link";

export default function SettingsPage() {
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [canExport, setCanExport] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const settingsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "settings", user.uid);
  }, [db, user]);

  const invitesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    // Querying all invites for this admin to display status
    return query(collection(db, "invites"), where("ownerId", "==", user.uid));
  }, [db, user]);

  const { data: settings, loading: loadingSettings } = useDoc<FamilySettings>(settingsRef);
  const { data: invites, loading: loadingInvites } = useCollection<Invite>(invitesQuery);

  const activeInvites = useMemo(() => {
    if (!invites) return [];
    return invites
      .filter(i => !i.revoked && i.expiresAt > Date.now())
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [invites]);

  useEffect(() => {
    if (user) setNewEmail(user.email || "");
    if (settings) {
      setAdminPin(settings.adminPin);
      setCanExport(settings.canExport ?? true);
      if (settings.familyOwnerId) setIsAuthorized(true);
    }
  }, [user, settings]);

  const generateInvite = async () => {
    if (!db || !user) return;
    setIsGenerating(true);

    // Generate a secure 10-digit numeric code
    const code = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    
    const inviteData = {
      code,
      ownerId: user.uid,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      revoked: false,
    };

    try {
      await addDoc(collection(db, "invites"), inviteData);
      toast({ title: "10-Digit Code Active", description: `Invite ${code} created for your family.` });
    } catch (err) {
      const permsError = new FirestorePermissionError({ path: "invites", operation: "create", requestResourceData: inviteData });
      errorEmitter.emit("permission-error", permsError);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code Copied", description: "Invite code is ready to share." });
  };

  const revokeInvite = async (inviteId: string) => {
    if (!db) return;
    const docRef = doc(db, "invites", inviteId);
    try {
      await updateDoc(docRef, { revoked: true });
      toast({ title: "Invite Revoked", description: "This code is no longer valid." });
    } catch (err) {
      const permsError = new FirestorePermissionError({ path: docRef.path, operation: "update" });
      errorEmitter.emit("permission-error", permsError);
    }
  };

  const handleVerifyPin = () => {
    const correctPin = settings?.adminPin || "1234";
    if (pinInput === correctPin) {
      setIsAuthorized(true);
      toast({ title: "Admin Access Granted" });
    } else {
      toast({ variant: "destructive", title: "Invalid PIN" });
    }
    setPinInput("");
  };

  const handleUpdateAccount = async () => {
    if (!auth?.currentUser) return;
    setLoading(true);
    try {
      if (newEmail !== auth.currentUser.email) await updateEmail(auth.currentUser, newEmail);
      if (newPassword) await updatePassword(auth.currentUser, newPassword);
      toast({ title: "Account Updated" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Action Required", description: "Please re-login to update security credentials." });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSecuritySettings = () => {
    if (!db || !user) return;
    const docRef = doc(db, "settings", user.uid);
    const updateData = { adminPin, canExport, updatedAt: Date.now(), ownerId: user.uid };
    setDoc(docRef, updateData, { merge: true })
      .catch(async (serverError) => {
        errorEmitter.emit("permission-error", new FirestorePermissionError({ path: docRef.path, operation: "update", requestResourceData: updateData }));
      });
    toast({ title: "Security Preferences Saved" });
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/");
  };

  if (!isAuthorized && !loadingSettings) {
    return (
      <div className="max-w-md mx-auto py-20 space-y-6 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <Lock className="w-10 h-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-headline">Admin Control</h1>
          <p className="text-muted-foreground">Enter family PIN to manage secure settings.</p>
        </div>
        <Card className="p-8 border-none shadow-xl rounded-[2rem]">
          <div className="space-y-4">
            <Input type="password" placeholder="0 0 0 0" maxLength={4} className="text-center text-2xl tracking-[1em] h-16 rounded-2xl" value={pinInput} onChange={(e) => setPinInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()} />
            <Button className="w-full h-12 rounded-xl text-lg font-bold" onClick={handleVerifyPin}>Authorize</Button>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Default PIN: 1234</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline text-primary">Family Governance</h1>
          <p className="text-muted-foreground font-medium">Control center for {settings?.familyName || 'your Family'}</p>
        </div>
        <div className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-3 h-3" /> Admin Mode Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {!settings?.familyOwnerId && (
            <Card className="rounded-[2rem] shadow-xl border-none overflow-hidden bg-accent/5">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-6 h-6 text-accent" />
                    <div>
                      <CardTitle className="font-headline text-accent">Active Invitations</CardTitle>
                      <CardDescription>Generated 10-digit codes for your family.</CardDescription>
                    </div>
                  </div>
                  <Button onClick={generateInvite} disabled={isGenerating} size="sm" className="rounded-xl h-10 bg-accent hover:bg-accent/90">
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    New Code
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-4">
                {loadingInvites ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-accent/20" /></div>
                ) : activeInvites.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {activeInvites.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-accent/10 shadow-sm transition-all hover:shadow-md">
                        <div className="space-y-1">
                          <p className="text-2xl font-code font-black text-primary tracking-widest">{invite.code}</p>
                          <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Expires {format(invite.expiresAt, "MMM dd")}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => copyCode(invite.code)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive" onClick={() => revokeInvite(invite.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 border-2 border-dashed border-accent/10 rounded-2xl bg-white/50">
                    <p className="text-sm text-slate-400 font-medium">No active invite codes.</p>
                    <Button variant="link" className="text-accent text-xs font-bold uppercase tracking-widest mt-1" onClick={generateInvite}>Click to generate first code</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="rounded-[2rem] shadow-lg border-none overflow-hidden">
            <CardHeader className="bg-slate-50 border-b p-8">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="font-headline">Login Credentials</CardTitle>
                  <CardDescription>Update shared family email and password.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-xs uppercase font-bold text-slate-400">Shared Family Email</Label>
                <Input id="email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="h-12 rounded-xl border-slate-200" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pass" className="text-xs uppercase font-bold text-slate-400">New Shared Password</Label>
                <Input id="pass" type="password" placeholder="Leave blank to keep current" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-12 rounded-xl border-slate-200" />
              </div>
              <Button className="w-full h-12 rounded-xl shadow-lg" onClick={handleUpdateAccount} disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Save Shared Changes"}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] shadow-lg border-none overflow-hidden">
            <CardHeader className="bg-slate-50 border-b p-8">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-accent" />
                <div>
                  <CardTitle className="font-headline">Privacy & Safety</CardTitle>
                  <CardDescription>Manage family PIN and member permissions.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="pin" className="text-xs uppercase font-bold text-slate-400">New 4-Digit Admin PIN</Label>
                <Input id="pin" type="password" maxLength={4} placeholder="e.g. 5678" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} className="h-12 rounded-xl text-center text-xl tracking-[1em] border-slate-200" />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">Data Export Rights</Label>
                  <p className="text-xs text-muted-foreground">Allow all members to share PDF/CSV reports.</p>
                </div>
                <Switch checked={canExport} onCheckedChange={setCanExport} />
              </div>
              <Button variant="outline" className="w-full h-12 rounded-xl border-accent text-accent hover:bg-accent/5" onClick={handleUpdateSecuritySettings}>
                Update Security Preferences
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2rem] shadow-xl border-none bg-primary text-white p-8 overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 opacity-10"><Shield className="w-32 h-32" /></div>
            <CardTitle className="font-headline text-2xl mb-6">System Management</CardTitle>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start h-12 rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Database className="w-4 h-4 mr-3" /> Ledger Backup
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-3" /> Secure Logout
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
