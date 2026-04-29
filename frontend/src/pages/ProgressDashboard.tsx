import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, BookOpen, FileText, Users,
    BarChart3, Settings, Shield, LogOut,
    CheckCircle, XCircle, Clock, TrendingUp,
    Search, ChevronDown, ChevronUp, Loader2, Award, Download,
} from 'lucide-react';
import { logActivity } from '../lib/activityLog';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
}

interface Evidence {
    user_id: string;
    training_id: number;
    company_role: string;
    score: number;
    passed: boolean;
    completed_at: string;
    training_name?: string | null;
    retakes?: number;
    retake_count?: number;
    minRequired?: number | null;
}

interface Assignment {
    user_id: string;
    training_id: number;
    min_score?: number | null;
}

interface EmployeeProgress {
    employee: Employee;
    assigned: number;
    completed: number;
    passed: number;
    avgScore: number | null;
    completionRate: number;
    evidence: Evidence[];
    totalRetakes: number;
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar() {
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard',           href: '/dashboard' },
        { icon: BookOpen,        label: 'Training Modules',    href: '/training-modules' },
        { icon: FileText,        label: 'SSP Documents',       href: '/ssp-documents' },
        { icon: Users,           label: 'Roles & Assessments', href: '/roles' },
        { icon: BarChart3,       label: 'Analytics',           href: '/progress' },
        { icon: Settings,        label: 'Settings',            href: '/settings' },
    ];
    return (
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
                        <button key={item.label} onClick={() => navigate(item.href)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    item.href === '/progress' ? 'bg-[#1e3a5f] text-white' : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />{item.label}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
                <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors mb-4">
                    <LogOut className="w-5 h-5" />Sign Out
                </button>
                <div className="text-xs text-gray-500"><p className="mb-1">© 2026 MARi</p><p>FedRAMP Compliant</p></div>
            </div>
        </aside>
    );
}

// ─── Employee Row ─────────────────────────────────────────────────────────────

function EmpRow({ ep }: { ep: EmployeeProgress }) {
    const [open, setOpen] = useState(false);
    const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <>
            <tr className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setOpen(o => !o)}>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {ep.employee.first_name[0]}{ep.employee.last_name[0]}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">{ep.employee.first_name} {ep.employee.last_name}</p>
                            <p className="text-xs text-gray-500 capitalize">{ep.employee.role}</p>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">{ep.assigned}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{ep.completed}</td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${ep.completionRate >= 80 ? 'bg-green-500' : ep.completionRate >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                                 style={{ width: `${ep.completionRate}%` }} />
                        </div>
                        <span className="text-sm text-gray-700">{ep.completionRate}%</span>
                    </div>
                </td>
                <td className="px-6 py-4">
                    {ep.totalRetakes > 0
                        ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{ep.totalRetakes}x</span>
                        : <span className="text-xs text-gray-400">—</span>}
                </td>
                <td className="px-6 py-4">
                    {ep.avgScore !== null
                        ? <span className={`text-sm font-semibold ${ep.avgScore >= 70 ? 'text-green-600' : 'text-red-500'}`}>{ep.avgScore}/100</span>
                        : <span className="text-sm text-gray-400">—</span>}
                </td>
                <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        ep.completionRate === 100 ? 'bg-green-100 text-green-700'
                            : ep.completed > 0 ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-600'
                    }`}>
                        {ep.completionRate === 100
                            ? <><Award className="w-3 h-3" /> Complete</>
                            : ep.completed > 0 ? <><Clock className="w-3 h-3" /> In Progress</>
                                : <><Clock className="w-3 h-3" /> Not Started</>}
                    </span>
                </td>
                <td className="px-6 py-4 text-gray-400">
                    {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </td>
            </tr>
            {open && (
                <tr>
                    <td colSpan={8} className="px-6 pb-4 bg-gray-50 border-b border-gray-200">
                        {ep.evidence.length === 0 ? (
                            <p className="text-sm text-gray-500 py-3">No assessments completed yet.</p>
                        ) : (
                            <div className="pt-3 grid grid-cols-2 gap-2">
                                {ep.evidence.map((ev, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2.5">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-gray-900 capitalize">
                                                    {ev.training_name || `${ev.company_role} Training`}
                                                </p>
                                                {ev.retakes != null && ev.retakes > 0 && (
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                                                        {ev.retakes} retake{ev.retakes > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500">{formatDate(ev.completed_at)}</p>
                                            {ev.minRequired != null && (
                                                <p className="text-xs text-gray-400">Min required: {ev.minRequired}/100</p>
                                            )}
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ev.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {ev.passed ? <><CheckCircle className="w-3 h-3" />{ev.score}/100</> : <><XCircle className="w-3 h-3" />{ev.score}/100</>}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </td>
                </tr>
            )}
        </>
    );
}

// ─── CSV export ─────────────────────────────────────────────────────────────

function csvEscape(val: string | number | boolean): string {
    const s = String(val);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function downloadProgressCsv(rows: EmployeeProgress[], orgLabel: string) {
    const lines: string[] = [];
    lines.push(
        ['Employee', 'Role', 'Assigned', 'Completed', 'CompletionPct', 'AvgScore', 'Status'].map(csvEscape).join(','),
    );
    for (const ep of rows) {
        const status =
            ep.completionRate === 100 ? 'Complete' : ep.completed > 0 ? 'In Progress' : 'Not Started';
        lines.push(
            [
                `${ep.employee.first_name} ${ep.employee.last_name}`,
                ep.employee.role,
                ep.assigned,
                ep.completed,
                ep.completionRate,
                ep.avgScore ?? '',
                status,
            ]
                .map(csvEscape)
                .join(','),
        );
    }
    lines.push('');
    lines.push('Evidence rows');
    lines.push(['Employee', 'TrainingId', 'CompanyRole', 'Score', 'Passed', 'CompletedAt'].map(csvEscape).join(','));
    for (const ep of rows) {
        const name = `${ep.employee.first_name} ${ep.employee.last_name}`;
        for (const ev of ep.evidence) {
            lines.push(
                [name, ev.training_id, ev.company_role, ev.score, ev.passed, ev.completed_at]
                    .map(csvEscape)
                    .join(','),
            );
        }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-progress-${orgLabel.slice(0, 20)}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProgressDashboardPage() {
    const { profile } = useAuth();
    const [progress, setProgress] = useState<EmployeeProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'completion' | 'score'>('name');

    useEffect(() => {
        if (!profile?.organization_id) return;
        void load();
    }, [profile]);

    const load = async () => {
        setLoading(true);
        const [{ data: empData }, { data: assignData }, { data: evData }] = await Promise.all([
            supabase.from('profiles').select('id, first_name, last_name, role').eq('organization_id', profile!.organization_id),
            supabase.from('assignments').select('user_id, training_id, min_score').eq('organization_id', profile!.organization_id),
            supabase.from('training_evidence').select('user_id, training_id, company_role, score, passed, completed_at, retake_count').eq('organization_id', profile!.organization_id),
        ]);

        // Fetch all org profiles including admins — an admin can be assigned trainings by another admin
        // so we include everyone in the org with no role filter and no self-exclusion
        const employees = (empData ?? []) as Employee[];
        const assignments = (assignData ?? []) as Assignment[];
        const rawEvidence = (evData ?? []) as Evidence[];

        // Fetch training names for all training_ids in evidence
        const allTrainingIds = [...new Set(rawEvidence.map(e => e.training_id).filter(Boolean))];
        let trainingNameMap: Record<number, string> = {};
        if (allTrainingIds.length > 0) {
            const { data: trainingData } = await supabase
                .from('trainings')
                .select('id, name, company_role')
                .in('id', allTrainingIds);
            if (trainingData) {
                trainingNameMap = Object.fromEntries(
                    trainingData.map(t => [t.id, t.name || ''])
                );
            }
        }

        // Attach training names to evidence
        const evidence = rawEvidence.map(e => ({
            ...e,
            training_name: trainingNameMap[e.training_id] || null,
        }));

        const result: EmployeeProgress[] = employees.map(emp => {
            const empAsgn = assignments.filter(a => a.user_id === emp.id);
            const assignedIds = new Set(empAsgn.map(a => a.training_id));

            // Only include evidence for currently assigned trainings
            const empEv = evidence.filter(e => e.user_id === emp.id && assignedIds.has(e.training_id));

            // Deduplicate: keep only latest attempt per training
            const latestByTraining: Record<number, Evidence> = {};
            empEv.forEach(e => {
                const existing = latestByTraining[e.training_id];
                if (!existing || new Date(e.completed_at) > new Date(existing.completed_at)) {
                    latestByTraining[e.training_id] = e;
                }
            });
            const deduped = Object.values(latestByTraining);

            // Use retake_count from DB (each row tracks its own retake count)
            const retakeCount: Record<number, number> = {};
            empEv.forEach(e => {
                retakeCount[e.training_id] = e.retake_count ?? 0;
            });

            const passed = deduped.filter(e => e.passed).length;
            const scores = deduped.map(e => e.score);
            const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
            // Only count as completed if score meets the min_score requirement
            const uniqueCompleted = empAsgn.filter(a => {
                const ev = latestByTraining[a.training_id];
                if (!ev) return false;
                const req = a.min_score ?? null;
                return req !== null ? ev.score >= req : ev.passed;
            }).length;
            const completionRate = empAsgn.length > 0
                ? Math.min(100, Math.round((uniqueCompleted / empAsgn.length) * 100))
                : 0;

            // Attach retake counts and minRequired to deduped evidence
            const evidenceWithRetakes = deduped.map(e => {
                const asgn = empAsgn.find(a => a.training_id === e.training_id);
                return { ...e, retakes: retakeCount[e.training_id] ?? 0, minRequired: asgn?.min_score ?? null };
            });

            const totalRetakes = Object.values(retakeCount).reduce((sum, c) => sum + c, 0);
            return { employee: emp, assigned: empAsgn.length, completed: uniqueCompleted, passed, avgScore, completionRate, evidence: evidenceWithRetakes, totalRetakes };
        });

        setProgress(result);
        setLoading(false);
    };

    const filtered = progress
        .filter(ep => {
            const name = `${ep.employee.first_name} ${ep.employee.last_name}`.toLowerCase();
            return name.includes(search.toLowerCase()) || ep.employee.role.toLowerCase().includes(search.toLowerCase());
        })
        .sort((a, b) => {
            if (sortBy === 'completion') return b.completionRate - a.completionRate;
            if (sortBy === 'score') return (b.avgScore ?? -1) - (a.avgScore ?? -1);
            return `${a.employee.first_name} ${a.employee.last_name}`.localeCompare(`${b.employee.first_name} ${b.employee.last_name}`);
        });

    // Org-level stats
    const totalEmp        = progress.length;
    const fullyComplete   = progress.filter(ep => ep.completionRate === 100).length;
    const orgAvgScore     = progress.filter(ep => ep.avgScore !== null).length > 0
        ? Math.round(progress.filter(ep => ep.avgScore !== null).reduce((s, ep) => s + (ep.avgScore ?? 0), 0) / progress.filter(ep => ep.avgScore !== null).length)
        : null;
    const overallCompletion = totalEmp > 0
        ? Math.round(progress.reduce((s, ep) => s + ep.completionRate, 0) / totalEmp)
        : 0;
    const totalCerts = progress.reduce((s, ep) => s + ep.passed, 0);

    // Role chart data
    const roleMap: Record<string, { total: number; sum: number }> = {};
    progress.forEach(ep => {
        const r = ep.employee.role || 'Other';
        if (!roleMap[r]) roleMap[r] = { total: 0, sum: 0 };
        roleMap[r].total++;
        roleMap[r].sum += ep.completionRate;
    });
    const chartData = Object.entries(roleMap).map(([role, { total, sum }]) => ({
        role: role.replace(/-/g, ' '),
        completion: Math.round(sum / total),
    }));

    return (
        <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            <Sidebar />
            <div className="ml-64">
                <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="px-8 py-4">
                        <h2 className="text-2xl font-semibold text-gray-900">Training Analytics</h2>
                        <p className="text-sm text-gray-600 mt-1">Company-wide training progress and performance</p>
                    </div>
                </header>

                <main className="p-8 space-y-6">
                    {/* Summary cards */}
                    <div className="grid grid-cols-4 gap-5">
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Employees</p>
                            <p className="text-3xl font-bold text-gray-900">{totalEmp}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Avg Completion</p>
                            <p className="text-3xl font-bold text-gray-900">{overallCompletion}%</p>
                            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#1e3a5f] rounded-full" style={{ width: `${overallCompletion}%` }} />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Org Avg Score</p>
                            <p className={`text-3xl font-bold ${orgAvgScore !== null && orgAvgScore >= 70 ? 'text-green-600' : 'text-gray-900'}`}>
                                {orgAvgScore !== null ? `${orgAvgScore}/100` : '—'}
                            </p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Certificates Issued</p>
                            <div className="flex items-center gap-2">
                                <Award className="w-6 h-6 text-amber-400" />
                                <p className="text-3xl font-bold text-gray-900">{totalCerts}</p>
                            </div>
                        </div>
                    </div>

                    {/* Completion by role chart */}
                    {chartData.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="w-4 h-4 text-[#1e3a5f]" />
                                <h3 className="text-base font-semibold text-gray-900">Completion Rate by Role</h3>
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="role" tick={{ fontSize: 12, fill: '#6b7280' }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                    <Tooltip formatter={(v) => [`${v}%`, 'Completion']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                    <Bar dataKey="completion" radius={[6, 6, 0, 0]}>
                                        {chartData.map((entry, i) => (
                                            <Cell key={i} fill={entry.completion >= 80 ? '#16a34a' : entry.completion >= 50 ? '#f59e0b' : '#ef4444'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Fully completed stats */}
                    <div className="grid grid-cols-3 gap-5">
                        <div className="bg-[#1e3a5f] rounded-xl p-5">
                            <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-1">Fully Completed</p>
                            <p className="text-3xl font-bold text-white">{fullyComplete}</p>
                            <p className="text-white/60 text-sm mt-1">of {totalEmp} employees</p>
                        </div>
                        <div className="bg-green-600 rounded-xl p-5">
                            <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-1">Completion Rate</p>
                            <p className="text-3xl font-bold text-white">{totalEmp > 0 ? Math.round((fullyComplete / totalEmp) * 100) : 0}%</p>
                            <p className="text-white/60 text-sm mt-1">employees all done</p>
                        </div>
                        <div className="bg-amber-500 rounded-xl p-5">
                            <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-1">Certificates Issued</p>
                            <p className="text-3xl font-bold text-white">{totalCerts}</p>
                            <p className="text-white/60 text-sm mt-1">total completions</p>
                        </div>
                    </div>

                    {/* Employee table */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <h3 className="text-base font-semibold text-gray-900">Employee Progress</h3>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{filtered.length}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap justify-end">
                                <button
                                    type="button"
                                    disabled={loading || filtered.length === 0}
                                    onClick={() => {
                                        const label = profile?.organization_id ?? 'export';
                                        downloadProgressCsv(filtered, label);
                                        logActivity('Exported analytics CSV', `${filtered.length} employees`);
                                    }}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Download className="w-4 h-4" />
                                    Export CSV
                                </button>
                                <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                                        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none">
                                    <option value="name">Sort: Name</option>
                                    <option value="completion">Sort: Completion</option>
                                    <option value="score">Sort: Score</option>
                                </select>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                                           className="pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none w-48" />
                                </div>
                            </div>
                        </div>
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Employee</th>
                                <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Assigned</th>
                                <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Completed</th>
                                <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Completion</th>
                                <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Retakes</th>
                                <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Avg Score</th>
                                <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Status</th>
                                <th className="w-8 px-6 py-3" />
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                            {loading && (
                                <tr><td colSpan={8} className="px-6 py-12 text-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">Loading data...</p>
                                </td></tr>
                            )}
                            {!loading && filtered.length === 0 && (
                                <tr><td colSpan={8} className="px-6 py-12 text-center">
                                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500">No employees found</p>
                                </td></tr>
                            )}
                            {!loading && filtered.map(ep => <EmpRow key={ep.employee.id} ep={ep} />)}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
}