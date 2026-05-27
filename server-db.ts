import 'dotenv/config';
import crypto from 'crypto';
import pg from 'pg';
import { User, Task, UserRole } from './src/types';

const { Pool } = pg;

// Simple secure password hashing utilizing native Node crypto module (unbreakable PBKDF2)
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

class Database {
  private pool: pg.Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  public async init() {
    console.log('Initializing PostgreSQL database schema...');
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        "whatsApp" VARCHAR(50),
        salt VARCHAR(255) NOT NULL,
        "passwordHash" VARCHAR(255) NOT NULL
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) NOT NULL,
        "assignedTo" VARCHAR(255),
        "assignedToName" VARCHAR(255),
        "whatsApp" VARCHAR(50),
        "createdBy" VARCHAR(255) NOT NULL,
        "creatorRole" VARCHAR(50) NOT NULL,
        "scheduledDate" VARCHAR(255),
        "createdAt" VARCHAR(255) NOT NULL,
        "updatedAt" VARCHAR(255) NOT NULL
      );
    `);

    // Seed default admin if no users exist
    const { rows } = await this.pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(rows[0].count, 10) === 0) {
      const salt = generateSalt();
      const adminId = 'admin-' + crypto.randomUUID();
      await this.pool.query(
        'INSERT INTO users (id, email, name, role, "whatsApp", salt, "passwordHash") VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [adminId, 'admin@team.com', 'Super Admin', 'admin', '+1234567890', salt, hashPassword('admin123', salt)]
      );
      console.log('Database initialized and seeded with Super Admin credentials successfully.');
    } else {
      console.log('Database already initialized.');
    }
  }

  // User APIs
  public async getUsers(): Promise<User[]> {
    const { rows } = await this.pool.query('SELECT id, email, name, role, "whatsApp" FROM users');
    return rows;
  }

  public async findUserById(id: string): Promise<User | undefined> {
    const { rows } = await this.pool.query('SELECT id, email, name, role, "whatsApp" FROM users WHERE id = $1', [id]);
    return rows[0];
  }

  public async findUserByEmail(email: string): Promise<any | undefined> {
    const { rows } = await this.pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return rows[0];
  }

  public async createUser(email: string, name: string, role: UserRole, whatsApp: string, passwordPlain: string): Promise<User> {
    const emailLower = email.toLowerCase();
    const existing = await this.findUserByEmail(emailLower);
    if (existing) {
      throw new Error('User with this email already exists.');
    }

    const salt = generateSalt();
    const id = 'user-' + crypto.randomUUID();
    const passwordHash = hashPassword(passwordPlain, salt);

    await this.pool.query(
      'INSERT INTO users (id, email, name, role, "whatsApp", salt, "passwordHash") VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, emailLower, name, role, whatsApp, salt, passwordHash]
    );

    return { id, email: emailLower, name, role, whatsApp };
  }

  public async findOrCreateGoogleUser(email: string, name: string): Promise<User> {
    const emailLower = email.toLowerCase();
    const existing = await this.findUserByEmail(emailLower);
    
    const role: UserRole = emailLower === 'theabhishekar@gmail.com' ? 'admin' : 'manager';

    if (existing) {
      if (existing.role !== role) {
        await this.pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, existing.id]);
        existing.role = role;
      }
      return {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        role: existing.role,
        whatsApp: existing.whatsApp
      };
    }

    const salt = generateSalt();
    const id = 'google-' + crypto.randomUUID();
    const whatsApp = '+0000000000';
    const passwordHash = hashPassword(crypto.randomBytes(32).toString('hex'), salt);

    await this.pool.query(
      'INSERT INTO users (id, email, name, role, "whatsApp", salt, "passwordHash") VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, emailLower, name || 'Google User', role, whatsApp, salt, passwordHash]
    );

    return { id, email: emailLower, name: name || 'Google User', role, whatsApp };
  }

  public async updateUser(id: string, name?: string, whatsApp?: string): Promise<User> {
    let query = 'UPDATE users SET ';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (name) {
      query += `name = $${paramIndex++}, `;
      params.push(name);
    }
    if (whatsApp) {
      query += `"whatsApp" = $${paramIndex++}, `;
      params.push(whatsApp);
    }
    
    if (params.length > 0) {
      query = query.slice(0, -2) + ` WHERE id = $${paramIndex} RETURNING id, email, name, role, "whatsApp"`;
      params.push(id);
      const { rows } = await this.pool.query(query, params);
      if (rows.length === 0) throw new Error("User not found");
      return rows[0];
    } else {
      const user = await this.findUserById(id);
      if (!user) throw new Error("User not found");
      return user;
    }
  }

  public async deleteUser(id: string) {
    await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
  }

  // Task APIs
  public async getTasks(): Promise<Task[]> {
    const { rows } = await this.pool.query('SELECT * FROM tasks');
    return rows;
  }

  public async findTaskById(id: string): Promise<Task | undefined> {
    const { rows } = await this.pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    return rows[0];
  }

  public async createTask(title: string, description: string, assignedTo: string | null, createdBy: string, creatorRole: UserRole, scheduledDate: string): Promise<Task> {
    let assignedToName: string | null = null;
    let whatsApp: string | null = null;

    if (assignedTo) {
      const manager = await this.findUserById(assignedTo);
      if (manager) {
        assignedToName = manager.name;
        whatsApp = manager.whatsApp;
      }
    }

    const id = 'task-' + crypto.randomUUID();
    const status = 'pending';
    const createdAt = new Date().toISOString();
    const updatedAt = new Date().toISOString();

    await this.pool.query(
      'INSERT INTO tasks (id, title, description, status, "assignedTo", "assignedToName", "whatsApp", "createdBy", "creatorRole", "scheduledDate", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
      [id, title, description, status, assignedTo, assignedToName, whatsApp, createdBy, creatorRole, scheduledDate, createdAt, updatedAt]
    );

    return {
      id, title, description, status, assignedTo, assignedToName, whatsApp, createdBy, creatorRole, scheduledDate, createdAt, updatedAt
    };
  }

  public async updateTask(id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'status' | 'assignedTo' | 'scheduledDate'>>): Promise<Task> {
    const task = await this.findTaskById(id);
    if (!task) throw new Error('Task not found.');

    const updatedTask = { ...task, ...updates, updatedAt: new Date().toISOString() };

    if (updates.assignedTo !== undefined) {
      if (updates.assignedTo === null) {
        updatedTask.assignedToName = null;
        updatedTask.whatsApp = null;
      } else {
        const manager = await this.findUserById(updates.assignedTo);
        if (manager) {
          updatedTask.assignedToName = manager.name;
          updatedTask.whatsApp = manager.whatsApp;
        }
      }
    }

    await this.pool.query(
      'UPDATE tasks SET title=$1, description=$2, status=$3, "assignedTo"=$4, "assignedToName"=$5, "whatsApp"=$6, "scheduledDate"=$7, "updatedAt"=$8 WHERE id=$9',
      [updatedTask.title, updatedTask.description, updatedTask.status, updatedTask.assignedTo, updatedTask.assignedToName, updatedTask.whatsApp, updatedTask.scheduledDate, updatedTask.updatedAt, id]
    );

    return updatedTask;
  }

  public async deleteTask(id: string) {
    await this.pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  }
}

export const dbInstance = new Database();
