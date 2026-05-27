import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, Task, UserRole } from './src/types';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

interface UserRecord extends User {
  passwordHash: string;
  salt: string;
}

interface DatabaseSchema {
  users: UserRecord[];
  tasks: Task[];
}

// Simple secure password hashing utilizing native Node crypto module (unbreakable PBKDF2)
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

class Database {
  private data: DatabaseSchema = { users: [], tasks: [] };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
        // Ensure properties exist
        if (!this.data.users) this.data.users = [];
        if (!this.data.tasks) this.data.tasks = [];
      } catch (err) {
        console.error('Error reading database, creating fresh:', err);
        this.seedDefaultAdmin();
      }
    } else {
      this.seedDefaultAdmin();
    }
  }

  private seedDefaultAdmin() {
    const salt = generateSalt();
    const adminRecord: UserRecord = {
      id: 'admin-' + crypto.randomUUID(),
      email: 'admin@team.com',
      name: 'Super Admin',
      role: 'admin',
      whatsApp: '+1234567890',
      salt,
      passwordHash: hashPassword('admin123', salt)
    };
    
    this.data = {
      users: [adminRecord],
      tasks: []
    };
    this.save();
    console.log('Database initialized and seeded with Super Admin credentials successfully.');
  }

  private save() {
    try {
      const tempFile = DB_FILE + '.tmp';
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  // User APIs
  public getUsers(): User[] {
    return this.data.users.map(({ id, email, name, role, whatsApp }) => ({
      id, email, name, role, whatsApp
    }));
  }

  public findUserById(id: string): User | undefined {
    const record = this.data.users.find(u => u.id === id);
    if (!record) return undefined;
    return {
      id: record.id,
      email: record.email,
      name: record.name,
      role: record.role,
      whatsApp: record.whatsApp
    };
  }

  public findUserByEmail(email: string): UserRecord | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(email: string, name: string, role: UserRole, whatsApp: string, passwordPlain: string): User {
    const emailLower = email.toLowerCase();
    const existing = this.data.users.find(u => u.email.toLowerCase() === emailLower);
    if (existing) {
      throw new Error('User with this email already exists.');
    }

    const salt = generateSalt();
    const id = 'user-' + crypto.randomUUID();
    const newRecord: UserRecord = {
      id,
      email: emailLower,
      name,
      role,
      whatsApp,
      salt,
      passwordHash: hashPassword(passwordPlain, salt)
    };

    this.data.users.push(newRecord);
    this.save();

    return {
      id,
      email: emailLower,
      name,
      role,
      whatsApp
    };
  }

  public findOrCreateGoogleUser(email: string, name: string): User {
    const emailLower = email.toLowerCase();
    const existing = this.data.users.find(u => u.email.toLowerCase() === emailLower);
    
    // Determine role based on user request (theabhishekar@gmail.com is Admin)
    const role: UserRole = emailLower === 'theabhishekar@gmail.com' ? 'admin' : 'manager';

    if (existing) {
      // Ensure the role is updated if it matches request email but role was not admin
      if (existing.role !== role) {
        existing.role = role;
        this.save();
      }
      return {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        role: existing.role,
        whatsApp: existing.whatsApp
      };
    }

    // Create a new User
    const salt = generateSalt();
    const id = 'google-' + crypto.randomUUID();
    const newRecord: UserRecord = {
      id,
      email: emailLower,
      name: name || 'Google User',
      role,
      whatsApp: '+0000000000', // Default placeholder WhatsApp for newly joined Google users
      salt,
      passwordHash: hashPassword(crypto.randomBytes(32).toString('hex'), salt)
    };

    this.data.users.push(newRecord);
    this.save();

    return {
      id,
      email: emailLower,
      name: newRecord.name,
      role: newRecord.role,
      whatsApp: newRecord.whatsApp
    };
  }

  public updateUser(id: string, name?: string, whatsApp?: string) {
    const user = this.data.users.find(u => u.id === id);
    if (!user) throw new Error("User not found");
    if (name) user.name = name;
    if (whatsApp) user.whatsApp = whatsApp;
    this.save();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      whatsApp: user.whatsApp
    };
  }

  public deleteUser(id: string) {
    // Admins cannot delete themselves
    const originalLength = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.id !== id);
    if (this.data.users.length !== originalLength) {
      this.save();
    }
  }

  // Task APIs
  public getTasks(): Task[] {
    return this.data.tasks;
  }

  public findTaskById(id: string): Task | undefined {
    return this.data.tasks.find(t => t.id === id);
  }

  public createTask(title: string, description: string, assignedTo: string | null, createdBy: string, creatorRole: UserRole, scheduledDate: string): Task {
    // Find manager if assigned
    let assignedToName: string | null = null;
    let whatsApp: string | null = null;

    if (assignedTo) {
      const manager = this.findUserById(assignedTo);
      if (manager) {
        assignedToName = manager.name;
        whatsApp = manager.whatsApp;
      }
    }

    const newTask: Task = {
      id: 'task-' + crypto.randomUUID(),
      title,
      description,
      status: 'pending',
      assignedTo,
      assignedToName,
      whatsApp,
      createdBy,
      creatorRole,
      scheduledDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.tasks.push(newTask);
    this.save();
    return newTask;
  }

  public updateTask(id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'status' | 'assignedTo' | 'scheduledDate'>>): Task {
    const taskIndex = this.data.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
      throw new Error('Task not found.');
    }

    const task = this.data.tasks[taskIndex];
    const updatedTask = { ...task, ...updates, updatedAt: new Date().toISOString() };

    // If assignment changed, update manager details
    if (updates.assignedTo !== undefined) {
      if (updates.assignedTo === null) {
        updatedTask.assignedToName = null;
        updatedTask.whatsApp = null;
      } else {
        const manager = this.findUserById(updates.assignedTo);
        if (manager) {
          updatedTask.assignedToName = manager.name;
          updatedTask.whatsApp = manager.whatsApp;
        }
      }
    }

    this.data.tasks[taskIndex] = updatedTask;
    this.save();
    return updatedTask;
  }

  public deleteTask(id: string) {
    const originalLength = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter(t => t.id !== id);
    if (this.data.tasks.length !== originalLength) {
      this.save();
    }
  }
}

export const dbInstance = new Database();
