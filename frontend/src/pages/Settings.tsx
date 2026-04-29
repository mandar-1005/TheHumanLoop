import { useEffect, useState } from 'react';
import {
    LayoutDashboard, BookOpen, FileText, Users,
    BarChart3, Settings, Shield, LogOut,
    User, Lock, CheckCircle2, AlertCircle,
    Loader2, Save, Eye, EyeOff, History, Bell, X,
    Sun, Moon,
} from 'lucide-react';
import { getActivityLog } from '../lib/activityLog';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../context/ThemeContext';
import { ProfileDropdown } from '../components/ProfileDropdown';
import { TrainingHistorySidebar, type TrainingAttempt } from '../pages/TrainingHistorySidebar';

interface ProfileForm { firstName: string; lastName: string; role: string; }
interface PasswordForm { currentPassword: string; newPassword: string; confirmPassword: string; }
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function Sidebar() {
    const { signOut, isAdmin } = useAuth();
    const navigate = useNavigate();
    const adminNav = [
        { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
        { icon: BookOpen, label: 'Training Modules', href: '/training-modules' },
        { icon: FileText, label: 'SSP Documents', href: '/ssp-documents' },
        { icon: Users, label: 'Roles & Assessments', href: '/roles' },
        { icon: BarChart3, label: 'Analytics', href: '/progress' },
        { icon: Settings, label: 'Settings', href: '/settings' },
    ];
    const userNav = [
        { icon: BookOpen, label: 'My Training', href: '/my-training' },
        { icon: BarChart3, label: 'My Analytics', href: '/my-analytics' },
        { icon: Settings, label: 'Settings', href: '/settings' },
    ];
    const navItems = isAdmin ? adminNav : userNav;
    return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-10">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Secure Training</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">MARi Platform</p>
                    </div>
                </div>
                <nav className="space-y-1">
                    {navItems.map((item) => (
                        <button key={item.label} onClick={() => navigate(item.href)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    item.href === '/settings' ? 'bg-[#1e3a5f] text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}>
                            <item.icon className="w-5 h-5" />{item.label}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200 dark:border-gray-800">
                <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors mb-4">
                    <LogOut className="w-5 h-5" />Sign Out
                </button>
                <div className="text-xs text-gray-500 dark:text-gray-400"><p className="mb-1">© 2026 MARi</p><p>FedRAMP Compliant</p></div>
            </div>
        </aside>
    );
}

function Field({ label, error, children }: { label: string; error?: string | null; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
            {children}
            {error && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
        </div>
    );
}

function ic(touched: boolean, valid: boolean | null) {
    if (!touched || valid === null) return 'border-gray-300 dark:border-gray-600 focus:ring-blue-500/20 focus:border-blue-500';
    return valid ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500' : 'border-red-300 focus:ring-red-500/20 focus:border-red-500';
}
const BI = 'w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all disabled:opacity-60 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:placeholder-gray-500';

export function SettingsPage() {
    const { user, profile: authProfile, isAdmin } = useAuth();
    const { toggleTheme, isDark } = useTheme();
    const initialTab = (new URLSearchParams(window.location.search).get('tab') ?? 'appearance') as 'appearance' | 'profile' | 'security';
    const [activeTab, setActiveTab] = useState<'appearance' | 'profile' | 'security'>(initialTab);

    // Bell + history
    const [historyOpen, setHistoryOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifLoaded, setNotifLoaded] = useState(false);
    const [notifItems, setNotifItems] = useState<{ label: string; urgency: 'overdue' | 'soon' }[]>([]);
    const [historyAttempts, setHistoryAttempts] = useState<TrainingAttempt[]>([]);
    const [hasHistory, setHasHistory] = useState(false);

    useEffect(() => {
        if (!user || isAdmin) return; // only for employees
        const loadBellData = async () => {
            const [{ data: assignData }, { data: scoreData }] = await Promise.all([
                supabase.from('assignments').select('training_id, due_date, assigned_at').eq('user_id', user.id),
                supabase.from('training_evidence').select('id, training_id, score, passed, completed_at').eq('user_id', user.id).order('completed_at', { ascending: false }),
            ]);
            const completedIds = new Set((scoreData ?? []).map((s: { training_id: number }) => s.training_id));
            const now = Date.now();
            const threeDays = 3 * 24 * 60 * 60 * 1000;
            const items: { label: string; urgency: 'overdue' | 'soon' }[] = [];
            for (const a of (assignData ?? []) as { training_id: number; due_date: string | null; assigned_at: string }[]) {
                if (completedIds.has(a.training_id)) continue;
                const dm = a.due_date ? new Date(a.due_date).getTime() : new Date(a.assigned_at).getTime() + 7 * 24 * 60 * 60 * 1000;
                if (dm < now) items.push({ label: `Training #${a.training_id}`, urgency: 'overdue' });
                else if (dm - now <= threeDays) items.push({ label: `Training #${a.training_id}`, urgency: 'soon' });
            }
            setNotifItems(items);
            setHasHistory((scoreData ?? []).length > 0);
            setHistoryAttempts((scoreData ?? []).map((s: { id: string; training_id: number; score: number; passed: boolean; completed_at: string }) => ({
                id: s.id, trainingId: s.training_id, trainingName: `Training #${s.training_id}`,
                completedAt: s.completed_at, score: s.score, passed: s.passed, feedback: {},
            })));
            setNotifLoaded(true);
        };
        void loadBellData();
    }, [user, isAdmin]);

    const [profileForm, setProfileForm] = useState<ProfileForm>({ firstName: '', lastName: '', role: '' });
    const [profileTouched, setProfileTouched] = useState<Record<string, boolean>>({});
    const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
    const [profileSave, setProfileSave] = useState<SaveState>('idle');
    const [profileErrMsg, setProfileErrMsg] = useState<string | null>(null);

    const [passwordForm, setPasswordForm] = useState<PasswordForm>({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordTouched, setPasswordTouched] = useState<Record<string, boolean>>({});
    const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
    const [passwordSave, setPasswordSave] = useState<SaveState>('idle');
    const [passwordErrMsg, setPasswordErrMsg] = useState<string | null>(null);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        if (authProfile) setProfileForm({ firstName: authProfile.first_name ?? '', lastName: authProfile.last_name ?? '', role: authProfile.role ?? '' });
    }, [authProfile]);

    const vpf = (name: string, value: string): string => {
        if (name === 'firstName' && !value.trim()) return 'First name is required';
        if (name === 'lastName' && !value.trim()) return 'Last name is required';
        if (name === 'role' && !value.trim()) return 'Role is required';
        return '';
    };
    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfileForm(p => ({ ...p, [name]: value }));
        setProfileSave('idle');
        if (profileTouched[name]) setProfileErrors(p => ({ ...p, [name]: vpf(name, value) }));
    };
    const handleProfileBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfileTouched(p => ({ ...p, [name]: true }));
        setProfileErrors(p => ({ ...p, [name]: vpf(name, value) }));
    };
    const handleProfileSave = async () => {
        const allErrors = { firstName: vpf('firstName', profileForm.firstName), lastName: vpf('lastName', profileForm.lastName), role: vpf('role', profileForm.role) };
        setProfileTouched({ firstName: true, lastName: true, role: true });
        setProfileErrors(allErrors);
        if (Object.values(allErrors).some(e => e)) return;
        setProfileSave('saving'); setProfileErrMsg(null);
        const { error } = await supabase.from('profiles').update({ first_name: profileForm.firstName.trim(), last_name: profileForm.lastName.trim(), role: profileForm.role }).eq('id', user!.id);
        if (error) { setProfileSave('error'); setProfileErrMsg(error.message); }
        else { setProfileSave('saved'); setTimeout(() => setProfileSave('idle'), 2500); }
    };

    const vp = (p: string) => { if (!p) return 'Required'; if (p.length < 8) return 'Min 8 chars'; if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(p)) return 'Needs uppercase, lowercase, number'; return ''; };
    const vpwf = (name: string, value: string): string => {
        if (name === 'currentPassword' && !value) return 'Required';
        if (name === 'newPassword') return vp(value);
        if (name === 'confirmPassword') { if (!value) return 'Required'; if (value !== passwordForm.newPassword) return 'Passwords do not match'; }
        return '';
    };
    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordForm(p => ({ ...p, [name]: value })); setPasswordSave('idle');
        if (passwordTouched[name]) setPasswordErrors(p => ({ ...p, [name]: vpwf(name, value) }));
    };
    const handlePasswordBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordTouched(p => ({ ...p, [name]: true }));
        setPasswordErrors(p => ({ ...p, [name]: vpwf(name, value) }));
    };
    const handlePasswordSave = async () => {
        const allErrors = { currentPassword: vpwf('currentPassword', passwordForm.currentPassword), newPassword: vpwf('newPassword', passwordForm.newPassword), confirmPassword: vpwf('confirmPassword', passwordForm.confirmPassword) };
        setPasswordTouched({ currentPassword: true, newPassword: true, confirmPassword: true });
        setPasswordErrors(allErrors);
        if (Object.values(allErrors).some(e => e)) return;
        setPasswordSave('saving'); setPasswordErrMsg(null);
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: user!.email!, password: passwordForm.currentPassword });
        if (signInError) { setPasswordSave('error'); setPasswordErrMsg('Current password is incorrect.'); return; }
        const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
        if (error) { setPasswordSave('error'); setPasswordErrMsg(error.message); }
        else { setPasswordSave('saved'); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); setPasswordTouched({}); setTimeout(() => setPasswordSave('idle'), 2500); }
    };

    const displayName = authProfile ? `${authProfile.first_name} ${authProfile.last_name}` : user?.email ?? 'User';
    const initials = authProfile ? `${authProfile.first_name?.[0] ?? ''}${authProfile.last_name?.[0] ?? ''}`.toUpperCase() : '?';
    const JOB_ROLES = [
        { value: 'developer', label: 'Developer' }, { value: 'security-lead', label: 'Security Lead' },
        { value: 'team-lead', label: 'Team Lead' }, { value: 'compliance-officer', label: 'Compliance Officer' },
        { value: 'employee', label: 'Employee' }, ...(isAdmin ? [{ value: 'admin', label: 'Admin' }] : []),
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            <Sidebar />
            <div className="ml-64">
                <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                    <div className="px-8 py-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage your account and preferences</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* History — employees only */}
                            {!isAdmin && notifLoaded && hasHistory && (
                                <button
                                    onClick={() => setHistoryOpen(true)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <History className="w-4 h-4" />
                                    History
                                    <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                                        {historyAttempts.length}
                                    </span>
                                </button>
                            )}

                            {/* Bell — employees only */}
                            {!isAdmin && notifLoaded && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowNotifications(n => !n)}
                                        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <Bell className="w-5 h-5 text-gray-600" />
                                        {notifItems.length > 0 && (
                                            <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                                                {notifItems.length}
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
                                                    {notifItems.length === 0 ? (
                                                        <div className="p-6 text-center">
                                                            <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-2" />
                                                            <p className="text-sm text-gray-500">All caught up!</p>
                                                        </div>
                                                    ) : (
                                                        notifItems.map((item, i) => (
                                                            <div key={i} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                                                                <div className="flex items-start gap-3">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${item.urgency === 'overdue' ? 'bg-red-100' : 'bg-amber-100'}`}>
                                                                        <Bell className={`w-4 h-4 ${item.urgency === 'overdue' ? 'text-red-600' : 'text-amber-600'}`} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-900">{item.label}</p>
                                                                        <p className={`text-xs mt-0.5 ${item.urgency === 'overdue' ? 'text-red-600' : 'text-amber-600'}`}>
                                                                            {item.urgency === 'overdue' ? 'Overdue — complete ASAP' : 'Due within 3 days'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            <ProfileDropdown displayName={displayName} role={authProfile?.role} initials={initials} />
                        </div>
                    </div>
                </header>

                <main className="p-8 max-w-2xl">
                    {/* Tabs */}
                    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6 w-fit">
                        {([
                            { id: 'appearance', label: 'Appearance', icon: Sun },
                            { id: 'profile', label: 'Profile', icon: User },
                            { id: 'security', label: 'Security', icon: Lock },
                        ] as const).map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        activeTab === tab.id
                                            ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}>
                                <tab.icon className="w-4 h-4" />{tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-6">

                        {activeTab === 'appearance' && (
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                                <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                        {isDark ? <Moon className="w-5 h-5 text-amber-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Appearance</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Customize how the platform looks</p>
                                    </div>
                                </div>
                                <div className="p-6 space-y-4">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => isDark && toggleTheme()}
                                                className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${!isDark ? 'border-[#1e3a5f] bg-blue-50' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                                            <div className="w-full h-20 bg-white border border-gray-200 rounded-lg overflow-hidden">
                                                <div className="h-4 bg-gray-100 border-b border-gray-200 flex items-center px-2 gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300" /><div className="w-6 h-1 rounded bg-gray-300" />
                                                </div>
                                                <div className="p-2 flex gap-1.5">
                                                    <div className="w-6 h-8 bg-gray-100 rounded" />
                                                    <div className="flex-1 space-y-1">
                                                        <div className="h-1.5 bg-gray-200 rounded w-3/4" /><div className="h-1.5 bg-gray-100 rounded w-1/2" /><div className="h-1.5 bg-blue-100 rounded w-2/3" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2"><Sun className="w-4 h-4 text-amber-500" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Light</span></div>
                                            {!isDark && <div className="absolute top-2 right-2 w-5 h-5 bg-[#1e3a5f] rounded-full flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
                                        </button>
                                        <button onClick={() => !isDark && toggleTheme()}
                                                className={`relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${isDark ? 'border-[#1e3a5f] bg-blue-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                                            <div className="w-full h-20 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                                                <div className="h-4 bg-gray-800 border-b border-gray-700 flex items-center px-2 gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600" /><div className="w-6 h-1 rounded bg-gray-600" />
                                                </div>
                                                <div className="p-2 flex gap-1.5">
                                                    <div className="w-6 h-8 bg-gray-800 rounded" />
                                                    <div className="flex-1 space-y-1">
                                                        <div className="h-1.5 bg-gray-700 rounded w-3/4" /><div className="h-1.5 bg-gray-800 rounded w-1/2" /><div className="h-1.5 bg-blue-900/40 rounded w-2/3" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2"><Moon className="w-4 h-4 text-blue-400" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark</span></div>
                                            {isDark && <div className="absolute top-2 right-2 w-5 h-5 bg-[#1e3a5f] rounded-full flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center gap-3">
                                            {isDark ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{isDark ? 'Dark mode enabled' : 'Light mode enabled'}</span>
                                        </div>
                                        <button onClick={toggleTheme} className={`relative w-12 h-6 rounded-full transition-colors ${isDark ? 'bg-[#1e3a5f]' : 'bg-gray-200'}`}>
                                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <>
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                                    <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                            <User className="w-5 h-5 text-[#1e3a5f]" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Personal Information</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Update your name and job role</p>
                                        </div>
                                    </div>
                                    <div className="p-6 space-y-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white text-xl font-semibold uppercase flex-shrink-0">{initials}</div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{displayName}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{authProfile?.organization_id ? `Organization: ${authProfile.organization_id}` : ''}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="First Name" error={profileTouched.firstName ? profileErrors.firstName : null}>
                                                <input type="text" name="firstName" value={profileForm.firstName} onChange={handleProfileChange} onBlur={handleProfileBlur} disabled={profileSave === 'saving'} placeholder="John"
                                                       className={`${BI} ${ic(!!profileTouched.firstName, profileTouched.firstName ? !profileErrors.firstName : null)}`} />
                                            </Field>
                                            <Field label="Last Name" error={profileTouched.lastName ? profileErrors.lastName : null}>
                                                <input type="text" name="lastName" value={profileForm.lastName} onChange={handleProfileChange} onBlur={handleProfileBlur} disabled={profileSave === 'saving'} placeholder="Doe"
                                                       className={`${BI} ${ic(!!profileTouched.lastName, profileTouched.lastName ? !profileErrors.lastName : null)}`} />
                                            </Field>
                                        </div>
                                        <Field label="Job Role" error={profileTouched.role ? profileErrors.role : null}>
                                            <select name="role" value={profileForm.role} onChange={handleProfileChange} onBlur={handleProfileBlur} disabled={profileSave === 'saving'}
                                                    className={`${BI} ${ic(!!profileTouched.role, profileTouched.role ? !profileErrors.role : null)}`}>
                                                <option value="">Select a role…</option>
                                                {JOB_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                            </select>
                                        </Field>
                                        {profileErrMsg && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{profileErrMsg}</div>}
                                        <div className="flex items-center justify-end gap-3 pt-1">
                                            {profileSave === 'saved' && <span className="text-sm text-green-600 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
                                            <button onClick={handleProfileSave} disabled={profileSave === 'saving'} className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#152d4a] disabled:opacity-50 transition-colors">
                                                {profileSave === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                {profileSave === 'saving' ? 'Saving…' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                                    <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Account Details</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Read-only information</p>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Account Type</p>
                                                <p className="text-gray-900 dark:text-gray-100 capitalize font-medium">{isAdmin ? 'Administrator' : 'Employee'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Organization</p>
                                                <p className="font-mono text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 inline-block text-gray-900 dark:text-gray-100">{authProfile?.organization_id ?? '—'}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">User ID</p>
                                                <p className="font-mono text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 inline-block truncate max-w-full text-gray-900 dark:text-gray-100">{user?.id ?? '—'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                                    <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                            <History className="w-5 h-5 text-[#1e3a5f]" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Actions logged in this browser</p>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        {getActivityLog().length === 0
                                            ? <p className="text-sm text-gray-500 dark:text-gray-400">No activity yet.</p>
                                            : <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                                {getActivityLog().map(entry => (
                                                    <li key={entry.id} className="text-sm border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                                                        <p className="font-medium text-gray-900 dark:text-gray-100">{entry.action}</p>
                                                        {entry.detail && <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{entry.detail}</p>}
                                                        <p className="text-xs text-gray-400 mt-1">{new Date(entry.at).toLocaleString()}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        }
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'security' && (
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                                <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                        <Lock className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Change Password</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">At least 8 characters with uppercase, lowercase, and a number</p>
                                    </div>
                                </div>
                                <div className="p-6 space-y-5">
                                    {[
                                        { name: 'currentPassword', label: 'Current Password', show: showCurrent, setShow: setShowCurrent },
                                        { name: 'newPassword', label: 'New Password', show: showNew, setShow: setShowNew },
                                        { name: 'confirmPassword', label: 'Confirm New Password', show: showConfirm, setShow: setShowConfirm },
                                    ].map(({ name, label, show, setShow }) => (
                                        <Field key={name} label={label} error={passwordTouched[name] ? passwordErrors[name] : null}>
                                            <div className="relative">
                                                <input type={show ? 'text' : 'password'} name={name}
                                                       value={passwordForm[name as keyof PasswordForm]}
                                                       onChange={handlePasswordChange} onBlur={handlePasswordBlur}
                                                       disabled={passwordSave === 'saving'} placeholder="••••••••"
                                                       className={`${BI} pr-10 ${ic(!!passwordTouched[name], passwordTouched[name] ? !passwordErrors[name] : null)}`}
                                                />
                                                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            {name === 'newPassword' && passwordTouched.newPassword && !passwordErrors.newPassword && (
                                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Strong password</p>
                                            )}
                                            {name === 'confirmPassword' && passwordTouched.confirmPassword && !passwordErrors.confirmPassword && (
                                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Passwords match</p>
                                            )}
                                        </Field>
                                    ))}
                                    {passwordErrMsg && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{passwordErrMsg}</div>}
                                    <div className="flex items-center justify-end gap-3 pt-1">
                                        {passwordSave === 'saved' && <span className="text-sm text-green-600 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Password updated</span>}
                                        <button onClick={handlePasswordSave} disabled={passwordSave === 'saving'} className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#152d4a] disabled:opacity-50 transition-colors">
                                            {passwordSave === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                            {passwordSave === 'saving' ? 'Updating…' : 'Update Password'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </main>
            </div>
            {!isAdmin && (
                <TrainingHistorySidebar
                    attempts={historyAttempts}
                    isOpen={historyOpen}
                    onClose={() => setHistoryOpen(false)}
                    onFeedbackUpdate={() => {}}
                />
            )}
        </div>
    );
}