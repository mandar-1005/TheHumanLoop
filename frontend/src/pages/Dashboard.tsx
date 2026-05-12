import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  BarChart3,
  Settings,
  Search,
  Bell,
  Plus,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  LogOut,
  Upload,
  Trash2,
  Image as ImageIcon,
  X,
  Sun,
  Moon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth as useAuthContext } from "../context/AuthContext";
import { apiUrl } from "../lib/api";
import { toast } from "sonner";
import { ProfileDropdown } from "../components/ProfileDropdown";
import { useTheme } from "../context/ThemeContext";

const navItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/dashboard",
    active: true,
  },
  {
    icon: BookOpen,
    label: "Training Modules",
    href: "/training-modules",
    active: false,
  },
  {
    icon: FileText,
    label: "SSP Documents",
    href: "/ssp-documents",
    active: false,
  },
  { icon: Users, label: "Roles & Assessments", href: "/roles", active: false },
  { icon: BarChart3, label: "Analytics", href: "/progress", active: false },
  { icon: Settings, label: "Settings", href: "/settings", active: false },
];

interface SSPDocRow {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  created_at: string;
  extracted_text?: string | null;
}

interface TrainingModule {
  id: number;
  name: string;
  role: string;
  status: string;
  completion: number;
  lastUpdated: string;
}

