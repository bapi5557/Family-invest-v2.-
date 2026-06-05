
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, BarChart2, Settings, LogOut, Bell, WifiOff, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";
import { useAuth, useUser, useConnectionStatus } from "@/firebase";
import { NotificationsBell } from "@/components/NotificationsBell";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const { isOnline, isSyncing } = useConnectionStatus();

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/");
  };

  const navItems = [
    { label: "Home", href: "/dashboard", icon: Home },
    { label: "Family", href: "/dashboard/members", icon: Users },
    { label: "Reminders", href: "/dashboard/reminders", icon: Bell },
    { label: "Reports", href: "/dashboard/reports", icon: BarChart2 },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <>
      <header className="hidden md:flex fixed top-0 left-0 right-0 h-16 bg-white border-b z-50 px-6 items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-headline text-xl">K</span>
          </div>
          <div>
            <span className="font-headline text-2xl text-primary tracking-tight">KinVest</span>
            {user?.displayName && (
              <span className="ml-2 text-[10px] uppercase font-bold text-accent tracking-widest">
                {user.displayName} Family
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100">
            {!isOnline ? (
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 animate-pulse">
                <WifiOff className="w-3.5 h-3.5" /> Offline Mode
              </div>
            ) : isSyncing ? (
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary animate-spin">
                <RefreshCcw className="w-3.5 h-3.5" /> Syncing...
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-green-600">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Live
              </div>
            )}
          </div>
          
          <nav className="flex items-center gap-4">
            <NotificationsBell />
            <div className="h-6 w-px bg-slate-200 mx-2" />
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === item.href ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-xl">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </nav>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t z-50 flex items-center justify-around px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 min-w-[56px]",
              pathname === item.href ? "text-primary font-semibold" : "text-muted-foreground"
            )}
          >
            <item.icon className={cn("w-5 h-5", pathname === item.href && "stroke-[2.5px]")} />
            <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
          </Link>
        ))}
        <div className="flex flex-col items-center justify-center gap-1 min-w-[56px]">
          <NotificationsBell />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Alerts</span>
        </div>
      </nav>

      {!isOnline && (
        <div className="md:hidden fixed top-0 left-0 right-0 h-8 bg-red-500 text-white z-[100] flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] shadow-md animate-in slide-in-from-top duration-300">
          <WifiOff className="w-3 h-3" /> Offline Mode Active
        </div>
      )}
    </>
  );
}
