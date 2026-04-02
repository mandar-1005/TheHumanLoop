import { useState, useEffect } from 'react';
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
    LogOut
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', active: true },
    { icon: BookOpen, label: 'Training Modules', href: '/training-modules', active: false },
    { icon: FileText, label: 'SSP Documents', href: '/ssp-documents', active: false },
    { icon: Users, label: 'Roles & Assessments', href: '/roles', active: false },
    { icon: BarChart3, label: 'Analytics', href: '/analytics', active: false },
    { icon: Settings, label: 'Settings', href: '/settings', active: false },
];

const metricsData = [
    {
        title: 'Active Training Modules',
        value: '24',
        change: '+12%',
        trending: 'up',
        subtitle: 'vs last month'
    },
    {
        title: 'Employees Enrolled',
        value: '342',
        change: '+8%',
        trending: 'up',
        subtitle: 'across all roles'
    },
    {
        title: 'Completion Rate',
        value: '87%',
        change: '+5%',
        trending: 'up',
        subtitle: 'target: 90%'
    },
    {
        title: 'At-Risk Roles',
        value: '3',
        change: '-2',
        trending: 'down',
        subtitle: 'needs attention'
    },
];

const trainingModules = [
    {
        id: 1,
        name: 'Access Control Fundamentals',
        role: 'Developer',
        status: 'Published',
        completion: 92,
        lastUpdated: '2 days ago'
    },
    {
        id: 2,
        name: 'Incident Response Protocol',
        role: 'Security Lead',
        status: 'Published',
        completion: 78,
        lastUpdated: '1 week ago'
    },
    {
        id: 3,
        name: 'Audit & Accountability Training',
        role: 'Team Lead',
        status: 'In Review',
        completion: 45,
        lastUpdated: '3 days ago'
    },
    {
        id: 4,
        name: 'Data Encryption Best Practices',
        role: 'Developer',
        status: 'Published',
        completion: 88,
        lastUpdated: '5 days ago'
    },
    {
        id: 5,
        name: 'Risk Assessment Framework',
        role: 'Compliance Officer',
        status: 'Draft',
        completion: 0,
        lastUpdated: '1 day ago'
    },
];

interface SSPDocRow {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    created_at: string;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const recentGenerations = [
    {
        id: 1,
        title: 'Security Awareness Module',
        status: 'Succeeded',
        timestamp: '2 hours ago'
    },
    {
        id: 2,
        title: 'Compliance Overview Training',
        status: 'Needs Review',
        timestamp: '5 hours ago'
    },
    {
        id: 3,
        title: 'Access Control Deep Dive',
        status: 'Succeeded',
        timestamp: '1 day ago'
    },
    {
        id: 4,
        title: 'Incident Response Procedures',
        status: 'Failed',
        timestamp: '2 days ago'
    },
];

const fedRAMPCoverageData = [
    { name: 'Access Control', coverage: 94, total: 100 },
    { name: 'Audit & Accountability', coverage: 87, total: 100 },
    { name: 'Incident Response', coverage: 72, total: 100 },
    { name: 'Risk Assessment', coverage: 91, total: 100 },
    { name: 'System Protection', coverage: 85, total: 100 },
    { name: 'Data Security', coverage: 96, total: 100 },
];

export function Dashboard() {
    const { signOut, user } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('Developers');
    const tabs = ['Developers', 'Security Leads', 'Team Leads', 'Other'];

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRole, setNewRole] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [allSSPs, setAllSSPs] = useState<SSPDocRow[]>([]);
    const [selectedSSPId, setSelectedSSPId] = useState<string>('');

    const [profile, setProfile] = useState<{
        first_name: string;
        last_name: string;
        role: string;
        organization_id: string;
    } | null>(null);

    const [recentSSPs, setRecentSSPs] = useState<SSPDocRow[]>([]);
    const [sspLoading, setSSPLoading] = useState(true);

