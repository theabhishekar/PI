import express, { Request, Response, NextFunction } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { dbInstance, hashPassword, generateSalt } from "./server-db";
import { UserRole, TaskStatus } from "./src/types";

// Setup security keys for symmetric verification of token session
const SECRET_KEY = process.env.JWT_SECRET || "teamflow-dev-secret-key-1234567890";

function generateToken(userId: string, role: UserRole): string {
  const payload = JSON.stringify({ userId, role, exp: Date.now() + 24 * 60 * 60 * 1000 });
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + signature;
}

function verifyToken(token: string): { userId: string; role: UserRole } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const payloadRaw = Buffer.from(parts[0], 'base64').toString('utf8');
    const signature = parts[1];
    
    // Verify HMAC signature
    const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(payloadRaw).digest('hex');
    if (signature !== expectedSignature) return null;
    
    const parsed = JSON.parse(payloadRaw);
    if (Date.now() > parsed.exp) return null; // expired
    return { userId: parsed.userId, role: parsed.role };
  } catch (err) {
    return null;
  }
}

// Custom Request declaration interface
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    email: string;
    name: string;
    whatsApp: string;
  };
}

async function startServer() {
  await dbInstance.init();
  
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Authorization Middleware
  const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Auth token required' });
        return;
      }

      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (!decoded) {
        res.status(401).json({ error: 'Invalid or expired credentials' });
        return;
      }

      const user = await dbInstance.findUserById(decoded.userId);
      if (!user) {
        res.status(401).json({ error: 'User.record not found' });
        return;
      }

      req.user = user;
      next();
    } catch (e) {
      res.status(500).json({ error: 'Authentication error' });
    }
  };

  // Admin-only Access Middleware
  const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied: Admin role required' });
      return;
    }
    next();
  };

  // --- API Routes ---

  // Auth: Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      const userRecord = await dbInstance.findUserByEmail(email);
      if (!userRecord) {
        res.status(400).json({ error: "Invalid credentials" });
        return;
      }

      const incomingHash = hashPassword(password, userRecord.salt);
      if (incomingHash !== userRecord.passwordHash) {
        res.status(400).json({ error: "Invalid credentials" });
        return;
      }

      const token = generateToken(userRecord.id, userRecord.role);
      res.json({
        user: {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.name,
          role: userRecord.role,
          whatsApp: userRecord.whatsApp
        },
        token
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Login failed' });
    }
  });

  // Google OAuth Initiate Endpoint
  app.get("/api/auth/google/url", (req: Request, res: Response) => {
    const customClientId = process.env.GOOGLE_CLIENT_ID;
    if (!customClientId) {
      res.json({ 
        configured: false,
        message: "Google client ID is not configured yet." 
      });
      return;
    }

    const clientOrigin = req.query.origin as string;
    const baseOrigin = clientOrigin || process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${baseOrigin}/auth/google/callback`;
    
    // Pass origin securely in state so we can reconstruct the exact redirect URI on the callback
    const state = Buffer.from(JSON.stringify({ origin: baseOrigin })).toString('base64');

    const params = new URLSearchParams({
      client_id: customClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state: state,
      prompt: "consent",
      access_type: "offline"
    });

    res.json({
      configured: true,
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`
    });
  });

  // Google OAuth Redirect Callback Endpoint
  app.get(["/auth/google/callback", "/auth/google/callback/"], async (req: Request, res: Response) => {
    const { code, error, state } = req.query;
    if (error) {
      res.status(400).send(`Authentication error: ${error}`);
      return;
    }

    if (!code) {
      res.status(400).send("No authorization code provided by Google Auth");
      return;
    }

    try {
      const customClientId = process.env.GOOGLE_CLIENT_ID;
      const customClientSecret = process.env.GOOGLE_CLIENT_SECRET;
      
      let baseOrigin = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      if (state) {
        try {
          const parsed = JSON.parse(Buffer.from(state as string, 'base64').toString('utf-8'));
          if (parsed.origin) {
            baseOrigin = parsed.origin;
          }
        } catch (e) {
          console.warn("Failed to parse state", e);
        }
      }
      const redirectUri = `${baseOrigin}/auth/google/callback`;

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id: customClientId!,
          client_secret: customClientSecret!,
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        })
      });

      if (!tokenResponse.ok) {
        const errText = await tokenResponse.text();
        res.status(400).send(`Google Token Exchange Failed: ${errText}`);
        return;
      }

      const tokenData = await tokenResponse.json();
      const { access_token } = tokenData;

      // Fetch profile data from userinfo
      const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { "Authorization": `Bearer ${access_token}` }
      });

      if (!userinfoResponse.ok) {
        res.status(400).send("Could not retrieve profile info from Google API");
        return;
      }

      const googleUser = await userinfoResponse.json();
      const email = googleUser.email;
      const name = googleUser.name;

      if (!email) {
        res.status(400).send("Google profile did not contain a valid email address.");
        return;
      }

      // Provision or find Google user
      const user = await dbInstance.findOrCreateGoogleUser(email, name);

      // Generate app session token
      const token = generateToken(user.id, user.role);

      // Deep Link Redirect for Mobile (Capacitor)
      if (baseOrigin === "com.pi.app://") {
        const redirectUrl = `com.pi.app://callback?token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify(user))}`;
        res.redirect(302, redirectUrl);
        return;
      }

      // Web Popup Callback
      res.send(`
        <html>
          <head>
            <title>Authentication Successful</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0c0a09; color: #fafaf9; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .spinner { width: 42px; height: 42px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #6366f1; border-radius: 50%; animation: spin 1s infinite linear; margin-bottom: 20px; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              h2 { color: #f4f4f5; font-size: 1.5rem; margin-bottom: 8px; font-weight: 700; letter-spacing: -0.025em; }
              p { color: #a1a1aa; font-size: 0.9rem; margin-top: 0; }
            </style>
          </head>
          <body>
            <div class="spinner"></div>
            <h2>Google Auth Success</h2>
            <p>Syncing security tokens with TeamFlow workspace. Closing popup...</p>
            <script>
              try {
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'OAUTH_AUTH_SUCCESS',
                    token: '${token}',
                    user: ${JSON.stringify(user)}
                  }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              } catch (err) {
                console.error(err);
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);

    } catch (err: any) {
      res.status(500).send(`Authentication Flow Interruption: ${err.message}`);
    }
  });

  // Sandbox Simulated Google Auth for Preview Compatibility
  app.post("/api/auth/google/sandbox", async (req: Request, res: Response) => {
    try {
      const { email, name } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email is required for sandbox Google simulation" });
        return;
      }

      const user = await dbInstance.findOrCreateGoogleUser(email, name || "Google User");
      const token = generateToken(user.id, user.role);

      res.json({
        user,
        token,
        message: "Google sandbox authorization simulated cleanly"
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Sandbox login failed' });
    }
  });

  // Auth: Create/Register Manager (Admin-only)
  app.post("/api/auth/register-manager", authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const { email, password, name, whatsApp } = req.body;
    if (!email || !password || !name || !whatsApp) {
      res.status(400).json({ error: 'All fields (email, password, name, whatsApp) are required' });
      return;
    }

    try {
      const newUser = await dbInstance.createUser(email, name, 'manager', whatsApp, password);
      res.status(201).json({ user: newUser });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create manager account' });
    }
  });

  // Team List (All authenticated users)
  app.get("/api/team", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await dbInstance.getUsers();
      const team = users.map(u => ({ id: u.id, name: u.name, role: u.role }));
      res.json(team);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch team' });
    }
  });

  // Users List (Admin-only)
  app.get("/api/users", authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await dbInstance.getUsers();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Update User Profile
  app.put("/api/users/profile", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
         res.status(401).json({ error: "Unauthorized" });
         return;
      }
      const { name, whatsApp } = req.body;
      const updatedUser = await dbInstance.updateUser(req.user.id, name, whatsApp);
      res.json({ success: true, user: updatedUser });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update profile' });
    }
  });

  // Delete User Profile (Admin-only)
  app.delete("/api/users/:id", authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (id === req.user?.id) {
        res.status(400).json({ error: 'Admins cannot delete their own profile.' });
        return;
      }
      await dbInstance.deleteUser(id);
      res.json({ success: true, message: 'User deleted safely.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // Get Tasks (Admin gets all, Managers get assigned + self-created)
  app.get("/api/tasks", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const allTasks = await dbInstance.getTasks();
      const user = req.user!;

      if (user.role === 'admin') {
        res.json(allTasks);
      } else {
        // Manager rule: only items assigned to them OR created by them
        const tasks = allTasks.filter(t => t.assignedTo === user.id || t.createdBy === user.id);
        res.json(tasks);
      }
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Voice Agent Endpoint
  app.post("/api/voice-agent", authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { transcript, audioData, mimeType } = req.body;
      if (!transcript && !audioData) {
        res.status(400).json({ error: "Transcript or audioData is required" });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({ error: "GEMINI API KEY MISSING! Ask user to set it up in Settings." });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const users = await dbInstance.getUsers();
      const managersConfig = users.filter(u=>u.role==='manager').map(u=>({id: u.id, name: u.name}));
      
      const currentDate = new Date().toISOString().split('T')[0];
      const systemInstruction = `Extract task details from this input.
        Return JSON. The available manager names or IDs are: ${JSON.stringify(managersConfig)}, only use exact ID for assignedTo. If impossible to guess assignedTo, set it to null.
        The current date is ${currentDate}. If a relative date like "tomorrow", "today", "next week", "monday", etc. is mentioned, you MUST calculate and return the exact date in YYYY-MM-DD format as "scheduledDate". If no date is mentioned, set it to an empty string.`;

      let cleanMimeType = (mimeType || "audio/webm").split(';')[0];
      
      let contents: any[] = [];
      if (audioData) {
        contents = [
          systemInstruction,
          {
            inlineData: {
              data: audioData,
              mimeType: cleanMimeType
            }
          }
        ];
      } else {
        contents = [systemInstruction + `\n\nTranscript: "${transcript}"`];
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Task title, max 5-6 words" },
              description: { type: Type.STRING, description: "Task detailed description" },
              scheduledDate: { type: Type.STRING, description: "YYYY-MM-DD format if date mentioned, else empty string. current year is 2026." },
              assignedTo: { type: Type.STRING, description: "User ID of the manager allocated to the task, or null" }
            },
            required: ["title", "description", "scheduledDate"]
          }
        }
      });

      const jsonStr = response.text || "{}";
      const parsed = JSON.parse(jsonStr);

      const newTask = await dbInstance.createTask(
        parsed.title || "Voice Task",
        parsed.description || "Voice Description",
        parsed.assignedTo || null,
        req.user!.id,
        req.user!.role,
        parsed.scheduledDate || ""
      );

      res.status(201).json({ task: newTask });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Voice agent failed to process" });
    }
  });

  // Create Task
  app.post("/api/tasks", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, description, assignedTo, scheduledDate } = req.body;
      if (!title || !description) {
        res.status(400).json({ error: 'Title and Description are required' });
        return;
      }

      const sUser = req.user!;
      let targetAssignee = assignedTo;

      if (sUser.role === 'manager') {
        // Manager rule: "Manager can create their own task for them self only"
        targetAssignee = sUser.id;
      }

      const finalScheduledDate = scheduledDate || new Date().toISOString().split('T')[0];
      const task = await dbInstance.createTask(title, description, targetAssignee, sUser.id, sUser.role, finalScheduledDate);
      res.status(201).json(task);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // Update Task
  app.put("/api/tasks/:id", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, status, assignedTo, scheduledDate } = req.body;
      const user = req.user!;

      const task = await dbInstance.findTaskById(id);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      // Role-based capability validation
      if (user.role === 'admin') {
        // Admin has full control
        const updates: any = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (status !== undefined) updates.status = status as TaskStatus;
        if (assignedTo !== undefined) updates.assignedTo = assignedTo;
        if (scheduledDate !== undefined) updates.scheduledDate = scheduledDate;

        const updated = await dbInstance.updateTask(id, updates);
        res.json(updated);
      } else {
        // Manager update rules
        const isSelfCreated = task.createdBy === user.id && task.creatorRole === 'manager';

        if (isSelfCreated) {
          // Since it's self-created for themselves, they can fully edit it
          const updates: any = {};
          if (title !== undefined) updates.title = title;
          if (description !== undefined) updates.description = description;
          if (status !== undefined) updates.status = status as TaskStatus;
          if (scheduledDate !== undefined) updates.scheduledDate = scheduledDate;
          // Self created tasks are locked assigned to themselves
          updates.assignedTo = user.id;

          const updated = await dbInstance.updateTask(id, updates);
          res.json(updated);
        } else {
          // It's assigned by Admin to Manager
          // Rule: "Manager can not delete or edit the assigned task he can only update the status"
          if (task.assignedTo !== user.id) {
            res.status(403).json({ error: 'Permission denied: Task is not assigned to you.' });
            return;
          }

          // Only allow status updates
          if (title !== undefined || description !== undefined || assignedTo !== undefined) {
            res.status(403).json({ error: 'Permission denied: Managers can only update status of assigned tasks.' });
            return;
          }

          if (status === undefined) {
            res.status(400).json({ error: 'Nothing to update (only status changes are permitted for assigned tasks)' });
            return;
          }

          const updated = await dbInstance.updateTask(id, { status: status as TaskStatus });
          res.json(updated);
        }
      }
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  // Delete Task
  app.delete("/api/tasks/:id", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const task = await dbInstance.findTaskById(id);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      if (user.role === 'admin') {
        // Admins have full access to delete
        await dbInstance.deleteTask(id);
        res.json({ success: true, message: 'Task deleted successfully.' });
      } else {
        // Manager can delete if self-created
        const isSelfCreated = task.createdBy === user.id && task.creatorRole === 'manager';
        if (isSelfCreated) {
          await dbInstance.deleteTask(id);
          res.json({ success: true, message: 'Self task deleted successfully.' });
        } else {
          res.status(403).json({ error: 'Permission denied: Managers cannot delete assigned tasks.' });
        }
      }
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });

  // --- Vite Middleware Server Setup ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started in full-stack on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Critical server bootstrap failure:", err);
});
