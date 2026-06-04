import { Navbar } from "@/components/layout/Navbar";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pt-16">
      <Navbar />
      <main className="max-w-5xl mx-auto p-4 md:p-8">
        <Suspense fallback={
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="w-6 h-6 animate-spin text-primary/30" />
          </div>
        }>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
