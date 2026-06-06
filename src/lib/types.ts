
import { 
  Home, Zap, Flame, Droplets, Smartphone, Wifi, Fuel, Bus, 
  Shirt, ShoppingCart, Utensils, Soup, Pencil, GraduationCap, 
  Stethoscope, Pill, Banknote, Users, TrendingUp, Gift, 
  PartyPopper, Wrench, Sprout, Shield, Tv, MoreHorizontal,
  LucideIcon
} from "lucide-react";

export type ExpenseCategory = 
  | "House Rent"
  | "Electricity Bill"
  | "LPG Cylinder"
  | "Water Bill"
  | "Mobile Recharge"
  | "Internet/WiFi"
  | "Petrol"
  | "Transport"
  | "Clothes"
  | "Groceries"
  | "Food"
  | "Utensils"
  | "Stationery"
  | "Education"
  | "Medical"
  | "Medicines"
  | "Loan"
  | "Group Loan"
  | "Investment"
  | "Gifts"
  | "Festival"
  | "Repairs"
  | "Agriculture"
  | "Insurance"
  | "Entertainment"
  | "Other"
  | string;

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
export type SnoozeOption = "10_MIN" | "1_HOUR" | "TOMORROW";

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
  triggeredAt?: number;
}

export interface FamilySettings {
  adminPin: string;
  familyName?: string;
  canExport?: boolean;
  ownerId: string;
  familyOwnerId?: string;
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

export interface FamilyNotification {
  id: string;
  message: string;
  details: string;
  type: 'expense' | 'member' | 'reminder' | 'system';
  timestamp: number;
  ownerId: string;
  readBy: string[];
  hiddenBy: string[];
  createdBy: string;
  createdByName: string;
}

export const DEFAULT_EXPENSE_CATEGORIES: { label: ExpenseCategory; icon: LucideIcon }[] = [
  { label: "House Rent", icon: Home },
  { label: "Electricity Bill", icon: Zap },
  { label: "LPG Cylinder", icon: Flame },
  { label: "Water Bill", icon: Droplets },
  { label: "Mobile Recharge", icon: Smartphone },
  { label: "Internet/WiFi", icon: Wifi },
  { label: "Petrol", icon: Fuel },
  { label: "Transport", icon: Bus },
  { label: "Clothes", icon: Shirt },
  { label: "Groceries", icon: ShoppingCart },
  { label: "Food", icon: Utensils },
  { label: "Utensils", icon: Soup },
  { label: "Stationery", icon: Pencil },
  { label: "Education", icon: GraduationCap },
  { label: "Medical", icon: Stethoscope },
  { label: "Medicines", icon: Pill },
  { label: "Loan", icon: Banknote },
  { label: "Group Loan", icon: Users },
  { label: "Investment", icon: TrendingUp },
  { label: "Gifts", icon: Gift },
  { label: "Festival", icon: PartyPopper },
  { label: "Repairs", icon: Wrench },
  { label: "Agriculture", icon: Sprout },
  { label: "Insurance", icon: Shield },
  { label: "Entertainment", icon: Tv },
  { label: "Other", icon: MoreHorizontal }
];

export const EXPENSE_CATEGORIES = DEFAULT_EXPENSE_CATEGORIES.map(c => c.label);

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

export function getCategoryIcon(category: string): LucideIcon {
  const match = DEFAULT_EXPENSE_CATEGORIES.find(c => c.label === category);
  return match ? match.icon : MoreHorizontal;
}
