"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Key, Bell, Shield, Database, Smartphone, LogOut } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-headline text-primary">Settings</h1>
        <p className="text-muted-foreground">Manage your account and app preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Key className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="font-headline">Security</CardTitle>
                <CardDescription>Change password and secure your account</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="current">Current Password</Label>
                <Input id="current" type="password" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new">New Password</Label>
                <Input id="new" type="password" />
              </div>
              <Button className="w-full sm:w-auto">Update Password</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="font-headline">Notifications</CardTitle>
                <CardDescription>Control how you receive alerts</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Expense Alerts</p>
                  <p className="text-xs text-muted-foreground">Notify when high-value expenses are added</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Monthly Summary</p>
                  <p className="text-xs text-muted-foreground">Receive AI insights via email each month</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20">
             <CardHeader className="flex flex-row items-center gap-3">
              <LogOut className="w-5 h-5 text-destructive" />
              <div>
                <CardTitle className="font-headline text-destructive">Account Actions</CardTitle>
                <CardDescription>Careful with these options</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Button variant="destructive" className="w-full sm:w-auto">Sign Out of All Devices</Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-lg">Backup & Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start text-sm border-slate-200">
                <Database className="w-4 h-4 mr-3" /> Backup Data
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm border-slate-200">
                <Shield className="w-4 h-4 mr-3" /> Privacy Policy
              </Button>
              <Button variant="outline" className="w-full justify-start text-sm border-slate-200">
                <Smartphone className="w-4 h-4 mr-3" /> Mobile App Link
              </Button>
            </CardContent>
          </Card>

          <div className="text-center p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">KinVest v1.0.4</p>
          </div>
        </div>
      </div>
    </div>
  );
}