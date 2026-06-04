
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, FileText, Table, Calendar as CalendarIcon, Loader2, Download, Send } from "lucide-react";
import { Expense, Income } from "@/lib/types";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

interface ShareExpensesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: Expense[];
  income: Income[];
  familyName?: string;
}

export function ShareExpensesDialog({
  isOpen,
  onOpenChange,
  expenses,
  income,
  familyName = "Family",
}: ShareExpensesDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [dateRange, setDateRange] = useState<"all" | "month" | "week">("all");

  const filterData = () => {
    const now = Date.now();
    let minDate = 0;
    if (dateRange === "month") minDate = now - 30 * 24 * 60 * 60 * 1000;
    if (dateRange === "week") minDate = now - 7 * 24 * 60 * 60 * 1000;

    const filteredExpenses = expenses.filter((e) => e.date >= minDate);
    const filteredIncome = income.filter((i) => i.date >= minDate);

    return { filteredExpenses, filteredIncome };
  };

  const generateCSV = () => {
    const { filteredExpenses } = filterData();
    const headers = ["Date", "Category", "Amount (INR)", "Description"];
    const rows = filteredExpenses.map((e) => [
      format(e.date, "yyyy-MM-dd"),
      e.category,
      e.amount.toFixed(2),
      e.description,
    ]);

    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");
    return new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  };

  const generatePDF = async () => {
    const { filteredExpenses, filteredIncome } = filterData();
    const doc = new jsPDF();
    const totalExp = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalInc = filteredIncome.reduce((sum, i) => sum + i.amount, 0);

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 60, 100);
    doc.text(`${familyName} Ledger Report`, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${format(new Date(), "PPpp")}`, 14, 30);
    doc.text(`Period: ${dateRange.toUpperCase()}`, 14, 35);

    // Summary Boxes
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, 45, 85, 30, 3, 3, "F");
    doc.roundedRect(105, 45, 85, 30, 3, 3, "F");

    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text("TOTAL INCOME", 18, 55);
    doc.text("TOTAL EXPENSES", 109, 55);

    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text(`INR ${totalInc.toLocaleString()}`, 18, 65);
    doc.setTextColor(180, 0, 0);
    doc.text(`INR ${totalExp.toLocaleString()}`, 109, 65);

    // Transactions Table
    (doc as any).autoTable({
      startY: 85,
      head: [["Date", "Category", "Amount (INR)", "Description"]],
      body: filteredExpenses.map((e) => [
        format(e.date, "MMM dd, yyyy"),
        e.category,
        e.amount.toLocaleString(),
        e.description,
      ]),
      theme: "grid",
      headStyles: { fillColor: [40, 60, 100], textColor: 255 },
      styles: { fontSize: 9 },
    });

    return doc.output("blob");
  };

  const handleShare = async (formatType: "pdf" | "csv") => {
    setIsGenerating(true);
    try {
      const blob = formatType === "pdf" ? await generatePDF() : generateCSV();
      const fileName = `${familyName}_Ledger_${format(new Date(), "yyyy-MM-dd")}.${formatType}`;
      const file = new File([blob], fileName, { type: blob.type });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${familyName} Ledger Report`,
          text: `Sharing our family's ${dateRange} financial summary.`,
        });
      } else {
        // Fallback to download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Sharing failed", error);
    } finally {
      setIsGenerating(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2.5rem] max-w-md">
        <DialogHeader className="text-center">
          <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Share2 className="w-7 h-7 text-accent" />
          </div>
          <DialogTitle className="font-headline text-2xl">Share Family Data</DialogTitle>
          <DialogDescription>
            Export and share the shared family ledger via WhatsApp, Email, or Telegram.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          <div className="space-y-3">
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] text-center">Select Period</p>
            <div className="flex gap-2 justify-center">
              {(["all", "month", "week"] as const).map((r) => (
                <Button
                  key={r}
                  variant={dateRange === r ? "default" : "outline"}
                  onClick={() => setDateRange(r)}
                  className="rounded-xl flex-1 h-10 text-xs capitalize"
                >
                  {r}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-24 rounded-3xl flex-col gap-2 border-slate-100 hover:bg-slate-50 transition-all group"
              onClick={() => handleShare("pdf")}
              disabled={isGenerating}
            >
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5 text-red-500" />
              </div>
              <span className="text-xs font-bold">PDF Report</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 rounded-3xl flex-col gap-2 border-slate-100 hover:bg-slate-50 transition-all group"
              onClick={() => handleShare("csv")}
              disabled={isGenerating}
            >
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Table className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xs font-bold">CSV Ledger</span>
            </Button>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          {isGenerating ? (
            <div className="flex items-center gap-2 text-accent font-bold animate-pulse text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Preparing Assets...
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground text-center">
              Uses system share dialog for WhatsApp/Telegram support.
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
