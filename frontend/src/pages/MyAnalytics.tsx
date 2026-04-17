import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
    Shield, LogOut, BookOpen, BarChart3, Settings,
    Award, CheckCircle, XCircle, X, Clock, TrendingUp,
} from 'lucide-react';

interface EvidenceRow {
    training_id: number;
    company_role: string;
    score: number;
    passed: boolean;
    completed_at: string;
    assessment_type?: string | null;
    training_name?: string | null;
    min_score?: number | null;
}

function Sidebar() {
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const navItems = [
        { icon: BookOpen,  label: 'My Training',  href: '/my-training' },
        { icon: BarChart3, label: 'My Analytics', href: '/my-analytics' },
        { icon: Settings,  label: 'Settings',     href: '/settings' },
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
                                    item.href === '/my-analytics' ? 'bg-[#1e3a5f] text-white' : 'text-gray-700 hover:bg-gray-100'
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

function CertModal({ ev, name, org, onClose }: { ev: EvidenceRow; name: string; org: string; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8f] p-8 text-center relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award className="w-10 h-10 text-amber-300" />
                    </div>
                    <p className="text-white/70 text-xs uppercase tracking-widest mb-1">Certificate of Completion</p>
                    <h2 className="text-2xl font-bold text-white">MARi Secure Training</h2>
                </div>
                <div className="p-8 text-center border-b border-gray-100">
                    <p className="text-sm text-gray-500 mb-2">This certifies that</p>
                    <p className="text-2xl font-bold text-gray-900 mb-2">{name}</p>
                    <p className="text-sm text-gray-500 mb-1">has successfully completed</p>
                    <p className="text-xl font-semibold text-[#1e3a5f] capitalize mb-5">{ev.training_name || `${ev.company_role} Training`}</p>
                    <div className="inline-flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-6 py-3 mb-4">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-xl font-bold text-green-700">{ev.score}/100</span>
                        <span className="text-sm text-green-600">· {ev.passed ? 'Passed' : 'Completed'}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                        Completed {new Date(ev.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">FedRAMP Compliant · MARi Platform · {org}</p>
                </div>
                <div className="p-6 flex gap-3">
                    <button onClick={() => window.print()} className="flex-1 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#152d4a] transition-colors">
                        Print / Save PDF
                    </button>
                    <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export function MyAnalyticsPage() {
    const { user, profile } = useAuth();
    const [evidence, setEvidence] = useState<EvidenceRow[]>([]);
    const [totalAssigned, setTotalAssigned] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedCert, setSelectedCert] = useState<EvidenceRow | null>(null);

    const displayName = profile ? `${profile.first_name} ${profile.last_name}` : user?.email ?? 'User';
    const initials = profile ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() : '?';

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            setLoading(true);
            const [{ data: evData }, { data: assignData }] = await Promise.all([
                supabase
                    .from('training_evidence')
                    .select('training_id, company_role, score, passed, completed_at, assessment_type')
                    .eq('user_id', user.id)
                    .order('completed_at', { ascending: false }),
                supabase
                    .from('assignments')
                    .select('training_id, min_score')
                    .eq('user_id', user.id),
            ]);
            const rawEvidence = (evData ?? []) as EvidenceRow[];
            const assignments = (assignData ?? []) as { training_id: number; min_score: number | null }[];
            const minScoreMap: Record<number, number | null> = Object.fromEntries(
                assignments.map(a => [a.training_id, a.min_score ?? null])
            );

            // Fetch training names for all training_ids in evidence
            const trainingIds = [...new Set(rawEvidence.map(e => e.training_id).filter(Boolean))];
            let nameMap: Record<number, string> = {};
            if (trainingIds.length > 0) {
                const { data: trainingData } = await supabase
                    .from('trainings')
                    .select('id, name, company_role')
                    .in('id', trainingIds);
                if (trainingData) {
                    nameMap = Object.fromEntries(
                        trainingData.map(t => [t.id, t.name || ''])
                    );
                }
            }

            // Merge names and min_score into evidence rows
            const evidenceWithNames = rawEvidence.map(e => ({
                ...e,
                training_name: nameMap[e.training_id] || null,
                min_score: minScoreMap[e.training_id] ?? null,
            }));

            setEvidence(evidenceWithNames);
            setTotalAssigned(assignments.length);
            setLoading(false);
        };
        void load();
    }, [user]);

    const trainingTitle = (e: EvidenceRow) =>
        e.training_name || `${e.company_role} Training`;

    // Helper: does this evidence row meet its min_score requirement?
    const meetsMin = (e: EvidenceRow) => {
        const req = e.min_score ?? null;
        return req !== null ? e.score >= req : e.passed;
    };

    // Use unique training_ids (latest attempt per training)
    const latestByTraining: Record<number, EvidenceRow> = {};
    evidence.forEach(e => {
        const ex = latestByTraining[e.training_id];
        if (!ex || new Date(e.completed_at) > new Date(ex.completed_at)) {
            latestByTraining[e.training_id] = e;
        }
    });
    const latestEvidence = Object.values(latestByTraining);

    const completed  = latestEvidence.filter(e => meetsMin(e)).length;
    const passed     = latestEvidence.filter(e => meetsMin(e)).length; // same — met min = earned cert
    const avgScore   = latestEvidence.length > 0 ? Math.round(latestEvidence.reduce((s, e) => s + e.score, 0) / latestEvidence.length) : null;
    const compRate   = totalAssigned > 0 ? Math.min(100, Math.round((completed / totalAssigned) * 100)) : 0;
    const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <>
            <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                <Sidebar />
                <div className="ml-64">
                    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                        <div className="px-8 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-900">My Analytics</h2>
                                <p className="text-sm text-gray-600 mt-1">Your training performance and certificates</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">{displayName}</p>
                                    <p className="text-xs text-gray-600 capitalize">{profile?.role ?? ''}</p>
                                </div>
                                <div className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white font-medium uppercase">{initials}</div>
                            </div>
                        </div>
                    </header>

                    <main className="p-8 space-y-6">
                        {/* Summary cards */}
                        <div className="grid grid-cols-4 gap-5">
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Assigned</p>
                                <p className="text-3xl font-bold text-gray-900">{totalAssigned}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Completed</p>
                                <p className="text-3xl font-bold text-gray-900">{completed}</p>
                                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#1e3a5f] rounded-full" style={{ width: `${compRate}%` }} />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{compRate}% complete</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Avg Score</p>
                                <p className={`text-3xl font-bold ${avgScore !== null && avgScore >= 70 ? 'text-green-600' : 'text-gray-900'}`}>
                                    {avgScore !== null ? `${avgScore}/100` : '—'}
                                </p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Certificates</p>
                                <div className="flex items-center gap-2">
                                    <Award className="w-6 h-6 text-amber-400" />
                                    <p className="text-3xl font-bold text-gray-900">{passed}</p>
                                </div>
                            </div>
                        </div>

                        {/* Certificates section */}
                        {latestEvidence.filter(e => meetsMin(e)).length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                                    <Award className="w-4 h-4 text-amber-500" />
                                    <h3 className="text-base font-semibold text-gray-900">Certificates Earned</h3>
                                </div>
                                <div className="p-6 grid grid-cols-2 gap-4">
                                    {latestEvidence.filter(e => meetsMin(e)).map((e, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 border border-amber-200 bg-amber-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <Award className="w-5 h-5 text-amber-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 capitalize">{trainingTitle(e)}</p>
                                                    <p className="text-xs text-gray-500">{formatDate(e.completed_at)} · {e.score}/100</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setSelectedCert(e)}
                                                    className="px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors">
                                                View
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Grade history table */}
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-[#1e3a5f]" />
                                <h3 className="text-base font-semibold text-gray-900">Grade History</h3>
                            </div>
                            {loading ? (
                                <div className="p-12 text-center text-sm text-gray-500">Loading...</div>
                            ) : evidence.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500 font-medium">No assessments completed yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Complete a training to see your grades here</p>
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Training</th>
                                        <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Score</th>
                                        <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Result</th>
                                        <th className="text-left text-xs font-medium text-gray-600 px-6 py-3">Date</th>
                                        <th className="px-6 py-3" />
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                    {evidence.map((e, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900 capitalize">
                                                {trainingTitle(e)}
                                                {e.assessment_type && <span className="ml-2 text-xs text-gray-400 font-normal">({e.assessment_type})</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${e.score >= 70 ? 'bg-green-500' : 'bg-red-400'}`} style={{ width: `${e.score}%` }} />
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-900">{e.score}/100</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${meetsMin(e) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {meetsMin(e) ? <><CheckCircle className="w-3 h-3" /> Passed</> : <><XCircle className="w-3 h-3" /> Failed</>}
                                                    </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{formatDate(e.completed_at)}</td>
                                            <td className="px-6 py-4">
                                                {meetsMin(e) && (
                                                    <button onClick={() => setSelectedCert(e)} className="flex items-center gap-1 text-xs text-amber-600 font-medium hover:underline">
                                                        <Award className="w-3 h-3" /> Certificate
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </main>
                </div>
            </div>

            {selectedCert && (
                <CertModal ev={selectedCert} name={displayName} org={profile?.organization_id ?? ''} onClose={() => setSelectedCert(null)} />
            )}
        </>
    );
}