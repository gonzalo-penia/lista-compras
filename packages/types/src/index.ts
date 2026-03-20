// User & Auth
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: Date;
}

// Family
export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  members: User[];
  createdAt: Date;
}

// Shopping List
export interface ShoppingList {
  id: string;
  familyId: string;
  name: string;
  trackExpenses: boolean;
  settled: boolean;
  items: ShoppingItem[];
  expenses: Expense[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoppingItem {
  id: string;
  listId: string;
  name: string;
  quantity?: number;
  unit?: string;
  checked: boolean;
  checkedBy?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Expenses
export interface Expense {
  id: string;
  listId: string;
  userId: string;
  amount: number;
  description?: string | null;
  user: Pick<User, 'id' | 'name' | 'picture'>;
  createdAt: Date;
}

// Socket events
export type SocketEvent =
  | { type: 'ITEM_ADDED'; payload: ShoppingItem }
  | { type: 'ITEM_UPDATED'; payload: ShoppingItem }
  | { type: 'ITEM_DELETED'; payload: { id: string } }
  | { type: 'ITEM_CHECKED'; payload: { id: string; checked: boolean; checkedBy: string } };