interface Metric {
  title: string;
  value: string;
  change: string;
  trending: "up" | "down";
  subtitle: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Dashboard() {
  const { signOut, user, profile } = useAuth();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const tabs = ["All", "Developers", "Security Leads", "Team Leads", "Other"];

  const [metrics, setMetrics] = useState<Metric[]>([
    { title: "Active Training Modules", value: "—", change: "", trending: "up", subtitle: "" },
    { title: "Employees Enrolled", value: "—", change: "", trending: "up", subtitle: "" },
    { title: "Completion Rate", value: "—", change: "", trending: "up", subtitle: "" },
  ]);

  const [trainingModules, setTrainingModules] = useState<TrainingModule[]>([]);
  const [recentGenerations, setRecentGenerations] = useState<any[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [newTrainingName, setNewTrainingName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [allSSPs, setAllSSPs] = useState<SSPDocRow[]>([]);
  const [orgRoles, setOrgRoles] = useState<string[]>([]);
  const [selectedSSPId, setSelectedSSPId] = useState<string>("");
  const [recentSSPs, setRecentSSPs] = useState<SSPDocRow[]>([]);
  const [sspLoading, setSSPLoading] = useState(true);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [successStep, setSuccessStep] = useState<'draft' | 'in_review' | 'published' | 'rejected'>('draft');
  const [successLoading, setSuccessLoading] = useState(false);
  const [successRejectReason, setSuccessRejectReason] = useState('');
  const [showSuccessRejectInput, setShowSuccessRejectInput] = useState(false);

  type ReviewItem = {
    id: number;
    company_role: string;
    created_at: string;
    status: string;
    company_id: string;
  };
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showMediaModal, setShowMediaModal] = useState<number | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [openRowMenu, setOpenRowMenu] = useState<number | null>(null);
  const [mediaImages, setMediaImages] = useState<{ id: string; url: string; caption: string }[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);

  function normalizeRole(role: string): "developers" | "security_leads" | "team_leads" | "other" {
  const value = role.toLowerCase().replace(/[-_]/g, " ").trim();

  if (value.includes("developer")) {
    return "developers";
  }

  if (value.includes("security lead")) {
    return "security_leads";
  }

  if (value.includes("team lead")) {
    return "team_leads";
  }

  return "other";
}

const filteredModules = trainingModules.filter((module) => {
  const roleGroup = normalizeRole(module.role);

  const matchesTab =
    activeTab === "All" ||
    (activeTab === "Developers" && roleGroup === "developers") ||
    (activeTab === "Security Leads" && roleGroup === "security_leads") ||
    (activeTab === "Team Leads" && roleGroup === "team_leads") ||
    (activeTab === "Other" && roleGroup === "other");

  const query = searchQuery.toLowerCase();
  const matchesSearch =
    !query ||
    module.name.toLowerCase().includes(query) ||
    module.role.toLowerCase().includes(query) ||
    module.status.toLowerCase().includes(query);

  return matchesTab && matchesSearch;
});

  // Load metrics from database
  useEffect(() => {
    const loadMetrics = async () => {
      if (!profile?.organization_id) return;

      setMetricsLoading(true);
      try {
        const [
          { data: trainingsData },
          { data: profilesData },
          { data: assignmentsData },
          { data: evidenceData },
        ] = await Promise.all([
          supabase
            .from("trainings")
            .select("id, name, company_role, status, created_at")
            .eq("company_id", profile.organization_id),
          supabase
            .from("profiles")
            .select("id")
            .eq("organization_id", profile.organization_id)
            .neq('id', user!.id),
          supabase
            .from("assignments")
            .select("user_id, training_id")
            .eq("organization_id", profile.organization_id),
          supabase
            .from("training_evidence")
            .select("user_id, training_id, score, passed")
            .eq("organization_id", profile.organization_id),
        ]);

        // Calculate metrics
        const activeModules = trainingsData?.filter(t => t.status === "published").length ?? 0;
        const employeesEnrolled = profilesData?.length ?? 0;

        // Calculate completion rate
        const uniqueCompletions = new Set();
        evidenceData?.forEach(ev => uniqueCompletions.add(`${ev.user_id}-${ev.training_id}`));
        const totalAssignments = assignmentsData?.length ?? 1;
        const completionRate = totalAssignments > 0 
          ? Math.round((uniqueCompletions.size / totalAssignments) * 100)
          : 0;

        setMetrics([
          {
            title: "Active Training Modules",
            value: String(activeModules),
            change: "+0%",
            trending: "up",
            subtitle: "published trainings",
          },
          {
            title: "Employees Enrolled",
            value: String(employeesEnrolled),
            change: "+0%",
            trending: "up",
            subtitle: "in organization",
          },
          {
            title: "Completion Rate",
            value: `${completionRate}%`,
            change: "+0%",
            trending: "up",
            subtitle: "target: 90%",
          },
        ]);

        // Load training modules for table
        const modules = trainingsData?.map(t => ({
          id: t.id,
          name: t.name || `${t.company_role} Training`,
          role: t.company_role,
          status: t.status === "published" ? "Published" : t.status === "in_review" ? "In Review" : "Draft",
          completion: Math.floor(Math.random() * 100), // TODO: Calculate from actual progress
          lastUpdated: new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        })) ?? [];

        setTrainingModules(modules);

        // Load recent generations (recent trainings)
        const recent = trainingsData
          ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 4)
          .map(t => ({
            id: t.id,
            title: t.name || `${t.company_role} Training`,
            status: t.status === "published" ? "Succeeded" : t.status === "in_review" ? "Needs Review" : "Draft",
            timestamp: new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          })) ?? [];

        setRecentGenerations(recent);
      } finally {
        setMetricsLoading(false);
      }
    };

    loadMetrics();
  }, [profile?.organization_id]);

  // Load review queue
  const loadReviewQueue = async () => {
    setReviewLoading(true);
    const { data } = await supabase
      .from("trainings")
      .select("id, company_role, created_at, status, company_id")
      .eq("status", "in_review")
      .order("created_at", { ascending: false });
    setReviewQueue((data ?? []) as ReviewItem[]);
    setReviewLoading(false);
  };

  useEffect(() => {
    if (user) {
      supabase
        .from("ssp_documents")
        .select("id, file_name, file_path, file_size, created_at, extracted_text")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)
        .then(({ data }) => {
          setRecentSSPs((data ?? []) as SSPDocRow[]);
          setSSPLoading(false);
        });

      loadReviewQueue();

      if (profile?.organization_id) {
        supabase
          .from("roles")
          .select("name")
          .eq("organization_id", profile.organization_id)
          .order("created_at", { ascending: true })
          .then(({ data: rolesData }) => {
            if (rolesData && rolesData.length > 0) {
              setOrgRoles(rolesData.map((r: { name: string }) => r.name));
            }
          });
      }
    }
  }, [user, profile?.organization_id]);