    useEffect(() => {
        if (user) {
            supabase
                .from('profiles')
                .select('first_name, last_name, role, organization_id')
                .eq('id', user.id)
                .single()
                .then(({ data }) => { if (data) setProfile(data); });

            supabase
                .from('ssp_documents')
                .select('id, file_name, file_path, file_size, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5)
                .then(({ data }) => {
                    setRecentSSPs((data ?? []) as SSPDocRow[]);
                    setSSPLoading(false);
                });
        }
    }, [user]);

    const openCreateModal = async () => {
        setShowCreateModal(true);
        if (!profile?.organization_id) return;
        const { data } = await supabase
            .from('ssp_documents')
            .select('id, file_name, file_path, file_size, created_at')
            .eq('user_id', user!.id)
            .order('created_at', { ascending: false });
        setAllSSPs((data ?? []) as SSPDocRow[]);
    };

    const handleCreateTraining = async () => {
        if (!newRole.trim()) {
            toast.error('Please enter a role.');
            return;
        }

        if (!selectedSSPId) {
            toast.error('Please select an SSP document.');
            return;
        }

        if (!profile?.organization_id) {
            toast.error('No organization id found for this user profile.');
            return;
        }

        setIsCreating(true);
        try {
            const selectedDoc = allSSPs.find(s => s.id === selectedSSPId);
            if (!selectedDoc) throw new Error('Selected SSP not found.');

            // Use file_path (e.g. "userid/timestamp_filename.pdf") not file_name
            const { data: fileData, error: fileError } = await supabase.storage
                .from('ssp-documents')
                .download(selectedDoc.file_path);

            if (fileError) throw new Error('Failed to download SSP: ' + fileError.message);

            const sspFileBlob = new File([fileData], selectedDoc.file_name, { type: fileData.type });

            const formData = new FormData();
            formData.append('role', newRole.trim());
            formData.append('company_id', profile.organization_id);
            formData.append('ssp_file', sspFileBlob);

            const response = await fetch('http://127.0.0.1:8000/api/trainings/create', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.detail || 'Failed to create training.');
            }

            toast.success('Training added to Training Modules.');
            setShowCreateModal(false);
            setNewRole('');
            setSelectedSSPId('');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Unexpected error.');
        } finally {
            setIsCreating(false);
        }
    };

    const displayName = profile
        ? `${profile.first_name} ${profile.last_name}`
        : user?.email ?? 'User';

