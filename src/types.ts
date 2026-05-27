export type UserRole = 'admin' | 'manager';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  whatsApp: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedTo: string | null; // Id of the manager
  assignedToName: string | null; // Name of the manager
  whatsApp: string | null; // WhatsApp of the manager
  createdBy: string; // User ID of creator
  creatorRole: UserRole; // Role of creator
  scheduledDate: string; // YYYY-MM-DD format
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}
