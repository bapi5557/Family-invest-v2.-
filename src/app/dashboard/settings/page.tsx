
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Key, Bell, Shield, Database, Smartphone, LogOut, Lock, Mail, CheckCircle2, Loader2, Download, UserPlus } from "lucide-react";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { updateEmail, updatePassword, signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { FamilySettings } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
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

  const settingsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, "settings", user.uid);
  }, [db, user]);

  const { data: settings, loading: loadingSettings } = useDoc<FamilySettings>(settingsRef);

  useEffect(() => {
    if (user) setNewEmail(user.email || "");
    if (settings) {
      setAdminPin(settings.adminPin);
      setCanExport(settings.canExport ?? true);
      // Auto-authorize if this is a member profile (limited scope)
      if (settings.familyOwnerId) setIsAuthorized(true);
    }
  }, [user, settings]);

  const handleVerifyPin = () => {
    const correctPin = settings?.adminPin || "1234";
    if (pinInput === correctPin) {
      setIsAuthorized(true);
      toast({ title: "Admin Access Granted", description: "You can now manage sensitive settings." });
    } else {
      toast({ variant: "destructive", title: "Invalid PIN", description: "Please enter the correct family admin PIN." });
    }
    setPinInput("");
  };

  const handleUpdateAccount = async () => {
    if (!auth?.currentUser) return;
    setLoading(true);
    try {
      if (newEmail !== auth.currentUser.email) {
        await updateEmail(auth.currentUser, newEmail);
      }
      if (newPassword) {
        await updatePassword(auth.currentUser, newPassword);
      }
      toast({ title: "Account Updated", description: "Family credentials updated successfully." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: "Security requirement: Please log out and back in to change credentials." });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSecuritySettings = () => {
    if (!db || !user) return;
    const docRef = doc(db, "settings", user.uid);
    const updateData = { 
      adminPin, 
      canExport,
      updatedAt: Date.now(), 
      ownerId: user.uid 
    };
    
    setDoc(docRef, updateData, { merge: true })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: "update",
          requestResourceData: updateData,
        });
        errorEmitter.emit("permission-error", permissionError);
      });
      
    toast({ title: "Security Settings Updated", description: "New Admin preferences are now active." });
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
          <h1 className="text-3xl font-headline">Admin Access</h1>
          <p className="text-muted-foreground">Enter your family PIN to manage account settings.</p>
        </div>
        <Card className="p-8 border-none shadow-xl rounded-[2rem]">
          <div className="space-y-4">
            <Input 
              type="password" 
              placeholder="Enter 4-digit PIN" 
              maxLength={4} 
              className="text-center text-2xl tracking-[1em] h-16 rounded-2xl"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
            />
            <Button className="w-full h-12 rounded-xl text-lg" onClick={handleVerifyPin}>
              Verify Identity
            </Button>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Default PIN is 1234</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline text-primary">Family Admin</h1>
          <p className="text-muted-foreground">Secure control center for {user?.displayName} Family</p>
        </div>
        <div className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-3 h-3" /> Admin Mode
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {!settings?.familyOwnerId && (
            <Card className="rounded-[2rem] shadow-lg border-none overflow-hidden bg-accent/5">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-6 h-6 text-accent" />
                  <div>
                    <CardTitle className="font-headline text-accent">Member Invitations</CardTitle>
                    <CardDescription>Generate secure QR codes for family to join without passwords.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                <Button className="w-full h-12 rounded-xl bg-accent hover:bg-accent/90" asChild>
                  <Link href="/dashboard/settings/invites">Manage Active Invites</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-[2rem] shadow-lg border-none overflow-hidden">
            <CardHeader className="bg-slate-50 border-b p-8">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="font-headline">Shared Credentials</CardTitle>
                  <CardDescription>Update the family login details used by everyone.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Shared Family Email</Label>
                <Input id="email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="h-12 rounded-xl" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pass">New Shared Password</Label>
                <Input id="pass" type="password" placeholder="Leave blank to keep current" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-12 rounded-xl" />
              </div>
              <Button className="w-full h-12 rounded-xl" onClick={handleUpdateAccount} disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Shared Changes"}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] shadow-lg border-none overflow-hidden">
            <CardHeader className="bg-slate-50 border-b p-8">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-accent" />
                <div>
                  <CardTitle className="font-headline">Security & Permissions</CardTitle>
                  <CardDescription>Manage PIN and data export rights.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="pin">New 4-Digit PIN</Label>
                <Input 
                  id="pin" 
                  type="password" 
                  maxLength={4} 
                  placeholder="e.g. 5678" 
                  value={adminPin} 
                  onChange={(e) => setAdminPin(e.target.value)} 
                  className="h-12 rounded-xl text-center text-xl tracking-widest" 
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-0.5">
                  <Label className="text-base">Allow Data Export</Label>
                  <p className="text-xs text-muted-foreground">Enable CSV/PDF sharing for all family members.</p>
                </div>
                <Switch 
                  checked={canExport}
                  onCheckedChange={setCanExport}
                />
              </div>
              <Button variant="outline" className="w-full h-12 rounded-xl border-accent text-accent hover:bg-accent/5" onClick={handleUpdateSecuritySettings}>
                Update Admin Preferences
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2rem] shadow-lg border-none bg-primary text-white p-8">
            <CardTitle className="font-headline mb-4">Quick Links</CardTitle>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start h-12 rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Database className="w-4 h-4 mr-3" /> Data Backup
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Shield className="w-4 h-4 mr-3" /> Privacy Policy
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-3" /> Family Logout
              </Button>
            </div>
          </Card>
          
          <div className="text-center p-4">
             <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">KinVest Admin Panel v1.2</p>
          </div>
        </div>
      </div>
    </div>
  );
}
