
import { FamilyMember, Expense } from "./types";

export const MOCK_MEMBERS: FamilyMember[] = [
  {
    id: "1",
    name: "John Doe",
    phone: "+91 98765 43210",
    notes: "Primary earner",
    createdAt: Date.now(),
  },
  {
    id: "2",
    name: "Jane Doe",
    phone: "+91 87654 32109",
    notes: "Home manager",
    createdAt: Date.now(),
  },
];

export const MOCK_EXPENSES: Expense[] = [
  {
    id: "e1",
    category: "Groceries",
    amount: 12500.50,
    description: "Weekly groceries at Reliance Fresh",
    date: Date.now(),
    createdAt: Date.now(),
    memberId: "2",
  },
  {
    id: "e2",
    category: "Electric Bill",
    amount: 4500.00,
    description: "Monthly electricity bill",
    date: Date.now() - 86400000 * 2,
    createdAt: Date.now(),
  },
  {
    id: "e3",
    category: "House Rent",
    amount: 25000.00,
    description: "January Rent",
    date: Date.now() - 86400000 * 10,
    createdAt: Date.now(),
  }
];
