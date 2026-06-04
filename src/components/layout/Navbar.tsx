"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Users, BarChart2, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";
import { useAuth, useUser } from "@/firebase";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/");
  };

  const navItems = [
    { label: "Home", href: "/dashboard", icon: Home },
    { label: "Family", href: "/dashboard/members", icon: Users },
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
        <nav className="flex items-center gap-6">
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
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </nav>
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t z-50 flex items-center justify-around px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 min-w-[64px]",
              pathname === item.href ? "text-primary font-semibold" : "text-muted-foreground"
            )}
          >
            <item.icon className={cn("w-5 h-5", pathname === item.href && "stroke-[2.5px]")} />
            <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-1 min-w-[64px] text-muted-foreground"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] uppercase tracking-wider">Logout</span>
        </button>
      </nav>
    </>
  );
}