    const initials = profile
        ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase()
        : '?';

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Published':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'In Review':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Draft':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getGenerationStatusColor = (status: string) => {
        switch (status) {
            case 'Succeeded':
                return 'bg-green-100 text-green-700';
            case 'Needs Review':
                return 'bg-yellow-100 text-yellow-700';
            case 'Failed':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getGenerationIcon = (status: string) => {
        switch (status) {
            case 'Succeeded':
                return <CheckCircle className="w-4 h-4" />;
            case 'Needs Review':
                return <AlertTriangle className="w-4 h-4" />;
            case 'Failed':
                return <AlertTriangle className="w-4 h-4" />;
            default:
                return <Clock className="w-4 h-4" />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
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
                                    if (item.href === '/training-modules' || item.href === '/ssp-documents' || item.href === '/roles') {
                                        navigate(item.href);
                                        return;
                                    }
                                    if (!item.active) {
                                        alert(`${item.label} page coming soon!`);
                                    }
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    item.active
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
                                        className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>

                                <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <Bell className="w-5 h-5 text-gray-600" />
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                                </button>

                                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">{displayName}</p>
                                        <p className="text-xs text-gray-600 capitalize">{profile?.role ?? ''}</p>
                                    </div>
                                    <div className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white font-medium">
                                        {initials}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="p-8 space-y-8">
                    <div className="grid grid-cols-4 gap-6">
                        {metricsData.map((metric, index) => (
                            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
                                    <button className="text-gray-400 hover:text-gray-600">
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`flex items-center gap-1 text-sm font-medium ${
                                            metric.trending === 'up' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {metric.trending === 'up' ? (
                                                <TrendingUp className="w-4 h-4" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4" />
                                            )}
                                            {metric.change}
                                        </span>
                                        <span className="text-sm text-gray-500">{metric.subtitle}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

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
                                            activeTab === tab
                                                ? 'bg-[#1e3a5f] text-white'
                                                : 'text-gray-600 hover:bg-gray-100'
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
                                {trainingModules.map((module) => (
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
                                                    <div
                                                        className="h-full bg-[#1e3a5f] rounded-full"
                                                        style={{ width: `${module.completion}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm text-gray-600">{module.completion}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-600">{module.lastUpdated}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="text-gray-400 hover:text-gray-600">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl border border-gray-200">
                            <div className="p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">Recent SSP Documents</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                {sspLoading && (
                                    <p className="text-sm text-gray-500">Loading documents...</p>
                                )}
                                {!sspLoading && recentSSPs.length === 0 && (
                                    <div className="text-center py-4">
                                        <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">No documents uploaded yet</p>
                                        <button
                                            onClick={() => navigate('/ssp-documents')}
                                            className="mt-2 text-xs font-medium text-[#1e3a5f] hover:underline"
                                        >
                                            Upload your first SSP
                                        </button>
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
                                                    {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {formatFileSize(doc.file_size)}
                                                </p>
                                            </div>
                                        </div>
                                        <button className="px-3 py-1.5 text-xs font-medium text-[#1e3a5f] border border-[#1e3a5f] rounded-lg hover:bg-[#1e3a5f] hover:text-white transition-colors">
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
                                            <button className="text-gray-400 hover:text-gray-600">
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">FedRAMP Coverage by Control Family</h3>
                            <p className="text-sm text-gray-600 mt-1">Compliance coverage across control families</p>
                        </div>
                        <div className="p-6">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={fedRAMPCoverageData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: '#6b7280', fontSize: 12 }}
                                        angle={-15}
                                        textAnchor="end"
                                        height={80}
                                    />
                                    <YAxis
                                        tick={{ fill: '#6b7280', fontSize: 12 }}
                                        domain={[0, 100]}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            fontSize: '12px'
                                        }}
                                        formatter={(value) => [`${value}%`, 'Coverage']}
                                    />
                                    <Bar dataKey="coverage" fill="#1e3a5f" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </main>
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Training Module</h3>

                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm"
                        >
                            <option value="">Select a role...</option>
                            <option value="developer">Developer</option>
                            <option value="security-lead">Security Lead</option>
                            <option value="team-lead">Team Lead</option>
                            <option value="compliance-officer">Compliance Officer</option>
                        </select>

                        <label className="block text-sm font-medium text-gray-700 mb-1">SSP Document</label>
                        {allSSPs.length === 0 ? (
                            <p className="text-sm text-gray-500 mb-4">
                                No SSP documents found.{' '}
                                <button
                                    onClick={() => { setShowCreateModal(false); navigate('/ssp-documents'); }}
                                    className="text-[#1e3a5f] underline"
                                >
                                    Upload one first.
                                </button>
                            </p>
                        ) : (
                            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                                {allSSPs.map((doc) => (
                                    <div
                                        key={doc.id}
                                        onClick={() => setSelectedSSPId(doc.id)}
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                            selectedSSPId === doc.id
                                                ? 'border-[#1e3a5f] bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <FileText className={`w-4 h-4 flex-shrink-0 ${selectedSSPId === doc.id ? 'text-[#1e3a5f]' : 'text-gray-400'}`} />
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

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
                                disabled={isCreating}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateTraining}
                                className="px-4 py-2 rounded-lg bg-[#1e3a5f] text-white disabled:opacity-60"
                                disabled={isCreating}
                            >
                                {isCreating ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}