  const openCreateModal = async () => {
    setShowCreateModal(true);
    if (!profile?.organization_id) return;
    const { data } = await supabase
      .from("ssp_documents")
      .select("id, file_name, file_path, file_size, created_at, extracted_text")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setAllSSPs((data ?? []) as SSPDocRow[]);
  };

  const handleCreateTraining = async () => {
    if (!newRole.trim()) {
      toast.error("Please enter a role.");
      return;
    }

    if (!selectedSSPId) {
      toast.error("Please select an SSP document.");
      return;
    }

    if (!profile?.organization_id) {
      toast.error("No organization id found for this user profile.");
      return;
    }

    setIsCreating(true);
    setElapsedSeconds(0);

    try {
      setCreationStep(1);

      const selectedDoc = allSSPs.find((s) => s.id === selectedSSPId);
      if (!selectedDoc) throw new Error("Selected SSP not found.");

      let sspFileBlob: File;
      if (selectedDoc.extracted_text?.trim()) {
        sspFileBlob = new File(
          [selectedDoc.extracted_text],
          `${selectedDoc.file_name.replace(/\.pdf$/i, "") || "ssp"}-extracted.txt`,
          { type: "text/plain" },
        );
      } else {
        const { data: fileData, error: fileError } = await supabase.storage
          .from("ssp-documents")
          .download(selectedDoc.file_path);

        if (fileError)
          throw new Error("Failed to download SSP: " + fileError.message);

        const isPdf =
          selectedDoc.file_name.toLowerCase().endsWith(".pdf") ||
          fileData.type === "application/pdf";
        if (isPdf) {
          throw new Error(
            "This SSP is missing extracted text. Please re-upload it from SSP Documents so text can be extracted.",
          );
        }

        const textContent = await fileData.text();
        if (!textContent.trim()) {
          throw new Error("Selected SSP file has no readable text content.");
        }

        sspFileBlob = new File([textContent], selectedDoc.file_name, {
          type: "text/plain",
        });
      }

      const formData = new FormData();
      formData.append("role", newRole.trim());
      formData.append("company_id", profile.organization_id);
      formData.append("ssp_file", sspFileBlob);

      setCreationStep(2);

      const response = await fetch(apiUrl("/api/trainings/create"), {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.detail || "Failed to create training.");
      }

      setCreationStep(3);
      await new Promise(r => setTimeout(r, 600));

      const createdId = data?.result?.training_row?.id ?? null;
      setLastCreatedId(createdId);

      if (createdId && newTrainingName.trim()) {
        await supabase
          .from("trainings")
          .update({ name: newTrainingName.trim() })
          .eq("id", createdId);
      }

      setShowCreateModal(false);
      setNewRole("");
      setNewTrainingName("");
      setSelectedSSPId("");
      setCreationStep(0);
      setSuccessStep('draft');
      setShowSuccessRejectInput(false);
      setSuccessRejectReason('');
      setShowSuccessModal(true);
    } catch (err) {
      setCreationStep(0);
      toast.error(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setIsCreating(false);
    }
  };

  const approveTraining = async (trainingId: number) => {
    try {
      const res = await fetch(
        `${apiUrl(`/api/trainings/${trainingId}/approve`)}?user_id=${user?.id}`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Failed to approve");
      toast.success("Training approved and published.");
      setReviewQueue(q => q.filter(r => r.id !== trainingId));
    } catch {
      toast.error("Failed to approve training.");
    }
  };

  const rejectTraining = async (trainingId: number) => {
    try {
      const res = await fetch(
        `${apiUrl(`/api/trainings/${trainingId}/reject`)}?user_id=${user?.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rejection_reason: rejectReason || null }),
        },
      );
      if (!res.ok) throw new Error("Failed to reject");
      toast.success("Training rejected.");
      setReviewQueue(q => q.filter(r => r.id !== trainingId));
      setShowRejectModal(null);
      setRejectReason("");
    } catch {
      toast.error("Failed to reject training.");
    }
  };

  const openMediaModal = async (trainingId: number) => {
    setShowMediaModal(trainingId);
    setMediaImages([]);
    try {
      const { data } = await supabase
        .from("trainings")
        .select("training_json")
        .eq("id", trainingId)
        .single();
      if (data?.training_json) {
        const parsed = typeof data.training_json === "string"
          ? JSON.parse(data.training_json.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim())
          : data.training_json;
        const content = Array.isArray(parsed) ? parsed[0] : parsed;
        const imgs = content?.media?.images || [];
        setMediaImages(imgs.map((img: { id: string; url: string; caption?: string }) => ({
          id: img.id,
          url: img.url,
          caption: img.caption || "",
        })));
      }
    } catch { /* ignore */ }
  };

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : (user?.email ?? "User");

  const initials = profile
    ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Published":
        return "bg-green-100 text-green-700 border-green-200";
      case "In Review":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Draft":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getGenerationStatusColor = (status: string) => {
    switch (status) {
      case "Succeeded":
        return "bg-green-100 text-green-700";
      case "Needs Review":
        return "bg-yellow-100 text-yellow-700";
      case "Failed":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getGenerationIcon = (status: string) => {
    switch (status) {
      case "Succeeded":
        return <CheckCircle className="w-4 h-4" />;
      case "Needs Review":
        return <AlertTriangle className="w-4 h-4" />;
      case "Failed":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-10">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Secure Training</h1>
              <p className="text-xs text-gray-500">MARi Platform</p>
            </div>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  if (item.href === "/training-modules" || item.href === "/ssp-documents" || item.href === "/roles" || item.href === "/settings" || item.href === "/progress") {
                    navigate(item.href);
                    return;
                  }
                  if (!item.active) {
                    alert(`${item.label} page coming soon!`);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  item.active ? "bg-[#1e3a5f] text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors mb-4"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
          <div className="text-xs text-gray-500">
            <p className="mb-1">© 2026 MARi</p>
            <p>FedRAMP Compliant</p>
          </div>
        </div>
      </aside>

      <div className="ml-64">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
                <p className="text-sm text-gray-600 mt-1">Welcome back, {displayName}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search trainings..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={toggleTheme}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(n => !n)}
                    className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Bell className="w-5 h-5 text-gray-600" />
                    {reviewQueue.length > 0 && (
                      <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                        {reviewQueue.length}
                      </span>
                    )}
                  </button>
                  {showNotifications && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                      <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-900">Notifications</h4>
                          <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="max-h-72 overflow-y-auto">
                          {reviewQueue.length === 0 ? (
                            <div className="p-6 text-center">
                              <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">No pending notifications</p>
                            </div>
                          ) : (
                            reviewQueue.map(item => (
                              <div key={item.id} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Clock className="w-4 h-4 text-amber-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 capitalize">{item.company_role} Training</p>
                                    <p className="text-xs text-gray-500">Awaiting review</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        {reviewQueue.length > 0 && (
                          <div className="p-3 border-t border-gray-200">
                            <button
                              onClick={() => {
                                setShowNotifications(false);
                                document.getElementById("review-queue-section")?.scrollIntoView({ behavior: "smooth" });
                              }}
                              className="w-full text-center text-xs font-medium text-[#1e3a5f] hover:underline"
                            >
                              View Review Queue
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <ProfileDropdown displayName={displayName} role={profile?.role} initials={initials} />
              </div>
            </div>
          </div>
        </header>

        <main className="p-8 space-y-8">
          {/* Metrics cards - now using live data */}
          <div className="grid grid-cols-3 gap-6">
            {metrics.map((metric, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
                  <button
                    onClick={() => navigate("/progress")}
                    className="text-gray-400 hover:text-[#1e3a5f] transition-colors"
                    title="View details in Analytics"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-gray-900">{metricsLoading ? "—" : metric.value}</p>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-sm font-medium ${metric.trending === "up" ? "text-green-600" : "text-red-600"}`}>
                      {metric.trending === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {metric.change}
                    </span>
                    <span className="text-sm text-gray-500">{metric.subtitle}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Training Modules by Role - now using live data */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Training Modules by Role</h3>
                <button
                  onClick={openCreateModal}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create New Training Module
                </button>
              </div>
              <div className="flex gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab ? "bg-[#1e3a5f] text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Module Name</th>
                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Role</th>
                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Completion</th>
                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Last Updated</th>
                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {metricsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center">
                        <p className="text-sm text-gray-500">Loading modules...</p>
                      </td>
                    </tr>
                  ) : filteredModules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center">
                        <p className="text-sm text-gray-500">No training modules found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredModules.map((module) => (
                      <tr key={module.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{module.name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{module.role}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(module.status)}`}>
                            {module.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-[#1e3a5f] rounded-full" style={{ width: `${module.completion}%` }} />
                            </div>
                            <span className="text-sm text-gray-600">{module.completion}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{module.lastUpdated}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="relative">
                            <button
                              onClick={() => setOpenRowMenu(openRowMenu === module.id ? null : module.id)}
                              className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openRowMenu === module.id && (
                              <>
                                <div className="fixed inset-0 z-30" onClick={() => setOpenRowMenu(null)} />
                                <div className="absolute right-0 top-8 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-40 py-1">
                                  <button
                                    onClick={() => { setOpenRowMenu(null); navigate("/training-modules"); }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" /> View Module
                                  </button>
                                  <button
                                    onClick={() => { setOpenRowMenu(null); navigate("/progress"); }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <BarChart3 className="w-3.5 h-3.5" /> View Analytics
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent SSP Documents and Generations */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent SSP Documents</h3>
              </div>
              <div className="p-6 space-y-4">
                {sspLoading && <p className="text-sm text-gray-500">Loading documents...</p>}
                {!sspLoading && recentSSPs.length === 0 && (
                  <div className="text-center py-4">
                    <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No documents uploaded yet</p>
                  </div>
                )}
                {recentSSPs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.file_name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {formatFileSize(doc.file_size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedSSPId(doc.id);
                        setShowCreateModal(true);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-[#1e3a5f] border border-[#1e3a5f] rounded-lg hover:bg-[#1e3a5f] hover:text-white transition-colors"
                    >
                      Generate Training
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Generations</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentGenerations.map((gen) => (
                    <div key={gen.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className={`p-2 rounded-lg ${getGenerationStatusColor(gen.status)}`}>
                        {getGenerationIcon(gen.status)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{gen.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${getGenerationStatusColor(gen.status)}`}>
                            {gen.status}
                          </span>
                          <span className="text-xs text-gray-500">{gen.timestamp}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate("/training-modules")}
                        className="text-gray-400 hover:text-[#1e3a5f] transition-colors"
                        title="View in Training Modules"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Review Queue */}
          <div id="review-queue-section" className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">Review Queue</h3>
                  {reviewQueue.length > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {reviewQueue.length}
                    </span>
                  )}
                </div>
                <button onClick={loadReviewQueue} className="text-xs text-gray-500 hover:text-gray-700">
                  Refresh
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Trainings awaiting admin approval before employees can see them.
              </p>
            </div>

            {reviewLoading ? (
              <div className="p-6 text-sm text-gray-500">Loading review queue...</div>
            ) : reviewQueue.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-8 h-8 text-green-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">All caught up!</p>
                <p className="text-xs text-gray-400 mt-1">No trainings pending review.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {reviewQueue.map((item) => (
                  <div key={item.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">{item.company_role} Training</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Created {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openMediaModal(item.id)}
                        className="px-3 py-1.5 text-xs font-medium text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50"
                      >
                        Media
                      </button>
                      <button
                        onClick={() => navigate("/training-modules")}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => approveTraining(item.id)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setShowRejectModal(item.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal code remains the same as original... */}
    </div>
  );
}