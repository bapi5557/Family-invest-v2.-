import { Navbar } from "@/components/layout/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pt-16">
      <Navbar />
      <main className="max-w-5xl mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}