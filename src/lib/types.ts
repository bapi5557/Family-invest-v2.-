
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

export type ReminderCategory = 
  | "Bill Payment"
  | "Loan EMI"
  | "Investment"
  | "Insurance Renewal"
  | "SIP/Mutual Fund"
  | "Family Event"
  | "Birthday"
  | "Anniversary"
  | "Other";

export type Priority = "Low" | "Medium" | "High";
export type RecurringType = "None" | "Daily" | "Weekly" | "Monthly" | "Yearly";

export interface FamilyMember {
  id: string;
  name: string;
  phone: string;
  notes: string;
  photoUrl?: string;
  createdAt: number;
  ownerId: string;
}

export interface Expense {
  id: string;
  memberId?: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: number;
  createdAt: number;
  ownerId: string;
}

export interface Income {
  id: string;
  source: string;
  amount: number;
  date: number;
  createdAt: number;
  ownerId: string;
}

export interface Reminder {
  id: string;
  title: string;
  description: string;
  date: number;
  time: string;
  category: ReminderCategory;
  priority: Priority;
  isRecurring: boolean;
  recurringType: RecurringType;
  isGlobal: boolean;
  completed: boolean;
  ownerId: string;
  createdBy: string;
  createdAt: number;
}

export interface FamilySettings {
  adminPin: string;
  familyName?: string;
  canExport?: boolean;
  ownerId: string;
  familyOwnerId?: string; // If set, this user is a member of this family
  updatedAt: number;
}

export interface Invite {
  id: string;
  code: string;
  ownerId: string;
  expiresAt: number;
  createdAt: number;
  revoked: boolean;
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

export const REMINDER_CATEGORIES: ReminderCategory[] = [
  "Bill Payment",
  "Loan EMI",
  "Investment",
  "Insurance Renewal",
  "SIP/Mutual Fund",
  "Family Event",
  "Birthday",
  "Anniversary",
  "Other"
];
