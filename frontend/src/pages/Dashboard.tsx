import { useEffect, useState, useRef } from "react";
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
} from "lucide-react";
// import {
//     BarChart,
//     Bar,
//     XAxis,
//     YAxis,
//     CartesianGrid,
//     Tooltip,
//     ResponsiveContainer,
// } from "recharts";
import { toast } from "sonner";
import { ProfileDropdown } from "../components/ProfileDropdown";

const navItems = [
    { icon: LayoutDashboard, label: "Dashboard",           href: "/dashboard",        active: true  },
    { icon: BookOpen,        label: "Training Modules",    href: "/training-modules", active: false },
    { icon: FileText,        label: "SSP Documents",       href: "/ssp-documents",    active: false },
    { icon: Users,           label: "Roles & Assessments", href: "/roles",            active: false },
    { icon: BarChart3,       label: "Analytics",           href: "/progress",         active: false },
    { icon: Settings,        label: "Settings",            href: "/settings",         active: false },
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

    const [activeTab, setActiveTab] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const tabs = ["All", "Developers", "Security Leads", "Team Leads", "Other"];

    const [metrics, setMetrics] = useState<Metric[]>([
        { title: "Active Training Modules", value: "—", change: "", trending: "up", subtitle: "" },
        { title: "Employees Enrolled",      value: "—", change: "", trending: "up", subtitle: "" },
        { title: "Completion Rate",         value: "—", change: "", trending: "up", subtitle: "" },
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
    const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
    const mediaFileRef = useRef<HTMLInputElement>(null);

    function normalizeRole(role: string): "developers" | "security_leads" | "team_leads" | "other" {
        const value = role.toLowerCase().replace(/[-_]/g, " ").trim();
        if (value.includes("developer")) return "developers";
        if (value.includes("security lead")) return "security_leads";
        if (value.includes("team lead")) return "team_leads";
        return "other";
    }

    const filteredModules = trainingModules.filter((module) => {
        const roleGroup = normalizeRole(module.role);
        const matchesTab =
            activeTab === "All" ||
            (activeTab === "Developers"    && roleGroup === "developers") ||
            (activeTab === "Security Leads" && roleGroup === "security_leads") ||
            (activeTab === "Team Leads"    && roleGroup === "team_leads") ||
            (activeTab === "Other"         && roleGroup === "other");
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            !query ||
            module.name.toLowerCase().includes(query) ||
            module.role.toLowerCase().includes(query) ||
            module.status.toLowerCase().includes(query);
        return matchesTab && matchesSearch;
    });

    // ── Load live metrics ────────────────────────────────────────────────────────
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
                    supabase.from("trainings").select("id, name, company_role, status, created_at").eq("company_id", profile.organization_id),
                    supabase.from("profiles").select("id").eq("organization_id", profile.organization_id).neq("id", user!.id),
                    supabase.from("assignments").select("user_id, training_id").eq("organization_id", profile.organization_id),
                    supabase.from("training_evidence").select("user_id, training_id, score, passed").eq("organization_id", profile.organization_id),
                ]);

                const activeModules = trainingsData?.filter(t => t.status === "published").length ?? 0;
                const employeesEnrolled = profilesData?.length ?? 0;
                const uniqueCompletions = new Set<string>();
                evidenceData?.forEach(ev => uniqueCompletions.add(`${ev.user_id}-${ev.training_id}`));
                const totalAssignments = assignmentsData?.length ?? 1;
                const completionRate = totalAssignments > 0 ? Math.round((uniqueCompletions.size / totalAssignments) * 100) : 0;

                setMetrics([
                    { title: "Active Training Modules", value: String(activeModules),   change: "+0%", trending: "up", subtitle: "published trainings" },
                    { title: "Employees Enrolled",      value: String(employeesEnrolled), change: "+0%", trending: "up", subtitle: "in organization" },
                    { title: "Completion Rate",         value: `${completionRate}%`,   change: "+0%", trending: "up", subtitle: "target: 90%" },
                ]);

                const modules = trainingsData?.map(t => ({
                    id: t.id,
                    name: t.name || `${t.company_role} Training`,
                    role: t.company_role,
                    status: t.status === "published" ? "Published" : t.status === "in_review" ? "In Review" : "Draft",
                    completion: Math.floor(Math.random() * 100),
                    lastUpdated: new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                })) ?? [];
                setTrainingModules(modules);

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

    // ── Load review queue ────────────────────────────────────────────────────────
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

    // ── Modal actions ────────────────────────────────────────────────────────────
    const openCreateModal = async () => {
        setShowCreateModal(true);
        const { data } = await supabase
            .from("ssp_documents")
            .select("id, file_name, file_path, file_size, created_at, extracted_text")
            .eq("user_id", user!.id)
            .order("created_at", { ascending: false });
        setAllSSPs((data ?? []) as SSPDocRow[]);
    };

    const handleCreateTraining = async () => {
        if (!newRole.trim())             { toast.error("Please enter a role.");              return; }
        if (!selectedSSPId)              { toast.error("Please select an SSP document.");    return; }
        if (!profile?.organization_id)   { toast.error("No organization id found.");         return; }

        setIsCreating(true);
        setElapsedSeconds(0);
        elapsedRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);

        try {
            setCreationStep(1);
            const selectedDoc = allSSPs.find(s => s.id === selectedSSPId);
            if (!selectedDoc) throw new Error("Selected SSP not found.");

            let sspFileBlob: File;
            if (selectedDoc.extracted_text?.trim()) {
                sspFileBlob = new File(
                    [selectedDoc.extracted_text],
                    `${selectedDoc.file_name.replace(/\.pdf$/i, "") || "ssp"}-extracted.txt`,
                    { type: "text/plain" },
                );
            } else {
                const { data: fileData, error: fileError } = await supabase.storage.from("ssp-documents").download(selectedDoc.file_path);
                if (fileError) throw new Error("Failed to download SSP: " + fileError.message);
                const isPdf = selectedDoc.file_name.toLowerCase().endsWith(".pdf") || fileData.type === "application/pdf";
                if (isPdf) throw new Error("This SSP is missing extracted text. Please re-upload it from SSP Documents so text can be extracted.");
                const textContent = await fileData.text();
                if (!textContent.trim()) throw new Error("Selected SSP file has no readable text content.");
                sspFileBlob = new File([textContent], selectedDoc.file_name, { type: "text/plain" });
            }

            const formData = new FormData();
            formData.append("role", newRole.trim());
            formData.append("company_id", profile.organization_id);
            formData.append("ssp_file", sspFileBlob);

            setCreationStep(2);
            const response = await fetch("http://127.0.0.1:8000/api/trainings/create", { method: "POST", body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.detail || "Failed to create training.");

            setCreationStep(3);
            await new Promise(r => setTimeout(r, 600));

            const createdId = data?.result?.training_row?.id ?? null;
            setLastCreatedId(createdId);
            if (createdId && newTrainingName.trim()) {
                await supabase.from("trainings").update({ name: newTrainingName.trim() }).eq("id", createdId);
            }

            setShowCreateModal(false);
            setNewRole(""); setNewTrainingName(""); setSelectedSSPId("");
            setCreationStep(0); setSuccessStep('draft');
            setShowSuccessRejectInput(false); setSuccessRejectReason('');
            setShowSuccessModal(true);
        } catch (err) {
            setCreationStep(0);
            toast.error(err instanceof Error ? err.message : "Unexpected error.");
        } finally {
            setIsCreating(false);
            if (elapsedRef.current) clearInterval(elapsedRef.current);
            elapsedRef.current = null;
        }

    const submitForReview = async (trainingId: number) => {
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/trainings/${trainingId}/submit-review`, { method: "POST" });
            if (!res.ok) throw new Error("Failed to submit for review");
            toast.success("Training submitted for review.");
            loadReviewQueue();
        } catch { toast.error("Failed to submit for review."); }
    };

    const approveTraining = async (trainingId: number) => {
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/trainings/${trainingId}/approve?user_id=${user?.id}`, { method: "POST" });
            if (!res.ok) throw new Error("Failed to approve");
            toast.success("Training approved and published.");
            setReviewQueue(q => q.filter(r => r.id !== trainingId));
        } catch { toast.error("Failed to approve training."); }
    };

    const rejectTraining = async (trainingId: number) => {
        try {
            const res = await fetch(
                `http://127.0.0.1:8000/api/trainings/${trainingId}/reject?user_id=${user?.id}`,
                { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rejection_reason: rejectReason || null }) },
            );
            if (!res.ok) throw new Error("Failed to reject");
            toast.success("Training rejected.");
            setReviewQueue(q => q.filter(r => r.id !== trainingId));
            setShowRejectModal(null); setRejectReason("");
        } catch { toast.error("Failed to reject training."); }
    };

    const openMediaModal = async (trainingId: number) => {
        setShowMediaModal(trainingId); setMediaImages([]);
        try {
            const { data } = await supabase.from("trainings").select("training_json").eq("id", trainingId).single();
            if (data?.training_json) {
                const parsed = typeof data.training_json === "string"
                    ? JSON.parse(data.training_json.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim())
                    : data.training_json;
                const content = Array.isArray(parsed) ? parsed[0] : parsed;
                const imgs = content?.media?.images || [];
                setMediaImages(imgs.map((img: { id: string; url: string; caption?: string }) => ({ id: img.id, url: img.url, caption: img.caption || "" })));
            }
        } catch { /* ignore */ }
    };

    const uploadMedia = async (file: File) => {
        if (!showMediaModal) return;
        setMediaUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("caption", file.name.replace(/\.[^.]+$/, ""));
            formData.append("section_ref", "General");
            const res = await fetch(`http://127.0.0.1:8000/api/trainings/${showMediaModal}/media`, { method: "POST", body: formData });
            const data = await res.json();
            if (res.ok && data.url) {
                setMediaImages(prev => [...prev, { id: data.media_id, url: data.url, caption: file.name }]);
                toast.success("Image uploaded.");
            } else { toast.error(data?.detail || "Upload failed."); }
        } catch { toast.error("Upload failed."); }
        finally { setMediaUploading(false); }
    };

    const deleteMedia = async (mediaId: string) => {
        if (!showMediaModal) return;
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/trainings/${showMediaModal}/media/${mediaId}`, { method: "DELETE" });
            if (res.ok) { setMediaImages(prev => prev.filter(m => m.id !== mediaId)); toast.success("Image removed."); }
        } catch { toast.error("Failed to remove image."); }
    };

    const displayName = profile ? `${profile.first_name} ${profile.last_name}` : (user?.email ?? "User");
    const initials    = profile ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase() : "?";

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Published": return "bg-green-100 text-green-700 border-green-200";
            case "In Review":  return "bg-yellow-100 text-yellow-700 border-yellow-200";
            default:           return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    const getGenerationStatusColor = (status: string) => {
        switch (status) {
            case "Succeeded":   return "bg-green-100 text-green-700";
            case "Needs Review": return "bg-yellow-100 text-yellow-700";
            case "Failed":       return "bg-red-100 text-red-700";
            default:             return "bg-gray-100 text-gray-700";
        }
    };

    const getGenerationIcon = (status: string) => {
        switch (status) {
            case "Succeeded":   return <CheckCircle className="w-4 h-4" />;
            case "Needs Review": return <AlertTriangle className="w-4 h-4" />;
            case "Failed":       return <AlertTriangle className="w-4 h-4" />;
            default:             return <Clock className="w-4 h-4" />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

            {/* ── Sidebar ── */}
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
                                    if (["/training-modules", "/ssp-documents", "/roles", "/settings", "/progress"].includes(item.href)) {
                                        navigate(item.href); return;
                                    }
                                    if (!item.active) alert(`${item.label} page coming soon!`);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    item.active ? "bg-[#1e3a5f] text-white" : "text-gray-700 hover:bg-gray-100"
                                }`}
                            >
                              View Review Queue
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
                    <button
                        onClick={signOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors mb-4"
                    >
                        <LogOut className="w-5 h-5" /> Sign Out
                    </button>
                    <div className="text-xs text-gray-500">
                        <p className="mb-1">© 2026 MARi</p>
                        <p>FedRAMP Compliant</p>
                    </div>
                </div>
            </aside>

            <div className="ml-64">

                {/* ── Header ── */}
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
                                                    <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
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
                                                            onClick={() => { setShowNotifications(false); document.getElementById("review-queue-section")?.scrollIntoView({ behavior: "smooth" }); }}
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

                    {/* ── Metrics ── */}
                    <div className="grid grid-cols-3 gap-6">
                        {metrics.map((metric, index) => (
                            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
                                    <button onClick={() => navigate("/progress")} className="text-gray-400 hover:text-[#1e3a5f] transition-colors" title="View details in Analytics">
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

                    {/* ── Training Modules table ── */}
                    <div className="bg-white rounded-xl border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Training Modules by Role</h3>
                                <button
                                    onClick={openCreateModal}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#152d4a] transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Create New Training Module
                                </button>
                            </div>
                            <div className="flex gap-2">
                                {tabs.map(tab => (
                                    <button
                                        key={tab} onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? "bg-[#1e3a5f] text-white" : "text-gray-600 hover:bg-gray-100"}`}
                                    >{tab}</button>
                                ))}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {["Module Name", "Role", "Status", "Completion", "Last Updated", "Actions"].map(h => (
                                        <th key={h} className="text-left text-xs font-medium text-gray-600 px-6 py-3">{h}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                {metricsLoading ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center"><p className="text-sm text-gray-500">Loading modules...</p></td></tr>
                                ) : filteredModules.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center"><p className="text-sm text-gray-500">No training modules found</p></td></tr>
                                ) : (
                                    filteredModules.map(module => (
                                        <tr key={module.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4"><p className="text-sm font-medium text-gray-900">{module.name}</p></td>
                                            <td className="px-6 py-4"><span className="text-sm text-gray-600">{module.role}</span></td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(module.status)}`}>{module.status}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-[#1e3a5f] rounded-full" style={{ width: `${module.completion}%` }} />
                                                    </div>
                                                    <span className="text-sm text-gray-600">{module.completion}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><span className="text-sm text-gray-600">{module.lastUpdated}</span></td>
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
                                                                <button onClick={() => { setOpenRowMenu(null); navigate("/training-modules"); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                                    <ExternalLink className="w-3.5 h-3.5" /> View Module
                                                                </button>
                                                                <button onClick={() => { setOpenRowMenu(null); navigate("/progress"); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
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

                    {/* ── Recent SSPs + Recent Generations ── */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl border border-gray-200">
                            <div className="p-6 border-b border-gray-200"><h3 className="text-lg font-semibold text-gray-900">Recent SSP Documents</h3></div>
                            <div className="p-6 space-y-4">
                                {sspLoading && <p className="text-sm text-gray-500">Loading documents...</p>}
                                {!sspLoading && recentSSPs.length === 0 && (
                                    <div className="text-center py-4">
                                        <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">No documents uploaded yet</p>
                                    </div>
                                )}
                                {recentSSPs.map(doc => (
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
                                            onClick={() => { setSelectedSSPId(doc.id); setShowCreateModal(true); }}
                                            className="px-3 py-1.5 text-xs font-medium text-[#1e3a5f] border border-[#1e3a5f] rounded-lg hover:bg-[#1e3a5f] hover:text-white transition-colors"
                                        >
                                            Generate Training
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200">
                            <div className="p-6 border-b border-gray-200"><h3 className="text-lg font-semibold text-gray-900">Recent Generations</h3></div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    {recentGenerations.map(gen => (
                                        <div key={gen.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                                            <div className={`p-2 rounded-lg ${getGenerationStatusColor(gen.status)}`}>{getGenerationIcon(gen.status)}</div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">{gen.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${getGenerationStatusColor(gen.status)}`}>{gen.status}</span>
                                                    <span className="text-xs text-gray-500">{gen.timestamp}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => navigate("/training-modules")} className="text-gray-400 hover:text-[#1e3a5f] transition-colors" title="View in Training Modules">
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Review Queue ── */}
                    <div id="review-queue-section" className="bg-white rounded-xl border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold text-gray-900">Review Queue</h3>
                                    {reviewQueue.length > 0 && (
                                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{reviewQueue.length}</span>
                                    )}
                                </div>
                                <button onClick={loadReviewQueue} className="text-xs text-gray-500 hover:text-gray-700">Refresh</button>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Trainings awaiting admin approval before employees can see them.</p>
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
                                {reviewQueue.map(item => (
                                    <div key={item.id} className="px-6 py-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 capitalize">{item.company_role} Training</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Created {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openMediaModal(item.id)} className="px-3 py-1.5 text-xs font-medium text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50">Media</button>
                                            <button onClick={() => navigate("/training-modules")} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Preview</button>
                                            <button onClick={() => approveTraining(item.id)} className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">Approve</button>
                                            <button onClick={() => setShowRejectModal(item.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50">Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </main>
            </div>

            {/* ── Create Training Modal ── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Training Module</h3>

                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Training Name <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                            type="text" value={newTrainingName} onChange={e => setNewTrainingName(e.target.value)}
                            placeholder="e.g. Developer FedRAMP Onboarding"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm focus:outline-none focus:border-[#1e3a5f]"
                        />

                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm">
                            <option value="">Select a role...</option>
                            {orgRoles.map(role => (
                                <option key={role} value={role.toLowerCase().replace(/\s+/g, '-')}>{role}</option>
                            ))}
                        </select>

                        <label className="block text-sm font-medium text-gray-700 mb-1">SSP Document</label>
                        {allSSPs.length === 0 ? (
                            <p className="text-sm text-gray-500 mb-4">
                                No SSP documents found.{" "}
                                <button onClick={() => { setShowCreateModal(false); navigate("/ssp-documents"); }} className="text-[#1e3a5f] underline">Upload one first.</button>
                            </p>
                        ) : (
                            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                                {allSSPs.map(doc => (
                                    <div
                                        key={doc.id} onClick={() => setSelectedSSPId(doc.id)}
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedSSPId === doc.id ? "border-[#1e3a5f] bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
                                    >
                                        <FileText className={`w-4 h-4 flex-shrink-0 ${selectedSSPId === doc.id ? "text-[#1e3a5f]" : "text-gray-400"}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                                            <p className="text-xs text-gray-500">{formatFileSize(doc.file_size)}</p>
                                        </div>
                                        {selectedSSPId === doc.id && (
                                            <div className="w-4 h-4 rounded-full bg-[#1e3a5f] flex items-center justify-center flex-shrink-0">
                                                <div className="w-2 h-2 rounded-full bg-white" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {isCreating && (
                            <div className="mb-4">
                                <div className="flex justify-between text-xs mb-2">
                                    {[{ step: 1, label: "Prepare SSP" }, { step: 2, label: "Generate Training" }, { step: 3, label: "Save" }].map(({ step, label }) => {
                                        const isDone = creationStep > step;
                                        const isActive = creationStep === step;
                                        return (
                                            <span key={step} className={`font-medium transition-colors duration-300 ${isDone ? "text-green-600" : isActive ? "text-[#1e3a5f]" : "text-gray-400"}`}>
                        {isDone ? <span className="inline-flex items-center gap-1"><CheckCircle className="w-3 h-3 inline" /> {label}</span>
                            : isActive ? <span className="inline-flex items-center gap-1"><span className="w-3 h-3 inline-block border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />{label}</span>
                                : label}
                      </span>
                                        );
                                    })}
                                </div>
                                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                    {creationStep === 2 ? (
                                        <div className="h-full rounded-full bg-[#1e3a5f] animate-pulse" style={{ width: `${Math.min(90, 30 + elapsedSeconds * 0.5)}%`, transition: "width 1s ease-out" }} />
                                    ) : (
                                        <div className="h-full bg-[#1e3a5f] rounded-full transition-all duration-700 ease-out" style={{ width: creationStep === 1 ? "20%" : creationStep === 3 ? "100%" : "5%" }} />
                                    )}
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <p className="text-xs text-gray-500">
                                        {creationStep === 1 && "Reading SSP document..."}
                                        {creationStep === 2 && "AI is generating training content — this may take 1-2 minutes..."}
                                        {creationStep === 3 && "Saving to database..."}
                                    </p>
                                    <p className="text-xs font-mono text-gray-400">{Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700" disabled={isCreating}>Cancel</button>
                            <button onClick={handleCreateTraining} className="px-4 py-2 rounded-lg bg-[#1e3a5f] text-white disabled:opacity-60" disabled={isCreating}>
                                {isCreating ? "Creating..." : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Success Modal ── */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-6 shadow-xl">
                        <div className="flex items-center justify-center gap-2 mb-5">
                            {(['draft', 'in_review', 'published'] as const).map((step, i) => {
                                const labels = ['Draft', 'In Review', 'Published'];
                                const stepOrder = { draft: 0, in_review: 1, published: 2, rejected: -1 };
                                const current = stepOrder[successStep];
                                const isDone = current > i;
                                const isActive = current === i;
                                return (
                                    <div key={step} className="flex items-center gap-2">
                                        {i > 0 && <div className={`w-8 h-0.5 ${isDone || isActive ? 'bg-[#1e3a5f]' : 'bg-gray-200'}`} />}
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-[#1e3a5f] text-white' : 'bg-gray-200 text-gray-500'}`}>
                                            {isDone ? <CheckCircle className="w-4 h-4" /> : i + 1}
                                        </div>
                                        <span className={`text-xs font-medium ${isDone ? 'text-green-600' : isActive ? 'text-[#1e3a5f]' : 'text-gray-400'}`}>{labels[i]}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {successStep === 'draft' && (
                            <div className="text-center">
                                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3"><FileText className="w-7 h-7 text-[#1e3a5f]" /></div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">Training Created!</h3>
                                <p className="text-sm text-gray-500 mb-5">Your training module has been saved as a <strong>Draft</strong>. Submit it for review or approve it directly.</p>
                                <div className="flex flex-col gap-2">
                                    {lastCreatedId && (
                                        <button
                                            onClick={async () => { setSuccessLoading(true); await submitForReview(lastCreatedId); setSuccessStep('in_review'); setSuccessLoading(false); }}
                                            disabled={successLoading}
                                            className="w-full px-4 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                        >
                                            {successLoading ? <Clock className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />} Submit for Review
                                        </button>
                                    )}
                                    <button onClick={() => { setShowSuccessModal(false); navigate("/training-modules"); }} className="w-full px-4 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#152d4a] transition-colors">View Training Modules</button>
                                    <button onClick={() => setShowSuccessModal(false)} className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Keep as Draft</button>
                                </div>
                            </div>
                        )}

                        {successStep === 'in_review' && (
                            <div className="text-center">
                                <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3"><Clock className="w-7 h-7 text-amber-600" /></div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">Ready for Review</h3>
                                <p className="text-sm text-gray-500 mb-5">Training is now <strong>In Review</strong>. Approve to publish it to employees, or reject it.</p>
                                <div className="flex flex-col gap-2">
                                    {lastCreatedId && (
                                        <>
                                            <button
                                                onClick={async () => { setSuccessLoading(true); await approveTraining(lastCreatedId); setSuccessStep('published'); setSuccessLoading(false); }}
                                                disabled={successLoading}
                                                className="w-full px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                            >
                                                {successLoading ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Approve &amp; Publish
                                            </button>
                                            {!showSuccessRejectInput ? (
                                                <button onClick={() => setShowSuccessRejectInput(true)} disabled={successLoading} className="w-full px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                                                    <X className="w-4 h-4" /> Reject
                                                </button>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <input type="text" value={successRejectReason} onChange={e => setSuccessRejectReason(e.target.value)} placeholder="Reason (optional)" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-red-400" />
                                                    <button
                                                        onClick={async () => { setSuccessLoading(true); await rejectTraining(lastCreatedId); setSuccessStep('rejected'); setSuccessLoading(false); }}
                                                        disabled={successLoading}
                                                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                                                    >Confirm</button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <button onClick={() => { setShowSuccessModal(false); navigate("/training-modules"); }} className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">View Training Modules</button>
                                </div>
                            </div>
                        )}

                        {successStep === 'published' && (
                            <div className="text-center">
                                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3"><CheckCircle className="w-7 h-7 text-green-600" /></div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">Training Published!</h3>
                                <p className="text-sm text-gray-500 mb-5">This training is now <strong>live</strong> and visible to employees.</p>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => { setShowSuccessModal(false); navigate("/training-modules"); }} className="w-full px-4 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#152d4a] transition-colors">View Training Modules</button>
                                    <button onClick={() => setShowSuccessModal(false)} className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Close</button>
                                </div>
                            </div>
                        )}

                        {successStep === 'rejected' && (
                            <div className="text-center">
                                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><X className="w-7 h-7 text-red-600" /></div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">Training Rejected</h3>
                                <p className="text-sm text-gray-500 mb-5">This training has been rejected and will not be published.</p>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => { setShowSuccessModal(false); navigate("/training-modules"); }} className="w-full px-4 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#152d4a] transition-colors">View Training Modules</button>
                                    <button onClick={() => setShowSuccessModal(false)} className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Close</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Reject Reason Modal ── */}
            {showRejectModal !== null && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Reject Training</h3>
                        <p className="text-sm text-gray-500 mb-4">Optionally provide a reason for rejection.</p>
                        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-red-400" placeholder="Reason (optional)..." />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => { setShowRejectModal(null); setRejectReason(""); }} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm">Cancel</button>
                            <button onClick={() => rejectTraining(showRejectModal)} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700">Reject</button>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

            {/* ── Media Management Modal ── */}
            {showMediaModal !== null && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-white rounded-xl border border-gray-200 p-6 shadow-xl max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Manage Media</h3>
                            <button onClick={() => setShowMediaModal(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Upload custom images or remove AI-generated ones for training #{showMediaModal}.</p>
                        <div className="flex-1 overflow-y-auto mb-4">
                            {mediaImages.length === 0 ? (
                                <div className="text-center py-8">
                                    <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">No images yet</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {mediaImages.map(img => (
                                        <div key={img.id} className="relative group rounded-lg border border-gray-200 overflow-hidden">
                                            <img src={img.url} alt={img.caption} className="w-full h-32 object-cover"
                                                 onError={e => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='128' fill='%23f3f4f6'%3E%3Crect width='200' height='128'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='12'%3EImage%3C/text%3E%3C/svg%3E"; }}
                                            />
                                            <button onClick={() => deleteMedia(img.id)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" title="Remove image">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                            {img.caption && <p className="text-xs text-gray-500 p-1.5 truncate">{img.caption}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="border-t border-gray-200 pt-4">
                            <input ref={mediaFileRef} type="file" accept="image/*" className="hidden"
                                   onChange={e => { const file = e.target.files?.[0]; if (file) uploadMedia(file); e.target.value = ""; }}
                            />
                            <button onClick={() => mediaFileRef.current?.click()} disabled={mediaUploading}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-[#1e3a5f] hover:text-[#1e3a5f] transition-colors disabled:opacity-50"
                            >
                                <Upload className="w-4 h-4" /> {mediaUploading ? "Uploading..." : "Upload Image"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}