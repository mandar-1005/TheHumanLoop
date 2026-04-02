import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
// import {
//     Shield, LogOut, LayoutDashboard, BookOpen,
//     BarChart3, FileText, Loader2, ChevronRight
// } from 'lucide-react';
import {
    Shield, LogOut, BookOpen,
    BarChart3, Loader2, ChevronRight
} from 'lucide-react';

interface AssignedTraining {
    id: string;
    assigned_at: string;
    due_date: string | null;
    training: {
        id: number;
        company_role: string;
        training_json: string;
        created_at: string;
    } | {
        id: number;
        company_role: string;
        training_json: string;
        created_at: string;
    }[];
}

interface TrainingScore {
    training_id: number;
    score: number;
    passed: boolean;
    completed_at: string;
}

function Sidebar() {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const navItems = [
        { icon: BookOpen, label: 'My Training', href: '/my-training' },
        { icon: BarChart3, label: 'My Analytics', href: '/my-analytics' },
    ];

    const current = '/my-training';

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
                            onClick={() => navigate(item.href)}
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

export function MyTrainingPage() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState<AssignedTraining[]>([]);
    const [scores, setScores] = useState<TrainingScore[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const load = async () => {
            setLoading(true);

            // Fetch assigned trainings
            const { data: assignData } = await supabase
                .from('assignments')
                .select(`
                    id,
                    assigned_at,
                    due_date,
                    training:training_id (
                        id, company_role, training_json, created_at
                    )
                `)
                .eq('user_id', user.id)
                .order('assigned_at', { ascending: false });

            setAssignments((assignData ?? []) as unknown as AssignedTraining[]);

            // Fetch scores
            const { data: scoreData } = await supabase
                .from('training_evidence')
                .select('training_id, score, passed, completed_at')
                .eq('user_id', user.id);

            setScores((scoreData ?? []) as TrainingScore[]);
            setLoading(false);
        };

        void load();
    }, [user]);

    const getTraining = (a: AssignedTraining) =>
        Array.isArray(a.training) ? a.training[0] : a.training;

    const getScore = (trainingId: number) =>
        scores.find(s => s.training_id === trainingId);

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const displayName = profile ? `${profile.first_name} ${profile.last_name}` : user?.email ?? 'User';
    const initials = profile ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() : '?';

    return (
        <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            <Sidebar />
            <div className="ml-64">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="px-8 py-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900">My Training</h2>
                            <p className="text-sm text-gray-600 mt-1">Welcome back, {displayName}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{displayName}</p>
                                <p className="text-xs text-gray-600 capitalize">{profile?.role ?? ''}</p>
                            </div>
                            <div className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white font-medium uppercase">
                                {initials}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="p-8 space-y-6">
                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <p className="text-sm text-gray-600">Assigned</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{assignments.length}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <p className="text-sm text-gray-600">Completed</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{scores.length}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <p className="text-sm text-gray-600">Passed</p>
                            <p className="text-3xl font-bold text-green-600 mt-1">
                                {scores.filter(s => s.passed).length}
                            </p>
                        </div>
                    </div>

                    {/* Assigned trainings */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Assigned Trainings</h3>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">Loading your trainings...</p>
                            </div>
                        ) : assignments.length === 0 ? (
                            <div className="p-12 text-center">
                                <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm text-gray-500 font-medium">No trainings assigned yet</p>
                                <p className="text-xs text-gray-400 mt-1">Your admin will assign trainings to you</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Training</th>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Assigned</th>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Due Date</th>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Score</th>
                                    <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Status</th>
                                    <th className="px-6 py-3" />
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                {assignments.map((a) => {
                                    const t = getTraining(a);
                                    const score = t ? getScore(t.id) : undefined;
                                    return (
                                        <tr key={a.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900 capitalize">
                                                {t?.company_role ?? '—'} Training
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {formatDate(a.assigned_at)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {a.due_date ? formatDate(a.due_date) : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {score ? `${score.score}/100` : '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {score ? (
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                                        score.passed
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                    }`}>
                                                            {score.passed ? 'Passed' : 'Failed'}
                                                        </span>
                                                ) : (
                                                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                                            Pending
                                                        </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => navigate('/training-modules')}
                                                    className="flex items-center gap-1 text-xs text-[#1e3a5f] font-medium hover:underline"
                                                >
                                                    Start <ChevronRight className="w-3 h-3" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}