export type ExpenseCategory = 
  | "Electric Bill"
  | "LPG Cylinder"
  | "House Rent"
  | "Groceries"
  | "Medical"
  | "Education"
  | "Internet"
  | "Water Bill"
  | "Other";

export interface FamilyMember {
  id: string;
  name: string;
  phone: string;
  notes: string;
  createdAt: number;
}

export interface Expense {
  id: string;
  memberId?: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: number;
  createdAt: number;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Electric Bill",
  "LPG Cylinder",
  "House Rent",
  "Groceries",
  "Medical",
  "Education",
  "Internet",
  "Water Bill",
  "Other"
];