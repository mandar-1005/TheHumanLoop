import { useEffect, useState } from 'react';
import {
    LayoutDashboard, BookOpen, FileText, Users,
    BarChart3, Settings, Shield, LogOut,
    Search, ChevronDown, CheckCircle, X,
    Loader2, AlertCircle, UserCog, BookMarked
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    organization_id: string;
}

interface Training {
    id: number;
    company_role: string;
    created_at: string;
}

interface Assignment {
    user_id: string;
    training_id: number;
}

const JOB_ROLES = [
    'developer',
    'security-lead',
    'team-lead',
    'compliance-officer',
    'employee',
];

// ─── Sidebar ────────────────────────────────────────────────────────────────

function Sidebar() {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
        { icon: BookOpen, label: 'Training Modules', href: '/training-modules' },
        { icon: FileText, label: 'SSP Documents', href: '/ssp-documents' },
        { icon: Users, label: 'Roles & Assessments', href: '/roles' },
        { icon: BarChart3, label: 'Analytics', href: null },
        { icon: Settings, label: 'Settings', href: null },
    ];

    const current = '/roles';

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
                        <button
                            key={item.label}
                            onClick={() => item.href ? navigate(item.href) : alert(`${item.label} coming soon!`)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                item.href === current
                                    ? 'bg-[#1e3a5f] text-white'
                                    : 'text-gray-700 hover:bg-gray-100'
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
    );
}

// ─── Assign Assessment Modal ─────────────────────────────────────────────────

