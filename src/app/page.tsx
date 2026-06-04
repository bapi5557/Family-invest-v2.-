import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TrendingUp, ShieldCheck, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-xl mb-6">
            <span className="text-white font-headline text-4xl">K</span>
          </div>
          <h1 className="text-5xl font-headline text-primary tracking-tight">KinVest</h1>
          <p className="text-muted-foreground mt-2 font-medium">Family Investment Manager</p>
        </div>

        <Card className="p-8 shadow-2xl border-none">
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Secure your family's future</h2>
              <p className="text-sm text-muted-foreground">Manage expenses, track investments, and get AI insights in one unified dashboard.</p>
            </div>

            <div className="space-y-3">
              <Button className="w-full h-12 text-lg shadow-lg" asChild>
                <Link href="/login">Log In</Link>
              </Button>
              <Button variant="outline" className="w-full h-12 text-lg" asChild>
                <Link href="/register">Register</Link>
              </Button>
            </div>

            <Link href="/forgot-password" size="sm" className="text-xs text-muted-foreground hover:text-primary transition-colors block">
              Forgot password?
            </Link>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-4 text-center mt-12">
          <div className="flex flex-col items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <span className="text-[10px] uppercase font-bold text-slate-400">Secure</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            <span className="text-[10px] uppercase font-bold text-slate-400">Real-time</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            <span className="text-[10px] uppercase font-bold text-slate-400">Insights</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-[2rem] ${className}`}>{children}</div>;
}