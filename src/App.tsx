import { useState, useEffect, FormEvent, useMemo, useRef } from "react";
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  Play, 
  Send, 
  LogOut, 
  Lock, 
  Mail, 
  User, 
  Phone,
  Eye,
  EyeOff,
  Briefcase,
  AlertCircle,
  Check,
  X,
  Filter,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Wifi,
  Battery,
  BatteryCharging,
  Settings,
  Smartphone,
  Bell,
  Sparkles,
  Layers,
  Search,
  MessageSquare,
  Compass,
  ArrowRight,
  Info,
  Calendar as CalendarIcon,
  LayoutDashboard,
  Mic,
  Pause
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { motion, AnimatePresence } from "motion/react";
import { User as AppUser, Task, TaskStatus, UserRole } from "./types";

export default function App() {
  // Auth state
  const [user, setUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem("team_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("team_token") || null;
  });

  // UI State & Tabs inside the Android screen
  const [activeTab, setActiveTab] = useState<"tasks" | "managers" | "metrics" | "calendar" | "profile">("tasks");
  const [taskFilter, setTaskFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [taskTypeFilter, setTaskTypeFilter] = useState<"all" | "assigned" | "self">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Business Data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [managers, setManagers] = useState<AppUser[]>([]);
  const [teamMembers, setTeamMembers] = useState<{id: string, name: string, role: string}[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);

  // Forms / Modals (Android Bottom Sheets)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [viewManagerTasksId, setViewManagerTasksId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Task Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskAssignedTo, setTaskAssignedTo] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("pending");
  const [taskScheduledDate, setTaskScheduledDate] = useState("");
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  const [submittingTask, setSubmittingTask] = useState(false);

  // Manager Form State
  const [mgrEmail, setMgrEmail] = useState("");
  const [mgrPassword, setMgrPassword] = useState("");
  const [mgrName, setMgrName] = useState("");
  const [mgrWhatsApp, setMgrWhatsApp] = useState("");
  const [mgrFormError, setMgrFormError] = useState<string | null>(null);
  const [submittingMgr, setSubmittingMgr] = useState(false);

  // Profile Form State
  const [profileName, setProfileName] = useState("");
  const [profileWhatsApp, setProfileWhatsApp] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Credentials / Login View State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginRePassword, setLoginRePassword] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showEmailLoginForm, setShowEmailLoginForm] = useState(false);

  // TOAST / Notification States inside the Emulator
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  
  // Dynamic Android Push Notification State
  const [activeNotification, setActiveNotification] = useState<{ title: string; body: string } | null>(null);

  // --- ANDROID EMULATOR HARDWARE SIMULATION STATE ---
  const [deviceColor, setDeviceColor] = useState<"charcoal" | "silver" | "cobalt" | "emerald">("charcoal");
  const [emuBattery, setEmuBattery] = useState<number>(88);
  const [isEmuCharging, setIsEmuCharging] = useState<boolean>(false);
  const [emuNetwork, setEmuNetwork] = useState<"5G" | "LTE" | "Wi-Fi" | "Offline">("5G");
  const [emuNavigation, setEmuNavigation] = useState<"gesture" | "buttons">("gesture");
  const [emuTime, setEmuTime] = useState("");
  const [isEmuDarkTheme, setIsEmuDarkTheme] = useState<boolean>(false);

  // Fetch current local clock time for the device top bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      setEmuTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper to trigger Toast in the emulator UI
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 4000);
  };

  // Trigger simulated push message from Android system
  const triggerPushNotification = (title: string, body: string) => {
    setActiveNotification({ title, body });
    // Auto-swipe upper notch notifications bubble in 4 seconds
    setTimeout(() => {
      setActiveNotification(null);
    }, 5000);
  };

  // Fetch all tasks
  const fetchTasks = async () => {
    if (!token) return;
    setLoadingTasks(true);
    try {
      const res = await fetch("/api/tasks", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      } else {
        const errData = await res.json();
        showToast(errData.error || "Failed to load tasks", "error");
      }
    } catch (err) {
      showToast("Network error bringing allocated tasks", "error");
    } finally {
      setLoadingTasks(false);
    }
  };

  // Fetch managers (Admin only)
  const fetchManagers = async () => {
    if (!token || user?.role !== "admin") return;
    setLoadingManagers(true);
    try {
      const res = await fetch("/api/users", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const filteredManagers = data.filter((u: AppUser) => u.role === "manager");
        setManagers(filteredManagers);
      } else {
        const errData = await res.json();
        showToast(errData.error || "Failed to load manager roster", "error");
      }
    } catch (err) {
      showToast("Network error synchronizing roster", "error");
    } finally {
      setLoadingManagers(false);
    }
  };

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsUpdatingProfile(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ name: profileName, whatsApp: profileWhatsApp })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem("team_user", JSON.stringify(data.user));
        showToast("Profile credentials synchronized", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update profile", "error");
      }
    } catch (err) {
      showToast("Network error saving profile", "error");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Initial profile data
  useEffect(() => {
    if (user) {
      setProfileName(user.name || "");
      setProfileWhatsApp(user.whatsApp || "");
    }
  }, [user]);

  // Sync state on user token
  useEffect(() => {
    if (token) {
      fetchTasks();
      if (user?.role === "admin") {
        fetchManagers();
      }
    }
  }, [token, user]);

  // Handle Login and auto log in callback
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setAuthError("Email and password credentials are required.");
      return;
    }

    setAuthError(null);
    setAuthLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("team_token", data.token);
        localStorage.setItem("team_user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        
        triggerPushNotification(
          "🔓 Secure Login Successful", 
          `Session active for ${data.user.name} (${data.user.role.toUpperCase()})`
        );
        showToast(`Signed in successfully!`, "success");
        setLoginEmail("");
        setLoginPassword("");
      } else {
        setAuthError(data.error || "Invalid user credentials.");
        showToast("Authentication Failed", "error");
      }
    } catch (err) {
      setAuthError("Unable to establish remote database handshake.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("team_token");
    localStorage.removeItem("team_user");
    setToken(null);
    setUser(null);
    setTasks([]);
    setManagers([]);
    triggerPushNotification("🔒 System Sign-Out", "Secure session expired cleanly.");
    showToast("Signed out", "info");
  };

  // Google OAuth flow state & event listeners
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith(".run.app") && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
        return;
      }
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        const { token: receivedToken, user: receivedUser } = event.data;
        if (receivedToken && receivedUser) {
          localStorage.setItem("team_token", receivedToken);
          localStorage.setItem("team_user", JSON.stringify(receivedUser));
          setToken(receivedToken);
          setUser(receivedUser);
          
          triggerPushNotification(
            "🔓 Google Sign-In Successful", 
            `Session verified for ${receivedUser.name} (${receivedUser.role.toUpperCase()})`
          );
          showToast(`Signed in successfully with Google!`, "success");
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const triggerGoogleSandboxSimulation = async (email: string) => {
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/google/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: email === "theabhishekar@gmail.com" ? "Abhishek" : "Google Sandbox User"
        })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("team_token", data.token);
        localStorage.setItem("team_user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        
        triggerPushNotification(
          "🔓 Google Auth (Simulated)", 
          `Registered/Verified as ${data.user.name} (${data.user.role.toUpperCase()})`
        );
        showToast(`Signed in successfully (Simulated Google Auth)!`, "success");
      } else {
        showToast(data.error || "Sandbox Google verification failed.", "error");
      }
    } catch (err) {
      showToast("Network handshake lost during auth simulation.", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const response = await fetch(`/api/auth/google/url?origin=${encodeURIComponent(window.location.origin)}`);
      if (!response.ok) {
        throw new Error("Failed to contact auth endpoint");
      }
      const data = await response.json();
      
      if (data.configured && data.url) {
        const popup = window.open(
          data.url,
          "google_oauth_popup",
          "width=500,height=600,status=no,resizable=yes,scrollbars=yes"
        );
        if (!popup) {
          showToast("Popup blocked! Please allow popups for this page.", "error");
        }
      } else {
        // Fallback to beautiful Sandbox authentication popup/modal 
        showToast("No GOOGLE_CLIENT_ID env. Performing Simulated Verification.", "info");
        triggerGoogleSandboxSimulation("theabhishekar@gmail.com");
      }
    } catch (err) {
      showToast("Could not initiate Google Auth session", "error");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Save (Create or Edit) Tasks specifications
  const handleSaveTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDesc.trim()) {
      setTaskFormError("Specifications title and briefs are required.");
      return;
    }

    setTaskFormError(null);
    setSubmittingTask(true);

    const isEditing = !!editingTask;
    const url = isEditing ? `/api/tasks/${editingTask.id}` : "/api/tasks";
    const method = isEditing ? "PUT" : "POST";

    const payload: any = {
      title: taskTitle,
      description: taskDesc,
      status: taskStatus,
      scheduledDate: taskScheduledDate || undefined
    };

    if (user?.role === "admin") {
      payload.assignedTo = taskAssignedTo || null;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        showToast(
          isEditing ? "Task modified successfully!" : "Task allocated cleanly!", 
          "success"
        );
        
        // Trigger realistic push warning
        triggerPushNotification(
          isEditing ? "✏️ Task Updated" : "🆕 New Task Assigned",
          `"${payload.title}" is currently flag-marked "${taskStatus.replace("_", " ")}".`
        );

        setIsTaskModalOpen(false);
        setEditingTask(null);
        setTaskTitle("");
        setTaskDesc("");
        setTaskAssignedTo("");
        setTaskStatus("pending");
        setTaskScheduledDate("");
        fetchTasks();
      } else {
        setTaskFormError(data.error || "Failed to submit task structure.");
      }
    } catch (err) {
      setTaskFormError("Network error forwarding payload.");
    } finally {
      setSubmittingTask(false);
    }
  };

  // Inline Quick Changer for Manager list status
  const handleUpdateStatusOnly = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        showToast(`Status shifted to ${newStatus.replace("_", " ")}`, "success");
        triggerPushNotification("⚡ Status Synchronized", `Task now updated to ${newStatus.replace("_", " ").toUpperCase()}`);
        fetchTasks();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to change status", "error");
      }
    } catch (err) {
      showToast("Network failure changing progress status", "error");
    }
  };

  // Delete/Cancel task allocations
  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        showToast("Task removed cleanly.", "info");
        triggerPushNotification("🗑️ Allocation Revoked", "Workspace task has been permanently discarded.");
        fetchTasks();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to remove entry", "error");
      }
    } catch (err) {
      showToast("Network failure removing task record", "error");
    }
  };

  // Register modern manager credentials
  const handleRegisterManager = async (e: FormEvent) => {
    e.preventDefault();
    if (!mgrEmail || !mgrPassword || !mgrName || !mgrWhatsApp) {
      setMgrFormError("Please fill out complete profile data.");
      return;
    }

    setMgrFormError(null);
    setSubmittingMgr(true);

    try {
      const res = await fetch("/api/auth/register-manager", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          email: mgrEmail,
          password: mgrPassword,
          name: mgrName,
          whatsApp: mgrWhatsApp
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(`Manager ${data.user.name} created!`, "success");
        triggerPushNotification("👥 Manager Account Configured", `${data.user.name} added with full dashboard credentials.`);
        setIsManagerModalOpen(false);
        setMgrEmail("");
        setMgrPassword("");
        setMgrName("");
        setMgrWhatsApp("");
        fetchManagers();
      } else {
        setMgrFormError(data.error || "Unable to save manager credentials.");
      }
    } catch (err) {
      setMgrFormError("Network error committing user registry.");
    } finally {
      setSubmittingMgr(false);
    }
  };

  // Delete registered manager from layout (Admin only)
  const handleDeleteManager = async (managerId: string, managerName: string) => {
    try {
      const res = await fetch(`/api/users/${managerId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.ok) {
        showToast(`Manager ${managerName} deleted.`, "info");
        triggerPushNotification("🚫 Credentials Revoked", `${managerName}'s secure team panel entry has been destroyed.`);
        fetchManagers();
        fetchTasks();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to delete from roster", "error");
      }
    } catch (err) {
      showToast("Network error during connection loss", "error");
    }
  };

  // Opens task forms
  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description);
    setTaskAssignedTo(task.assignedTo || "");
    setTaskStatus(task.status);
    setTaskScheduledDate(task.scheduledDate || "");
    setTaskFormError(null);
    setIsTaskModalOpen(true);
  };

  const [isListening, setIsListening] = useState(false);
  const [isVoiceWidgetExpanded, setIsVoiceWidgetExpanded] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const stopVoiceAgent = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
    if (speechRecRef.current) {
      try { speechRecRef.current.stop(); } catch(e){}
    }
  };

  const startVoiceAgent = async () => {
    setIsVoiceWidgetExpanded(true);
    setLiveTranscript("");

    if (isListening) {
      stopVoiceAgent();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Try enabling speech recognition purely for live UI preview
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.onresult = (event: any) => {
          let fullTranscript = "";
          for (let i = 0; i < event.results.length; ++i) {
            fullTranscript += event.results[i][0].transcript;
          }
          setLiveTranscript(fullTranscript);
        };
        recognition.onerror = () => {};
        try { recognition.start(); speechRecRef.current = recognition; } catch (e) {}
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsVoiceWidgetExpanded(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          showToast("Processing Voice command...", "info");
          
          try {
            const res = await fetch("/api/voice-agent", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
              body: JSON.stringify({ 
                audioData: base64Data,
                mimeType: audioBlob.type
              })
            });
            
            if (res.ok) {
              showToast("Task allocated via Voice", "success");
              fetchTasks();
            } else {
              const data = await res.json();
              showToast(data.error || "Failed voice allocation", "error");
            }
          } catch (e) {
            showToast("Error connecting to Voice Agent", "error");
          }
        };
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      console.error(err);
      setIsVoiceWidgetExpanded(false);
      showToast("Microphone access denied or unavailable. Please check permissions.", "error");
    }
  };

  const openCreateTask = () => {
    setEditingTask(null);
    setTaskTitle("");
    setTaskDesc("");
    setTaskAssignedTo("");
    setTaskStatus("pending");
    setTaskScheduledDate("");
    setTaskFormError(null);
    setIsTaskModalOpen(true);
  };

  // Generate real WhatsApp click-to-share dynamic message URL
  const getWhatsAppShareLink = (task: Task) => {
    if (!task.whatsApp) return "";
    const phoneClean = task.whatsApp.replace(/[^0-9+]/g, "");
    
    const message = 
`New Task Assigned via Team Portal

Title: ${task.title}
Description: ${task.description}
Status:[ ${task.status.toUpperCase().replace("_", " ")} ]`;

    return `https://wa.me/${phoneClean.replace("+", "")}?text=${encodeURIComponent(message)}`;
  };

  // Preseeded Sandbox Credentials tap helper
  const quickFillAdmin = () => {
    setLoginEmail("admin@team.com");
    setLoginPassword("admin123");
    showToast("Super-Admin credentials prefilled", "info");
  };

  // Real-time calculated statistics metrics
  const totalTasksCount = tasks.length;
  const pendingTasksCount = tasks.filter(t => t.status === "pending").length;
  const activeTasksCount = tasks.filter(t => t.status === "in_progress").length;
  const completedTasksCount = tasks.filter(t => t.status === "completed").length;
  const resolutionPercentage = totalTasksCount > 0 
    ? Math.round((completedTasksCount / totalTasksCount) * 100) 
    : 0;

  // Filter logic (Multi-criteria dashboard search)
  const filteredTasks = tasks.filter(task => {
    // 1. Tab Status filters (from standard toggle)
    if (taskFilter !== "all" && task.status !== taskFilter) return false;

    // 2. Task Type filters (assigned vs self-created for managers)
    if (user?.role === "manager") {
      if (taskTypeFilter === "assigned" && task.createdBy === user.id) return false;
      if (taskTypeFilter === "self" && task.createdBy !== user.id) return false;
    }

    // 3. Search query filters
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const titleMatch = task.title?.toLowerCase().includes(query) || false;
      const descMatch = task.description?.toLowerCase().includes(query) || false;
      const mgrMatch = task.assignedToName?.toLowerCase().includes(query) || false;
      return titleMatch || descMatch || mgrMatch;
    }

    return true;
  });

  const taskDates = useMemo(() => {
    return tasks
      .filter(t => t.scheduledDate)
      .map(t => {
        const [y, m, d] = t.scheduledDate.split('-');
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      });
  }, [tasks]);

  // Dynamic style definition based on configured simulated brand chassis color
  const getChassisColorClass = () => {
    switch (deviceColor) {
      case "silver": return "border-[#E4E4E7] bg-white ring-8 ring-[#18181B]/10 shadow-gray-400/25";
      case "cobalt": return "border-[#1E3A8A] bg-[#1E3A8A] ring-8 ring-[#1A365D]/20 shadow-blue-900/25";
      case "emerald": return "border-[#064E3B] bg-[#064E3B] ring-8 ring-[#064E3B]/20 shadow-emerald-950/25";
      default: return "border-[#1E293B] bg-[#0F172A] ring-8 ring-[#0F172A]/10 shadow-slate-950/40";
    }
  };

  return (
    <div className={`min-h-[100dvh] w-full flex items-center justify-center font-sans antialiased select-none overflow-x-hidden p-0 sm:p-4 bg-slate-950`}>
      {/* SCREEN RECONSTRUCTED WORKSPACE CONTAINER */}
      <div className={`w-full max-w-[420px] h-[100dvh] sm:h-[820px] flex flex-col relative sm:rounded-[36px] sm:border-[12px] sm:shadow-2xl overflow-hidden transition-colors ${isEmuDarkTheme ? "bg-[#09090b] text-zinc-100 border-zinc-900" : "bg-[#f8fafc] text-slate-900 border-slate-800"}`}>
              
              {/* TOP HEADER CONTROLS (App Bar inside simulated OS) */}
              {user && (
                <div className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 shadow-xs z-20 transition-colors ${
                  isEmuDarkTheme 
                    ? "bg-[#09090b] border-zinc-800 text-zinc-100" 
                    : "bg-white border-slate-100 text-slate-800"
                }`}>
                  <div>
                    <p className={`text-[10px] font-semibold tracking-wider uppercase flex items-center gap-1.5 ${isEmuDarkTheme ? 'text-zinc-400' : 'text-slate-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.role === 'admin' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span>
                      {user.role === 'admin' ? 'Co-ordinator Account' : 'Work Station Control'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      id="emu-profile"
                      onClick={() => setActiveTab("profile")}
                      className={`p-1.5 rounded-xl hover:bg-indigo-500/10 hover:text-indigo-500 transition-all ${activeTab === 'profile' ? 'text-indigo-500' : isEmuDarkTheme ? 'text-zinc-500' : 'text-slate-400'}`}
                      title="User Profile"
                    >
                      <User className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* SCREEN CONTENT AREA (Highly Optimized for scrolling) */}
              <div className="flex-1 overflow-y-auto px-5 py-4 pb-24 relative select-text" style={{ scrollbarWidth: "none" }}>
                
                <AnimatePresence mode="wait">
                  {!user ? (
                    // =========================================
                    // PI UI SIGN-IN PANEL
                    // =========================================
                    <motion.div 
                      key="emu-auth"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`absolute inset-[3px] rounded-[48px] z-50 overflow-y-auto bg-[#6135BF] p-6 pt-12 ${showEmailLoginForm ? '' : 'overflow-hidden'}`}
                    >
                      {!showEmailLoginForm && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-[#6135BF]">
                          <div className="flex flex-col items-center justify-center -mt-16 w-full">
                            <h1 className="text-white text-[96px] leading-[1] font-serif font-extrabold mb-10 tracking-tighter" style={{ fontFamily: 'Georgia, serif' }}>PI</h1>
                            <h2 className="text-white font-bold text-[22px] mb-8 font-sans tracking-tight">Log in or sign up</h2>
                            
                            <div className="w-full space-y-4">
                              <button 
                                onClick={() => setShowEmailLoginForm(true)}
                                className="w-full bg-white text-black font-bold py-3.5 rounded-full text-sm hover:opacity-90 transition-opacity active:scale-[0.98]"
                              >
                                Continue with email
                              </button>

                              <div className="flex items-center justify-center gap-4 py-2 opacity-90">
                                <div className="h-px bg-white flex-1 min-w-[50px] max-w-[100px]"></div>
                                <span className="text-white text-sm font-medium">or</span>
                                <div className="h-px bg-white flex-1 min-w-[50px] max-w-[100px]"></div>
                              </div>

                              <button 
                                onClick={handleGoogleSignIn}
                                className="w-full bg-white text-black font-bold py-3.5 rounded-full text-sm hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center justify-center relative shadow-sm"
                              >
                                <div className="absolute left-6">
                                  {/* Google logo SVG */}
                                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                                  </svg>
                                </div>
                                Continue with Google
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div style={{ display: showEmailLoginForm ? "block" : "none" }} className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-[#6135BF]">
                        <button onClick={() => setShowEmailLoginForm(false)} className="absolute top-8 left-6 text-white hover:text-zinc-200 text-sm font-bold flex items-center gap-2">
                          <span>←</span> BACK
                        </button>
                        <div className="flex flex-col items-center justify-center -mt-8 w-full max-w-[280px]">
                          <h1 className="text-white text-[96px] leading-[1] font-serif font-extrabold mb-8 tracking-tighter" style={{ fontFamily: 'Georgia, serif' }}>PI</h1>
                          <h2 className="text-white font-bold text-[22px] mb-8 font-sans tracking-tight leading-tight text-center">Create your account</h2>
                          
                          <form onSubmit={handleLogin} className="w-full space-y-4 flex flex-col items-center">
                            <input 
                              type="email"
                              required
                              value={loginEmail}
                              onChange={e => setLoginEmail(e.target.value)}
                              placeholder="EMAIL"
                              className="w-full bg-white text-center text-black font-bold py-3.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-white placeholder:text-black placeholder:font-bold"
                            />
                            
                            <div className="relative w-full">
                              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-black font-bold text-sm select-none pointer-events-none">+91</span>
                              <input 
                                type="tel"
                                value={loginPhone}
                                onChange={e => setLoginPhone(e.target.value)}
                                placeholder="Phone number"
                                className="w-full bg-white text-center text-black font-bold py-3.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-white placeholder:text-black placeholder:font-bold px-12"
                              />
                            </div>
                            
                            <div className="relative w-full">
                              <input 
                                type={showPassword ? "text" : "password"}
                                required
                                value={loginPassword}
                                onChange={e => setLoginPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full bg-white text-center text-black font-bold py-3.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-white placeholder:text-black placeholder:font-bold px-12"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors focus:outline-none"
                              >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                            
                            <div className="relative w-full">
                              <input 
                                type={showRePassword ? "text" : "password"}
                                value={loginRePassword}
                                onChange={e => setLoginRePassword(e.target.value)}
                                placeholder="Re enter Password"
                                className="w-full bg-white text-center text-black font-bold py-3.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-white placeholder:text-black placeholder:font-bold px-12"
                              />
                              <button
                                type="button"
                                onClick={() => setShowRePassword(!showRePassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors focus:outline-none"
                              >
                                {showRePassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                            
                            {authError && (
                              <div className="bg-rose-500/10 border-l-4 border-rose-500 p-3 rounded-lg flex gap-2 text-rose-500 text-xs font-semibold w-full bg-white/90 shadow-lg">
                                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                                <span>{authError}</span>
                              </div>
                            )}

                            <button 
                              type="submit"
                              disabled={authLoading}
                              className="w-auto px-8 bg-white text-black font-bold py-3.5 rounded-full text-lg mt-4 mb-2 hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50"
                            >
                              {authLoading ? '...' : 'Sign up'}
                            </button>
                            
                            <div className="flex items-center w-full justify-center gap-4 py-2 opacity-90 my-2">
                              <div className="h-px bg-white flex-1 min-w-[30px]"></div>
                              <span className="text-white text-sm font-medium leading-none">or</span>
                              <div className="h-px bg-white flex-1 min-w-[30px]"></div>
                            </div>
                            
                            <div className="text-center text-white mt-1">
                              <div className="text-lg font-bold">Already have an account</div>
                              <button type="button" onClick={() => setShowEmailLoginForm(false)} className="text-xl font-bold mt-1.5 focus:outline-none active:scale-[0.98]">
                                Log in
                              </button>
                            </div>
                            
                            {/* Hidden predefined login options for testing purposes mapped onto UI actions */}
                            <div className="mt-8 opacity-0 pointer-events-none absolute" aria-hidden="true">
                              <button type="button" onClick={quickFillAdmin}>Admin</button>
                              <button type="button" onClick={() => triggerGoogleSandboxSimulation("theabhishekar@gmail.com")}>Auto</button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    // =========================================
                    // LOGGED-IN SYSTEM CONTROLLER PANEL
                    // =========================================
                    <motion.div 
                      key="emu-dashboard"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      {/* =========================================
                          TAB 1: ALLOCATIONS (TASKS PANEL)
                          ========================================= */}
                      {activeTab === "tasks" && (
                        <div className="space-y-3">
                          
                          {/* Search & Setup Header */}
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-extrabold tracking-wider uppercase">
                              <Filter className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Active Workspaces ({filteredTasks.length})</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button 
                                onClick={openCreateTask}
                                className="bg-indigo-600 text-white hover:bg-indigo-700 py-1 px-2.5 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Task</span>
                              </button>
                            </div>
                          </div>

                          {/* Filters Board styled like ShadCN */}
                          <div className={`border p-3.5 rounded-2xl space-y-3.5 shadow-3xs ${
                            isEmuDarkTheme ? 'bg-[#18181b] border-zinc-800' : 'bg-white border-slate-100'
                          }`}>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                              <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search tasks, descriptions..."
                                className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-sans ${
                                  isEmuDarkTheme 
                                    ? 'bg-[#09090b] border-zinc-800 text-white placeholder:text-zinc-600' 
                                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'
                                }`}
                              />
                              {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Status and Type Toggles */}
                            <div className="flex flex-col gap-2">
                              {/* Status Badges Filter */}
                              <div className="flex flex-wrap gap-1">
                                {["all", "pending", "in_progress", "completed"].map((stat) => (
                                  <button
                                    key={stat}
                                    onClick={() => setTaskFilter(stat as any)}
                                    className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold transition-colors cursor-pointer capitalize ${
                                      taskFilter === stat 
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                                        : isEmuDarkTheme
                                        ? "bg-zinc-800 text-zinc-400 border-zinc-800 hover:text-zinc-100"
                                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                                    }`}
                                  >
                                    {stat.replace("_", " ")}
                                  </button>
                                ))}
                              </div>

                              {/* Manager Specific Allocations filter */}
                              {user.role === "manager" && (
                                <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200/60 text-[10px]">
                                  {["all", "assigned", "self"].map((type) => (
                                    <button
                                      key={type}
                                      onClick={() => setTaskTypeFilter(type as any)}
                                      className={`flex-1 py-1 text-center font-bold rounded-md transition-all ${
                                        taskTypeFilter === type 
                                          ? "bg-white text-indigo-600 shadow-xs" 
                                          : "text-zinc-500 hover:text-zinc-800"
                                      }`}
                                    >
                                      {type === "all" ? "All" : type === "assigned" ? "Assigned" : "Self-Created"}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Dynamic Task Cards List */}
                          {loadingTasks ? (
                            <div className="py-12 text-center text-zinc-400 text-xs flex flex-col items-center gap-2">
                              <div className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                              <span>Aligning payloads...</span>
                            </div>
                          ) : filteredTasks.length === 0 ? (
                            <div className={`border border-dashed rounded-2xl p-8 text-center ${
                              isEmuDarkTheme ? 'bg-[#18181b]/50 border-zinc-850' : 'bg-white border-slate-200'
                            }`}>
                              <Briefcase className="w-7 h-7 mx-auto mb-2 text-zinc-400/40" />
                              <p className={`text-xs font-bold ${isEmuDarkTheme ? 'text-zinc-300' : 'text-slate-900'}`}>
                                No work found
                              </p>
                              <p className="text-[10px] mt-1 text-zinc-400">
                                Wide your filters or allocate a new task to manager rosters.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3.5">
                              {filteredTasks.map((task) => {
                                const isSelfCreated = task.createdBy === user.id && task.creatorRole === "manager";
                                const isAssignedTaskForManager = user.role === "manager" && !isSelfCreated;

                                return (
                                  <motion.div 
                                    layout
                                    key={task.id}
                                    onClick={() => openEditTask(task)}
                                    className={`p-4 rounded-2xl border shadow-3xs cursor-pointer transition-all flex flex-col space-y-3 ${
                                      isEmuDarkTheme 
                                        ? 'bg-[#18181b] border-zinc-800/80 hover:border-zinc-700' 
                                        : 'bg-white border-slate-100 hover:border-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-1.5">
                                      <div className="min-w-0">
                                        <h4 className={`font-bold text-xs truncate leading-snug font-sans ${isEmuDarkTheme ? 'text-zinc-100' : 'text-slate-940'}`}>
                                          {task.title}
                                        </h4>
                                        
                                        {/* Row of metadata Badges */}
                                        <div className="flex flex-wrap gap-1 items-center mt-1">
                                          {task.creatorRole === "admin" ? (
                                            <span className="text-[8px] tracking-wide bg-indigo-500/10 text-indigo-400 font-bold px-1.5 py-0.5 rounded border border-indigo-500/10">
                                              Admin allocation
                                            </span>
                                          ) : (
                                            <span className="text-[8px] tracking-wide bg-amber-500/10 text-amber-500 font-bold px-1.5 py-0.5 rounded border border-amber-500/10">
                                              Self created
                                            </span>
                                          )}

                                          <span className={`text-[8px] tracking-wide font-extrabold px-1.5 py-0.5 rounded-full uppercase ${
                                            task.status === "completed" 
                                              ? "bg-emerald-500/15 text-emerald-400" 
                                              : task.status === "in_progress"
                                              ? "bg-sky-500/15 text-sky-400"
                                              : "bg-slate-500/15 text-zinc-400"
                                          }`}>
                                            {task.status.replace("_", " ")}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="shrink-0">
                                        {task.status === "completed" ? (
                                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        ) : task.status === "pending" ? (
                                          <Clock className="w-4 h-4 text-zinc-400" />
                                        ) : null}
                                      </div>
                                    </div>

                                    {/* Task Brief Description block */}
                                    <p className={`text-[11px] leading-relaxed p-2.5 rounded-xl border ${
                                      isEmuDarkTheme 
                                        ? 'bg-[#09090b] border-zinc-850 text-zinc-400' 
                                        : 'bg-slate-50 border-slate-100 text-slate-600'
                                    }`}>
                                      {task.description}
                                    </p>

                                    {/* Assigned target Details */}
                                    <div className="flex items-center justify-between text-[10px] text-zinc-400 border-t border-zinc-800/10 pt-2 font-mono">
                                      <div className="flex items-center gap-1 truncate">
                                        <User className="w-3 h-3 text-indigo-400 shrink-0" />
                                        <span className="truncate">
                                          {task.assignedToName ? (
                                            <span className="font-bold text-indigo-400">{task.assignedToName}</span>
                                          ) : (
                                            <span className="italic text-zinc-500">Unallocated draft</span>
                                          )}
                                        </span>
                                      </div>
                                      <span className="shrink-0">
                                        {new Date(task.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                                      </span>
                                    </div>

                                    {/* Action items updating bar for managers */}
                                    {isAssignedTaskForManager && (
                                      <div className={`p-2.5 rounded-xl border flex flex-col space-y-1.5 ${
                                        isEmuDarkTheme ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50/70 border-slate-100'
                                      }`}>
                                        <span className="text-[8px] uppercase tracking-wider font-extrabold text-indigo-400">
                                          Reporting Board: Toggle Status
                                        </span>
                                        <div className="grid grid-cols-3 gap-1">
                                          {(["pending", "in_progress", "completed"] as TaskStatus[]).map((st) => (
                                            <button
                                              key={st}
                                              type="button"
                                              onClick={() => handleUpdateStatusOnly(task.id, st)}
                                              className={`py-1 rounded text-[8px] font-extrabold tracking-wide text-center uppercase cursor-pointer ${
                                                task.status === st
                                                  ? "bg-slate-900 text-white border-zinc-700 shadow-xs"
                                                  : "bg-white text-zinc-500 border border-zinc-200 hover:bg-zinc-50"
                                              }`}
                                            >
                                              {st === 'pending' ? 'Wait' : st === 'in_progress' ? 'Run' : 'Done'}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Custom Action Trigger Panel */}
                                    <div className="flex items-center justify-end gap-1.5 pt-1">
                                      
                                      {/* WhatsApp click-to-chat sharing button */}
                                      {user.role === "admin" && task.assignedTo && task.whatsApp && (
                                        <a 
                                          href={getWhatsAppShareLink(task)}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="bg-[#25D366] text-white hover:bg-[#128C7E] font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-xs shrink-0"
                                        >
                                          <Send className="w-3 h-3 text-white" />
                                          <span>WhatsApp</span>
                                          <ExternalLink className="w-2 h-2" />
                                        </a>
                                      )}

                                      {/* Modification capabilities */}
                                      {(user.role === "admin" || isSelfCreated) && (
                                        <div className="flex gap-1">
                                          <button 
                                            onClick={() => openEditTask(task)}
                                            className={`p-1.5 rounded-lg border hover:text-indigo-500 transition-all ${
                                              isEmuDarkTheme ? 'border-zinc-855 text-zinc-500' : 'border-slate-200 text-slate-400'
                                            }`}
                                            title="Edit spec sheet"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteTask(task.id)}
                                            className={`p-1.5 rounded-lg border hover:text-rose-500 transition-all ${
                                              isEmuDarkTheme ? 'border-zinc-855 text-zinc-500' : 'border-slate-200 text-slate-400'
                                            }`}
                                            title="Discard project"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* =========================================
                          TAB 2: MANAGERS PANEL (ADMIN VIEW ONLY)
                          ========================================= */}
                      {activeTab === "managers" && (
                        <div className="space-y-3">
                          
                          {/* Title block */}
                          <div className="flex items-center justify-between gap-1 mt-1">
                            <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-extrabold tracking-wider uppercase">
                              <Users className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Registered Managers ({managers.length})</span>
                            </div>

                            <button 
                              onClick={() => {
                                setMgrEmail("");
                                setMgrPassword("");
                                setMgrName("");
                                setMgrWhatsApp("");
                                setMgrFormError(null);
                                setIsManagerModalOpen(true);
                              }}
                              className="bg-indigo-600 text-white hover:bg-indigo-700 py-1 px-2.5 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Register</span>
                            </button>
                          </div>

                          {loadingManagers ? (
                            <div className="py-12 text-center text-zinc-400 text-xs flex flex-col items-center gap-2">
                              <div className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                              <span>Updating roster database...</span>
                            </div>
                          ) : managers.length === 0 ? (
                            <div className={`border border-dashed rounded-2xl p-8 text-center ${
                              isEmuDarkTheme ? 'bg-[#18181b]/50 border-zinc-855' : 'bg-white border-slate-200'
                            }`}>
                              <Users className="w-7 h-7 mx-auto mb-2 text-zinc-400/40" />
                              <p className={`text-xs font-bold ${isEmuDarkTheme ? 'text-zinc-300' : 'text-slate-900'}`}>
                                Roster is empty
                              </p>
                              <p className="text-[10px] mt-1 text-zinc-400">
                                Click "Register" to add dedicated managers.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {managers.map((mgr) => {
                                const allocatedTasksCount = tasks.filter(t => t.assignedTo === mgr.id).length;
                                const completedCount = tasks.filter(t => t.assignedTo === mgr.id && t.status === "completed").length;
                                const isSelected = selectedManagerId === mgr.id;
                                const managerTasks = tasks.filter(t => t.assignedTo === mgr.id || t.createdBy === mgr.id);

                                return (
                                  <motion.div 
                                    layout
                                    key={mgr.id}
                                    className={`rounded-2xl border shadow-3xs overflow-hidden transition-all flex flex-col ${
                                      isEmuDarkTheme 
                                        ? 'bg-[#18181b] border-zinc-800 hover:border-zinc-700' 
                                        : 'bg-white border-slate-100 hover:border-slate-200'
                                    }`}
                                  >
                                    <div 
                                      className="p-4 flex flex-col space-y-3 cursor-pointer"
                                      onClick={() => setViewManagerTasksId(mgr.id)}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/15 flex items-center justify-center font-extrabold text-xs shrink-0">
                                            {mgr.name.charAt(0).toUpperCase()}
                                          </div>
                                          <div className="min-w-0">
                                            <h4 className={`font-bold text-xs truncate leading-none ${isEmuDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                                              {mgr.name}
                                            </h4>
                                            <span className="text-[9px] text-[#2563EB]/80 font-mono mt-1.5 flex items-center gap-1 truncate">
                                              <Mail className="w-2.5 h-2.5 text-zinc-400" />
                                              {mgr.email}
                                            </span>
                                          </div>
                                        </div>

                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteManager(mgr.id, mgr.name);
                                          }}
                                          className={`p-1.5 rounded-lg border hover:text-rose-600 transition-colors shrink-0 ${
                                            isEmuDarkTheme ? 'border-zinc-800 text-zinc-500' : 'border-slate-100 text-slate-400'
                                          }`}
                                          title="Revoke manager credentials"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                      {/* Manager statistics display container */}
                                      <div className={`px-3 py-2 rounded-xl grid grid-cols-2 gap-2 text-[10px] border font-mono ${
                                        isEmuDarkTheme ? 'bg-[#09090b] border-zinc-850 text-zinc-400' : 'bg-slate-50 border-slate-100/80 text-slate-600'
                                      }`}>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
                                          <span className="truncate">{mgr.whatsApp}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 justify-end">
                                          <Briefcase className="w-3 h-3 text-zinc-400 shrink-0" />
                                          <span>Allocated: <b>{allocatedTasksCount}</b> ({completedCount} done)</span>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* =========================================
                          TAB 4: CALENDAR / SCHEDULING PANEL
                          ========================================= */}
                      {activeTab === "calendar" && (
                        <div className="space-y-4">
                          
                          {/* Title block */}
                          <div className="flex items-center justify-between gap-1 mt-1">
                            <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-extrabold tracking-wider uppercase">
                              <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Timeline & Schedules</span>
                            </div>

                            <button 
                              onClick={openCreateTask}
                              className="text-[10px] bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all text-white font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span className="hidden sm:inline">Add Task</span>
                              <span className="sm:hidden">Add</span>
                            </button>
                          </div>

                          {/* Calendar View */}
                          <div className={`p-4 rounded-[32px] border flex flex-col gap-3 relative ${
                            isEmuDarkTheme ? 'bg-[#18181b] border-zinc-800 text-zinc-100' : 'bg-white border-slate-100 text-slate-800 shadow-sm'
                          }`}>
                            <div className="w-full flex justify-center pb-6 mb-2 relative">
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                modifiers={{ hasTask: taskDates }}
                                className="rounded-xl bg-transparent"
                                captionLayout="dropdown"
                              />

                              {/* Separator line behind button */}
                              <div className="absolute bottom-0 left-4 right-4 h-px border-b border-zinc-100 dark:border-zinc-800/80"></div>

                              <button 
                                onClick={() => {
                                  const d = selectedDate || new Date();
                                  const offset = d.getTimezoneOffset() * 60000;
                                  const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 10);
                                  setTaskScheduledDate(localISOTime);
                                  openCreateTask();
                                }}
                                className="absolute -bottom-5 right-4 w-12 h-12 bg-[#2563EB] hover:bg-blue-700 active:scale-95 transition-all text-white rounded-full flex items-center justify-center shadow-indigo-600/40 shadow-lg cursor-pointer z-10"
                              >
                                <Plus className="w-6 h-6" />
                              </button>
                            </div>
                            
                            <h4 className="flex justify-between items-end px-1 mt-6">
                              <span className={`text-[15px] font-bold tracking-tight ${isEmuDarkTheme ? "text-white" : "text-slate-900"}`}>
                                Events
                              </span>
                              <button className={`text-[11px] font-bold ${isEmuDarkTheme ? "text-zinc-400" : "text-slate-500 hover:text-slate-700"}`} onClick={() => {
                                setActiveTab("tasks");
                              }}>View All</button>
                            </h4>
                            
                            {/* Selected Date List */}
                            {(() => {
                              if (!selectedDate) {
                                return (
                                  <div className={`py-6 text-center text-xs font-mono font-bold border-2 border-dashed rounded-xl ${isEmuDarkTheme ? 'text-zinc-600 border-zinc-800/80' : 'text-slate-400 border-slate-200'}`}>
                                    Select a date
                                  </div>
                                );
                              }

                              const targetDateStr = (() => {
                                const d = selectedDate;
                                const offset = d.getTimezoneOffset() * 60000;
                                return (new Date(d.getTime() - offset)).toISOString().slice(0, 10);
                              })();

                              const events = tasks.filter(t => t.scheduledDate === targetDateStr);
                              
                              if (events.length === 0) {
                                return (
                                  <div className={`py-6 text-center text-xs font-mono font-bold border-2 border-dashed rounded-xl ${isEmuDarkTheme ? 'text-zinc-600 border-zinc-800/80' : 'text-slate-400 border-slate-200'}`}>
                                    No Tasks for this date
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-3">
                                  {events.map((task, i) => {
                                    // Make different colors for tasks based on index optionally
                                    const colors = ["bg-blue-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500"];
                                    const colorClass = colors[i % colors.length];

                                    return (
                                      <div key={task.id} className={`flex rounded-xl overflow-hidden shadow-xs border cursor-pointer transition-transform active:scale-[0.98] ${
                                        isEmuDarkTheme ? 'bg-[#09090b] border-zinc-800' : 'bg-white border-slate-200'
                                      }`} onClick={() => openEditTask(task)}>
                                        <div className={`w-16 ${colorClass} flex flex-col items-center justify-center text-white py-3`}>
                                          <span className="text-xl font-bold font-sans">
                                            {selectedDate.getDate()}
                                          </span>
                                          <span className="text-[8px] font-extrabold uppercase tracking-widest opacity-90">
                                            {selectedDate.toLocaleString('en-US', { month: 'short' })}
                                          </span>
                                        </div>
                                        <div className="flex-1 p-3 flex flex-col justify-center gap-1">
                                          <h3 className={`text-[13px] font-bold font-sans line-clamp-2 ${isEmuDarkTheme ? 'text-zinc-100' : 'text-slate-800'}`}>
                                            {task.title}
                                          </h3>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* =========================================
                          TAB 5: USER PROFILE & SETTINGS
                          ========================================= */}
                      {activeTab === "profile" && (
                        <div className="space-y-4">
                          
                          {/* Design-inspired Profile Card */}
                          <div className={`rounded-[32px] border overflow-hidden ${
                            isEmuDarkTheme ? 'bg-[#18181b] border-zinc-800' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/40'
                          }`}>
                            {/* Top Abstract Banner */}
                            <div className="h-32 w-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 relative">
                              {/* If you wanted an actual image banner: */}
                              {/* <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" className="w-full h-full object-cover opacity-80 mix-blend-overlay" alt="Abstract Background" /> */}
                              
                              {/* Profile Image Overlapping */}
                              <div className={`absolute -bottom-8 left-5 w-16 h-16 rounded-full border-[3px] flex items-center justify-center overflow-hidden bg-slate-100 ${isEmuDarkTheme ? 'border-[#18181b]' : 'border-white'}`}>
                                <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 flex items-center justify-center font-bold text-2xl">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                              </div>
                            </div>

                            <div className="pt-10 px-5 pb-5">
                              {/* Name & Role Section */}
                              <div className="mb-5">
                                <h3 className={`text-xl font-bold tracking-tight ${isEmuDarkTheme ? 'text-white' : 'text-slate-900'}`}>{user.name}</h3>
                                <p className="text-zinc-500 text-[13px] font-medium capitalize mt-0.5">{user.role}</p>
                              </div>

                              {/* Form Section */}
                              <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div className="space-y-3">
                                  
                                  <div className="space-y-1">
                                    <label className="text-[10px] uppercase tracking-widest font-extrabold text-zinc-400">Full Name</label>
                                    <input
                                      type="text"
                                      required
                                      value={profileName}
                                      onChange={(e) => setProfileName(e.target.value)}
                                      className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${
                                        isEmuDarkTheme ? 'bg-[#09090b] text-white border border-zinc-800' : 'bg-slate-50 text-slate-800 border-none'
                                      }`}
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] uppercase tracking-widest font-extrabold text-zinc-400">Email Address</label>
                                    <input
                                      type="email"
                                      disabled
                                      value={user.email}
                                      className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium opacity-60 cursor-not-allowed ${
                                        isEmuDarkTheme ? 'bg-[#09090b] text-zinc-400 border border-zinc-800' : 'bg-slate-50 text-slate-500 border-none'
                                      }`}
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] uppercase tracking-widest font-extrabold text-zinc-400">Phone Number</label>
                                    <div className="relative">
                                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium z-10 select-none pointer-events-none opacity-50">+91</span>
                                      <input
                                        type="text"
                                        required
                                        value={profileWhatsApp}
                                        onChange={(e) => setProfileWhatsApp(e.target.value)}
                                        className={`w-full pl-12 pr-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${
                                          isEmuDarkTheme ? 'bg-[#09090b] text-white border border-zinc-800' : 'bg-slate-50 text-slate-800 border-none'
                                        }`}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-3">
                                  <button
                                    type="submit"
                                    disabled={isUpdatingProfile}
                                    className={`w-full py-3.5 rounded-3xl font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center ${
                                      isEmuDarkTheme ? 'bg-zinc-100 text-zinc-900 hover:bg-white' : 'bg-[#0f0f0f] text-white hover:bg-black'
                                    }`}
                                  >
                                    {isUpdatingProfile ? (
                                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    ) : "Update"}
                                  </button>
                                </div>
                              </form>
                            </div>
                          </div>

                          <div className={`p-1.5 rounded-3xl border flex justify-center ${
                            isEmuDarkTheme ? 'bg-rose-950/20 border-rose-900/30' : 'bg-white border-rose-100 shadow-sm'
                          }`}>
                            <button
                              onClick={handleLogout}
                              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 py-3 rounded-2xl font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                              <LogOut className="w-4 h-4" />
                              Logout
                            </button>
                          </div>
                        </div>
                      )}

                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* =========================================
                  APP TOAST SYSTEM (Bottom screen alerts)
                  ========================================= */}
              <AnimatePresence>
                {toast && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    id="emu-toast"
                    className={`absolute bottom-20 left-4 right-4 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-left text-[11px] font-semibold border shadow-md backdrop-blur-md ${
                      toast.type === "success" 
                        ? "bg-slate-900/90 text-emerald-400 border-emerald-500/20" 
                        : toast.type === "error"
                        ? "bg-slate-900/90 text-rose-400 border-rose-500/30"
                        : "bg-slate-900/90 text-zinc-200 border-zinc-700/40"
                    }`}
                  >
                    {toast.type === "success" && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                    {toast.type === "error" && <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                    <span className="flex-1 leading-snug">{toast.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* =========================================
                  IN-APP SYSTEM TAB BAR (BOTTOM NAVIGATION)
                  ========================================= */}
              {user && (
                <div className={`h-[58px] border-t absolute bottom-[18px] inset-x-0 flex items-center justify-around z-20 transition-colors ${
                  isEmuDarkTheme 
                    ? "bg-[#09090b] border-zinc-800 text-zinc-100" 
                    : "bg-white/95 border-slate-100 text-slate-800 backdrop-blur-md"
                }`}>
                  <button 
                    onClick={() => setActiveTab("tasks")}
                    className={`flex flex-col items-center gap-1 p-1 flex-1 transition-all capitalize cursor-pointer rounded-lg ${
                      activeTab === "tasks" ? "text-indigo-600 scale-102 font-extrabold" : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="text-[9px] font-sans">Dashboard</span>
                  </button>

                  {user.role === "admin" && (
                    <button 
                      onClick={() => setActiveTab("managers")}
                      className={`flex flex-col items-center gap-1 p-1 flex-1 transition-all capitalize cursor-pointer rounded-lg ${
                        activeTab === "managers" ? "text-indigo-600 scale-102 font-extrabold" : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span className="text-[9px] font-sans">Managers</span>
                    </button>
                  )}

                  <button 
                    onClick={() => setActiveTab("calendar")}
                    className={`flex flex-col items-center gap-1 p-1 flex-1 transition-all capitalize cursor-pointer rounded-lg ${
                      activeTab === "calendar" ? "text-indigo-600 scale-102 font-extrabold" : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4" />
                    <span className="text-[9px] font-sans">Calendar</span>
                  </button>
                </div>
              )}

              {/* =========================================
                  VOICE AGENT FLOATING BUTTON AND MODAL
                  ========================================= */}
              {user && user.role === "admin" && (
                <>
                  {/* Floating Action Button */}
                  <div className="absolute bottom-[90px] left-5 z-40">
                    <button
                      onClick={startVoiceAgent}
                      className="w-14 h-14 bg-rose-500 rounded-full shadow-xl flex items-center justify-center text-white cursor-pointer hover:bg-rose-400 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Mic className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Voice Interface Modal Overlay */}
                  <AnimatePresence>
                    {isVoiceWidgetExpanded && (
                      <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="absolute inset-[0px] z-50 rounded-[40px] bg-gradient-to-br from-orange-100 to-rose-200 shadow-2xl flex flex-col p-6 backdrop-blur-3xl overflow-hidden"
                      >
                        {/* Top Notch Spacer */}
                        <div className="h-10 shrink-0 w-full" />
                        
                        {/* Live Transcribed Placeholder Card */}
                        <motion.div 
                          initial={{ y: -20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="bg-white/95 backdrop-blur-xl shadow-lg rounded-[28px] p-5 mb-auto"
                        >
                          <div className="flex items-start gap-4 mb-3">
                             <div className="w-6 h-6 rounded-full border-2 border-dashed border-rose-400 flex items-center justify-center mt-0.5">
                               {isListening && <div className="w-2 h-2 bg-rose-500 rounded-full transition-all" />}
                             </div>
                             <h3 className="text-[17px] font-medium text-slate-800 leading-snug flex-1">
                               {liveTranscript || "Waiting for speech..."}
                             </h3>
                          </div>
                          
                          <div className="ml-10 flex items-center gap-4">
                            <span className="text-[12px] font-medium text-slate-500 flex items-center gap-1.5">
                              <Briefcase className="w-3.5 h-3.5" /> Inbox
                            </span>
                            <span className="text-[12px] font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                              <CalendarIcon className="w-3.5 h-3.5" /> Auto-schedule
                            </span>
                          </div>
                        </motion.div>

                        {/* Status Text */}
                        <div className="text-center mb-10 text-slate-800">
                          <h2 className="font-bold text-xl tracking-tight">Listening...</h2>
                          <p className="opacity-70 text-[14px] mt-1.5 font-medium">Say everything you need to get done.</p>
                        </div>

                        {/* Controls Bottom Row */}
                        <div className="flex items-center justify-between mb-16 px-2">
                          {/* Pause button */}
                          <button 
                            onClick={stopVoiceAgent}
                            className="w-14 h-14 bg-black/5 text-slate-800 rounded-full flex items-center justify-center hover:bg-black/10 transition-all font-bold"
                          >
                            <Pause className="w-6 h-6 fill-current" />
                          </button>

                          {/* Sound wave visualization */}
                          <div className="flex-1 flex items-center justify-center gap-[3px] px-4 opacity-70">
                            {Array.from({ length: 24 }).map((_, i) => (
                              <motion.div 
                                key={i}
                                animate={isListening ? { height: [8, Math.random() * 30 + 10, 8] } : { height: 4 }}
                                transition={isListening ? { repeat: Infinity, duration: 0.5, delay: i * 0.05 } : {}}
                                className="w-1 bg-rose-500 rounded-full"
                              />
                            ))}
                          </div>

                          {/* Confirm/Done Button */}
                          <button 
                            onClick={stopVoiceAgent}
                            className="w-14 h-14 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-500 hover:scale-105 active:scale-95 transition-all outline-none"
                          >
                            <Check className="w-7 h-7 stroke-[2.5]" />
                          </button>
                        </div>

                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {/* =========================================
                  SIMULATED SYSTEM NAVIGATION PANEL OR PILL
                  ========================================= */}
              <div className={`h-[20px] absolute bottom-0 inset-x-0 flex items-center justify-center z-30 pointer-events-none ${isEmuDarkTheme ? 'bg-[#09090b]' : 'bg-white'}`}>
                {emuNavigation === "gesture" ? (
                  // Sleek Single Android Gesture Bar Line
                  <div className="w-28 h-1.5 bg-zinc-500/50 rounded-full cursor-pointer pointer-events-auto hover:bg-zinc-650 transition-colors" title="Gesture Pill Swipe up to dismiss Sheets" onClick={() => {
                    setIsTaskModalOpen(false);
                    setIsManagerModalOpen(false);
                  }}></div>
                ) : (
                  // Traditional Android back, home, overview buttons
                  <div className="w-full px-12 flex items-center justify-between pointer-events-auto text-zinc-400">
                    <button className="p-1 hover:text-zinc-600 cursor-pointer" onClick={() => {
                      setIsTaskModalOpen(false);
                      setIsManagerModalOpen(false);
                    }}>
                      <div className="w-3.5 h-3.5 border-y-2 border-l-2 rotate-45 border-zinc-500 filter drop-shadow"></div>
                    </button>
                    <button className="p-1 hover:text-zinc-600 cursor-pointer" onClick={() => {
                      setActiveTab("tasks");
                    }}>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-500"></div>
                    </button>
                    <button className="p-1 hover:text-zinc-600 cursor-pointer" onClick={() => {
                      if (user?.role === "admin") setActiveTab("managers");
                    }}>
                      <div className="w-3.5 h-3.5 border-2 border-zinc-500 rounded"></div>
                    </button>
                  </div>
                )}
              </div>

            {/* --- EMULATOR SHEET DIALOG: CREATE OR EDIT TASK --- */}
            <AnimatePresence>
              {isTaskModalOpen && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-end justify-center overflow-hidden">
                  
                  {/* Backdrop Closer */}
                  <div className="absolute inset-0 z-0" onClick={() => setIsTaskModalOpen(false)}></div>
                  
                  <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 28, stiffness: 220 }}
                    className={`rounded-t-3xl w-full max-h-[85%] flex flex-col p-5 border-t z-10 relative shadow-2xl ${
                      isEmuDarkTheme ? 'bg-[#18181b] border-zinc-800 text-zinc-100' : 'bg-white border-slate-100 text-slate-800'
                    }`}
                  >
                    {/* Sliding Handle Decorator */}
                    <div className="w-12 h-1 bg-zinc-300 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsTaskModalOpen(false)}></div>

                    {/* Header bar */}
                    <div className="flex justify-between items-center pb-3 border-b border-zinc-800/5 select-none">
                      <h3 className="font-sans font-bold text-sm text-indigo-500 uppercase tracking-wider">
                        {editingTask ? "Modify Work Specifications" : "Allocate Task specs"}
                      </h3>
                      <button 
                        onClick={() => setIsTaskModalOpen(false)}
                        className={`p-1 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 transition-all ${isEmuDarkTheme ? 'text-zinc-400' : 'text-slate-400'}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Form Layout Scroll */}
                    <form onSubmit={handleSaveTask} className="space-y-4 py-4 overflow-y-auto flex-1 text-left" style={{ scrollbarWidth: "none" }}>
                      <div className="space-y-1.5">
                        <label className={`block text-[10px] uppercase tracking-widest font-extrabold ${isEmuDarkTheme ? 'text-zinc-400' : 'text-slate-500'}`}>
                          Task Work Title
                        </label>
                        <input 
                          type="text"
                          required
                          disabled={user?.role !== "admin" && editingTask != null && editingTask?.createdBy !== user?.id}
                          value={taskTitle}
                          onChange={e => setTaskTitle(e.target.value)}
                          placeholder="e.g. Conduct security test run"
                          className={`w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                            user?.role !== "admin" && editingTask != null && editingTask?.createdBy !== user?.id ? "opacity-60 cursor-not-allowed" : ""
                          } ${
                            isEmuDarkTheme 
                              ? 'bg-[#09090b] border border-zinc-800 text-white placeholder:text-zinc-600' 
                              : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className={`block text-[10px] uppercase tracking-widest font-extrabold ${isEmuDarkTheme ? 'text-zinc-400' : 'text-slate-500'}`}>
                          Details and Guidelines
                        </label>
                        <textarea 
                          required
                          disabled={user?.role !== "admin" && editingTask != null && editingTask?.createdBy !== user?.id}
                          value={taskDesc}
                          onChange={e => setTaskDesc(e.target.value)}
                          placeholder="Outline concrete metrics, deadlines, and requirements..."
                          rows={3}
                          className={`w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-sans ${
                            user?.role !== "admin" && editingTask != null && editingTask?.createdBy !== user?.id ? "opacity-60 cursor-not-allowed" : ""
                          } ${
                            isEmuDarkTheme 
                              ? 'bg-[#09090b] border border-zinc-800 text-white placeholder:text-zinc-600' 
                              : 'bg-slate-50 border border-slate-200 text-slate-905 placeholder:text-slate-400'
                          }`}
                        ></textarea>
                      </div>

                      <div className="space-y-1.5">
                        <label className={`block text-[10px] uppercase tracking-widest font-extrabold ${isEmuDarkTheme ? 'text-zinc-400' : 'text-slate-500'}`}>
                          Scheduled Date
                        </label>
                        <input 
                          type="date"
                          disabled={user?.role !== "admin" && editingTask != null && editingTask?.createdBy !== user?.id}
                          value={taskScheduledDate}
                          onChange={e => setTaskScheduledDate(e.target.value)}
                          className={`w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-sans font-bold ${
                            user?.role !== "admin" && editingTask != null && editingTask?.createdBy !== user?.id ? "opacity-60 cursor-not-allowed" : ""
                          } ${
                            isEmuDarkTheme 
                              ? 'bg-[#09090b] border border-zinc-800 text-white' 
                              : 'bg-slate-50 border border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>

                      {user?.role === "admin" && (
                        <div className="space-y-1.5">
                          <label className="block text-[10px] uppercase tracking-widest font-extrabold text-slate-505">
                            Target Team Manager
                          </label>
                          <select 
                            value={taskAssignedTo}
                            onChange={e => setTaskAssignedTo(e.target.value)}
                            className={`w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-sans font-bold ${
                              isEmuDarkTheme 
                                ? 'bg-[#09090b] border border-zinc-800 text-white' 
                                : 'bg-slate-50 border border-slate-200 text-slate-900'
                            }`}
                          >
                            <option value="">-- Save as Draft / Unassigned --</option>
                            {managers.map(mgr => (
                              <option key={mgr.id} value={mgr.id}>{mgr.name} ({mgr.email})</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Status select for admins, self_creator managers, or assigned managers */}
                      {(user?.role === "admin" || (editingTask && (editingTask.createdBy === user?.id || editingTask.assignedTo === user?.id)) || !editingTask) && (
                        <div className="space-y-1.5">
                          <label className="block text-[10px] uppercase tracking-widest font-extrabold text-[#2563EB]">
                            Pipeline Status
                          </label>
                          <select 
                            value={taskStatus}
                            onChange={e => setTaskStatus(e.target.value as TaskStatus)}
                            className={`w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-sans font-bold ${
                              isEmuDarkTheme 
                                ? 'bg-[#09090b] border border-zinc-800 text-white' 
                                : 'bg-slate-50 border border-slate-200 text-slate-900'
                            }`}
                          >
                            <option value="pending">Pending Review (Draft)</option>
                            <option value="in_progress">In Progress (Active)</option>
                            <option value="completed">Completed Successfully (Done)</option>
                          </select>
                        </div>
                      )}

                      {taskFormError && (
                        <div className="bg-rose-500/10 border-l-4 border-rose-500 p-2.5 rounded-lg text-rose-500 text-[11px] flex gap-2 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                          <span>{taskFormError}</span>
                        </div>
                      )}

                      <button 
                        type="submit"
                        disabled={submittingTask}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1 shadow-sm mt-3"
                      >
                        {submittingTask ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            <span>Recording Payload...</span>
                          </>
                        ) : (
                          <span>{editingTask ? "Update Specs" : "Commit Allocation"}</span>
                        )}
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* --- EMULATOR SHEET DIALOG: REGISTER MANAGER PROFILE --- */}
            <AnimatePresence>
              {isManagerModalOpen && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-end justify-center overflow-hidden">
                  
                  {/* Backdrop closer */}
                  <div className="absolute inset-0 z-0" onClick={() => setIsManagerModalOpen(false)}></div>
                  
                  <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 28, stiffness: 220 }}
                    className={`rounded-t-3xl w-full max-h-[85%] flex flex-col p-5 border-t z-10 relative shadow-2xl ${
                      isEmuDarkTheme ? 'bg-[#18181b] border-zinc-800 text-zinc-100' : 'bg-white border-slate-100 text-slate-800'
                    }`}
                  >
                    {/* Sliding handle */}
                    <div className="w-12 h-1 bg-zinc-300 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsManagerModalOpen(false)}></div>

                    <div className="flex justify-between items-center pb-3 border-b border-zinc-800/5 select-none">
                      <h3 className="font-sans font-bold text-sm text-indigo-500 uppercase tracking-wider flex items-center gap-1">
                        <Users className="w-4 h-4 text-indigo-500" />
                        <span>Register Manager Session</span>
                      </h3>
                      <button 
                        onClick={() => setIsManagerModalOpen(false)}
                        className={`p-1 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 transition-all ${isEmuDarkTheme ? 'text-zinc-400' : 'text-slate-400'}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleRegisterManager} className="space-y-3.5 py-4 overflow-y-auto flex-1 text-left" style={{ scrollbarWidth: "none" }}>
                      
                      <div className="space-y-1.5">
                        <label className="block text-[10px] uppercase tracking-widest font-extrabold text-slate-500">
                          Manager Full Name
                        </label>
                        <input 
                          type="text"
                          required
                          value={mgrName}
                          onChange={e => setMgrName(e.target.value)}
                          placeholder="e.g. Abhishek Rawat"
                          className={`w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                            isEmuDarkTheme 
                              ? 'bg-[#09090b] border border-zinc-800 text-white placeholder:text-zinc-600' 
                              : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] uppercase tracking-widest font-extrabold text-slate-500">
                          Secure Login Email
                        </label>
                        <input 
                          type="email"
                          required
                          value={mgrEmail}
                          onChange={e => setMgrEmail(e.target.value)}
                          placeholder="e.g. rawat@team.com"
                          className={`w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                            isEmuDarkTheme 
                              ? 'bg-[#09090b] border border-zinc-800 text-white placeholder:text-zinc-600' 
                              : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] uppercase tracking-widest font-extrabold text-slate-500">
                          Plain-text Password
                        </label>
                        <input 
                          type="password"
                          required
                          value={mgrPassword}
                          onChange={e => setMgrPassword(e.target.value)}
                          placeholder="Minimum 6 characters recommended"
                          className={`w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                            isEmuDarkTheme 
                              ? 'bg-[#09090b] border border-zinc-800 text-white placeholder:text-zinc-600' 
                              : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] uppercase tracking-widest font-extrabold text-slate-500">
                          WhatsApp Mobile Number
                        </label>
                        <input 
                          type="text"
                          required
                          value={mgrWhatsApp}
                          onChange={e => setMgrWhatsApp(e.target.value)}
                          placeholder="Include country code (e.g. +919012345678)"
                          className={`w-full px-3.5 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                            isEmuDarkTheme 
                              ? 'bg-[#09090b] border border-zinc-800 text-white placeholder:text-zinc-600' 
                              : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400'
                          }`}
                        />
                      </div>

                      {mgrFormError && (
                        <div className="bg-rose-500/10 border-l-4 border-rose-500 p-2.5 rounded-lg text-rose-500 text-[11px] flex gap-2 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                          <span>{mgrFormError}</span>
                        </div>
                      )}

                      <button 
                        type="submit"
                        disabled={submittingMgr}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1 shadow-sm mt-3"
                      >
                        {submittingMgr ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            <span>Recording profile...</span>
                          </>
                        ) : (
                          <span>Complete Registry</span>
                        )}
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* --- EMULATOR SHEET DIALOG: VIEW MANAGER TASKS FULL PAGE --- */}
            <AnimatePresence>
              {viewManagerTasksId && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-end justify-center overflow-hidden">
                  
                  {/* Backdrop closer */}
                  <div className="absolute inset-0 z-0" onClick={() => setViewManagerTasksId(null)}></div>
                  
                  <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 28, stiffness: 220 }}
                    className={`rounded-t-3xl w-full h-[96%] flex flex-col border-t z-10 relative shadow-2xl ${
                      isEmuDarkTheme ? 'bg-[#18181b] border-zinc-800 text-zinc-100' : 'bg-slate-50 border-slate-100 text-slate-800'
                    }`}
                  >
                    {(() => {
                      const mgr = managers.find(m => m.id === viewManagerTasksId);
                      const mgrTasks = tasks.filter(t => t.assignedTo === viewManagerTasksId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                      if (!mgr) return null;

                      return (
                        <>
                          <div className={`p-5 pb-3 flex flex-col gap-3 rounded-t-3xl border-b z-20 sticky top-0 ${
                            isEmuDarkTheme ? 'bg-[#18181b]/95 border-zinc-800/80' : 'bg-slate-50/95 border-slate-200/80'
                          } backdrop-blur-md`}>
                            {/* Sliding handle */}
                            <div className="w-12 h-1 bg-zinc-300 rounded-full mx-auto cursor-pointer" onClick={() => setViewManagerTasksId(null)}></div>
                            
                            <div className="flex justify-between items-center select-none pt-2">
                              <div className="flex items-center gap-3 w-full">
                                <div className="w-11 h-11 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/15 flex items-center justify-center font-extrabold text-sm shrink-0">
                                  {mgr.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 pr-4">
                                  <h3 className="font-extrabold text-base truncate">{mgr.name}</h3>
                                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{mgrTasks.length} Allocated Tasks</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => setViewManagerTasksId(null)}
                                className={`p-1.5 rounded-full hover:bg-zinc-500/10 transition-all ${isEmuDarkTheme ? 'text-zinc-400' : 'text-slate-500'}`}
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: "none" }}>
                            {mgrTasks.length === 0 ? (
                              <div className="py-12 text-center text-zinc-400 text-xs flex flex-col items-center gap-2">
                                <Briefcase className="w-8 h-8 opacity-40 text-indigo-500" />
                                <span>No tasks have been allocated yet.</span>
                              </div>
                            ) : (
                              mgrTasks.map((task) => (
                                <div 
                                  key={task.id} 
                                  className={`p-4 rounded-3xl border shadow-xs ${isEmuDarkTheme ? 'bg-[#09090b] border-zinc-800' : 'bg-white border-slate-100'}`}
                                >
                                  <div className="flex items-start justify-between gap-3 relative">
                                    <h4 className="font-bold text-[13px] leading-tight flex-1">{task.title}</h4>
                                    <div className="shrink-0 flex items-center">
                                      <span className={`px-2 py-0.5 text-[9px] uppercase tracking-wider font-extrabold rounded-full ${
                                        task.status === "completed" ? "bg-emerald-500/10 text-emerald-500" :
                                        task.status === "in_progress" ? "bg-blue-500/10 text-blue-500" :
                                        "bg-amber-500/10 text-amber-500"
                                      }`}>
                                        {task.status.replace("_", " ")}
                                      </span>
                                    </div>
                                  </div>

                                  <p className="text-[11px] text-zinc-500 mt-2 mb-3 leading-relaxed w-[95%]">
                                    {task.description}
                                  </p>

                                  <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500">
                                    {task.scheduledDate && (
                                      <div className="flex items-center gap-1 bg-zinc-500/5 px-2 py-1 rounded-md border border-zinc-500/10">
                                        <CalendarIcon className="w-3 h-3 text-indigo-400" />
                                        <span>{new Date(task.scheduledDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 opacity-70">
                                      <span className="font-sans text-[9px] uppercase">Created:</span>
                                      <span>{new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

      </div>
    </div>
  );
}