function AssignModal({
                         employee,
                         trainings,
                         existingAssignments,
                         onClose,
                         onSaved,
                     }: {
    employee: Employee;
    trainings: Training[];
    existingAssignments: number[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const { user } = useAuth();
    const [selected, setSelected] = useState<number[]>(existingAssignments);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggle = (id: number) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            // Remove deselected assignments
            const toRemove = existingAssignments.filter(id => !selected.includes(id));
            if (toRemove.length > 0) {
                const { error: removeError } = await supabase
                    .from('assignments')
                    .delete()
                    .eq('user_id', employee.id)
                    .in('training_id', toRemove);
                if (removeError) throw removeError;
            }

            // Add new assignments
            const toAdd = selected.filter(id => !existingAssignments.includes(id));
            if (toAdd.length > 0) {
                const { error: addError } = await supabase
                    .from('assignments')
                    .insert(toAdd.map(training_id => ({
                        user_id: employee.id,
                        training_id,
                        assigned_by: user?.id,
                        organization_id: employee.organization_id,
                    })));
                if (addError) throw addError;
            }

            onSaved();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save assignments');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Assign Assessments</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {employee.first_name} {employee.last_name}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Training list */}
                <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
                    {trainings.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                            No trainings available. Run the AI pipeline first.
                        </p>
                    ) : (
                        trainings.map(t => (
                            <div
                                key={t.id}
                                onClick={() => toggle(t.id)}
                                className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                    selected.includes(t.id)
                                        ? 'border-[#1e3a5f] bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div>
                                    <p className="text-sm font-medium text-gray-900 capitalize">
                                        {t.company_role} Training
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Created {formatDate(t.created_at)}
                                    </p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                    selected.includes(t.id)
                                        ? 'border-[#1e3a5f] bg-[#1e3a5f]'
                                        : 'border-gray-300'
                                }`}>
                                    {selected.includes(t.id) && (
                                        <CheckCircle className="w-3 h-3 text-white" />
                                    )}
                                </div>
                            </div>
                        ))
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">{selected.length} training(s) selected</p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 text-sm font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#152d4a] disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Save Assignments
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Role Dropdown ───────────────────────────────────────────────────────────

function RoleDropdown({
                          employee,
                          onRoleChanged,
                      }: {
    employee: Employee;
    onRoleChanged: (id: string, newRole: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSelect = async (role: string) => {
        setOpen(false);
        if (role === employee.role) return;
        setSaving(true);

        const { error } = await supabase
            .from('profiles')
            .update({ role })
            .eq('id', employee.id);

        if (!error) onRoleChanged(employee.id, role);
        setSaving(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:border-gray-400 transition-colors disabled:opacity-50 min-w-36"
            >
                {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                ) : (
                    <UserCog className="w-3.5 h-3.5 text-gray-400" />
                )}
                <span className="flex-1 text-left capitalize">{employee.role.replace('-', ' ')}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                        {JOB_ROLES.map(role => (
                            <button
                                key={role}
                                onClick={() => handleSelect(role)}
                                className={`w-full text-left px-4 py-2 text-sm capitalize transition-colors ${
                                    role === employee.role
                                        ? 'bg-blue-50 text-[#1e3a5f] font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                {role.replace('-', ' ')}
                                {role === employee.role && (
                                    <CheckCircle className="w-3.5 h-3.5 inline ml-2 text-[#1e3a5f]" />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function RolesAssessmentsPage() {
    const { user, profile } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [trainings, setTrainings] = useState<Training[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [assignTarget, setAssignTarget] = useState<Employee | null>(null);

    useEffect(() => {
        if (!profile?.organization_id) return;
        void loadAll();
    }, [profile]);

    const loadAll = async () => {
        setLoading(true);
        const { data: empData, error: empError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, role, organization_id')
            .eq('organization_id', profile!.organization_id)
            .neq('id', user!.id);

        console.log('empData:', empData);
        console.log('empError:', empError);  // <-- add this if not already there
        console.log('org being queried:', profile!.organization_id);

        // Get emails from auth.users via a join — use the profiles view
        const ids = (empData ?? []).map(e => e.id);
        let emailMap: Record<string, string> = {};

        if (ids.length > 0) {
            // Fetch emails via RPC or fallback to empty
            try {
                const { data: userData } = await supabase.rpc('get_user_emails', { user_ids: ids }) as
                    { data: { id: string; email: string }[] | null };

                if (userData) {
                    emailMap = Object.fromEntries(
                        userData.map(u => [u.id, u.email])
                    );
                }
            } catch {
                // RPC unavailable — emailMap stays empty, emails will show as '—'
            }
        }

        const mapped: Employee[] = (empData ?? []).map(e => ({
            ...e,
            email: emailMap[e.id] ?? '—',
        }));

        setEmployees(mapped);

        // Load all trainings for this org
        const { data: trainingData } = await supabase
            .from('trainings')
            .select('id, company_role, created_at')
            .eq('company_id', profile!.organization_id)
            .order('created_at', { ascending: false });

        setTrainings((trainingData ?? []) as Training[]);

        // Load all assignments for this org
        const { data: assignData } = await supabase
            .from('assignments')
            .select('user_id, training_id')
            .eq('organization_id', profile!.organization_id);

        setAssignments((assignData ?? []) as Assignment[]);
        setLoading(false);
    };

    const handleRoleChanged = (id: string, newRole: string) => {
        setEmployees(prev => prev.map(e => e.id === id ? { ...e, role: newRole } : e));
    };

    const getAssignmentCount = (userId: string) =>
        assignments.filter(a => a.user_id === userId).length;

    const getExistingAssignments = (userId: string) =>
        assignments.filter(a => a.user_id === userId).map(a => a.training_id);

    const filtered = employees.filter(e => {
        const name = `${e.first_name} ${e.last_name}`.toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || e.email.includes(q) || e.role.includes(q);
    });

    const initials = (e: Employee) =>
        `${e.first_name?.[0] ?? ''}${e.last_name?.[0] ?? ''}`.toUpperCase();

    return (
        <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            <Sidebar />
            <div className="ml-64">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="px-8 py-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900">Roles & Assessments</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Manage employee roles and assign training assessments
                            </p>
                        </div>
                    </div>
                </header>

                <main className="p-8 space-y-6">
                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <p className="text-sm text-gray-600">Total Employees</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{employees.length}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <p className="text-sm text-gray-600">Available Trainings</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{trainings.length}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <p className="text-sm text-gray-600">Total Assignments</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{assignments.length}</p>
                        </div>
                    </div>

                    {/* Employee table */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        {/* Table header */}
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-4">
                            <h3 className="text-lg font-semibold text-gray-900">Employees</h3>
                            <div className="relative w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, email or role..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Employee</th>
                                <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Email</th>
                                <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Role</th>
                                <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Assigned</th>
                                <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Actions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                            {loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">Loading employees...</p>
                                    </td>
                                </tr>
                            )}
                            {!loading && filtered.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm text-gray-500 font-medium">
                                            {search ? 'No employees match your search' : 'No employees in your organization yet'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                            {!loading && filtered.map(emp => (
                                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                                    {/* Employee */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                                {initials(emp)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {emp.first_name} {emp.last_name}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Email */}
                                    <td className="px-6 py-4 text-sm text-gray-600">{emp.email}</td>

                                    {/* Role dropdown */}
                                    <td className="px-6 py-4">
                                        <RoleDropdown
                                            employee={emp}
                                            onRoleChanged={handleRoleChanged}
                                        />
                                    </td>

                                    {/* Assignment count */}
                                    <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                                                getAssignmentCount(emp.id) > 0
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                <BookMarked className="w-3 h-3" />
                                                {getAssignmentCount(emp.id)} training{getAssignmentCount(emp.id) !== 1 ? 's' : ''}
                                            </span>
                                    </td>

                                    {/* Assign button */}
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => setAssignTarget(emp)}
                                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#1e3a5f] border border-[#1e3a5f] rounded-lg hover:bg-[#1e3a5f] hover:text-white transition-colors"
                                        >
                                            <BookMarked className="w-3.5 h-3.5" />
                                            Assign Training
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>

            {/* Assign modal */}
            {assignTarget && (
                <AssignModal
                    employee={assignTarget}
                    trainings={trainings}
                    existingAssignments={getExistingAssignments(assignTarget.id)}
                    onClose={() => setAssignTarget(null)}
                    onSaved={loadAll}
                />
            )}
        </div>
    );
}