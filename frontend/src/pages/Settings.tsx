import { useEffect, useState } from 'react';
import {
    LayoutDashboard, BookOpen, FileText, Users,
    BarChart3, Settings, Shield, LogOut,
    User, Lock, CheckCircle2, AlertCircle,
    Loader2, Save, Eye, EyeOff, History,
} from 'lucide-react';
import { getActivityLog } from '../lib/activityLog';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProfileForm {
    firstName: string;
    lastName: string;
    role: string;
}

interface PasswordForm {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// ─── Sidebar ─────────────────────────────────────────────────────────────────

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
    const current = '/settings';

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

// ─── Field component ─────────────────────────────────────────────────────────

function Field({
                   label,
                   error,
                   hint,
                   children,
               }: {
    label: string;
    error?: string | null;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
            {children}
            {hint && !error && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
            {error && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </p>
            )}
        </div>
    );
}

function inputClass(touched: boolean, valid: boolean | null) {
    if (!touched || valid === null)
        return 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-500';
    return valid
        ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500'
        : 'border-red-300 focus:ring-red-500/20 focus:border-red-500';
}

const BASE_INPUT = 'w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all disabled:opacity-60 disabled:bg-gray-50';

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SettingsPage() {
    const { user, profile: authProfile, isAdmin } = useAuth();


    // ── Profile section ──
    const [profileForm, setProfileForm] = useState<ProfileForm>({
        firstName: '',
        lastName: '',
        role: '',
    });
    const [profileTouched, setProfileTouched] = useState<Record<string, boolean>>({});
    const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
    const [profileSave, setProfileSave] = useState<SaveState>('idle');
    const [profileErrMsg, setProfileErrMsg] = useState<string | null>(null);

    // ── Password section ──
    const [passwordForm, setPasswordForm] = useState<PasswordForm>({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordTouched, setPasswordTouched] = useState<Record<string, boolean>>({});
    const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
    const [passwordSave, setPasswordSave] = useState<SaveState>('idle');
    const [passwordErrMsg, setPasswordErrMsg] = useState<string | null>(null);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Hydrate form from auth profile
    useEffect(() => {
        if (authProfile) {
            setProfileForm({
                firstName: authProfile.first_name ?? '',
                lastName: authProfile.last_name ?? '',
                role: authProfile.role ?? '',
            });
        }
    }, [authProfile]);

    // ── Profile validation ──
    const validateProfileField = (name: string, value: string): string => {
        if (name === 'firstName' && !value.trim()) return 'First name is required';
        if (name === 'lastName' && !value.trim()) return 'Last name is required';
        if (name === 'role' && !value.trim()) return 'Role is required';
        return '';
    };

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfileForm(p => ({ ...p, [name]: value }));
        setProfileSave('idle');
        if (profileTouched[name]) {
            setProfileErrors(p => ({ ...p, [name]: validateProfileField(name, value) }));
        }
    };

    const handleProfileBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProfileTouched(p => ({ ...p, [name]: true }));
        setProfileErrors(p => ({ ...p, [name]: validateProfileField(name, value) }));
    };

    const handleProfileSave = async () => {
        // Touch all fields
        const allTouched = { firstName: true, lastName: true, role: true };
        const allErrors = {
            firstName: validateProfileField('firstName', profileForm.firstName),
            lastName: validateProfileField('lastName', profileForm.lastName),
            role: validateProfileField('role', profileForm.role),
        };
        setProfileTouched(allTouched);
        setProfileErrors(allErrors);
        if (Object.values(allErrors).some(e => e)) return;

        setProfileSave('saving');
        setProfileErrMsg(null);

        const { error } = await supabase
            .from('profiles')
            .update({
                first_name: profileForm.firstName.trim(),
                last_name: profileForm.lastName.trim(),
                role: profileForm.role,
            })
            .eq('id', user!.id);

        if (error) {
            setProfileSave('error');
            setProfileErrMsg(error.message);
        } else {
            setProfileSave('saved');
            setTimeout(() => setProfileSave('idle'), 2500);
        }
    };

    // ── Password validation ──
    const validatePassword = (password: string): string => {
        if (!password) return 'Password is required';
        if (password.length < 8) return 'Minimum 8 characters';
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
            return 'Must contain uppercase, lowercase, and number';
        return '';
    };

    const validatePasswordField = (name: string, value: string): string => {
        if (name === 'currentPassword' && !value) return 'Current password is required';
        if (name === 'newPassword') return validatePassword(value);
        if (name === 'confirmPassword') {
            if (!value) return 'Please confirm your password';
            if (value !== passwordForm.newPassword) return 'Passwords do not match';
        }
        return '';
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordForm(p => ({ ...p, [name]: value }));
        setPasswordSave('idle');
        if (passwordTouched[name]) {
            setPasswordErrors(p => ({ ...p, [name]: validatePasswordField(name, value) }));
        }
    };

    const handlePasswordBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordTouched(p => ({ ...p, [name]: true }));
        setPasswordErrors(p => ({ ...p, [name]: validatePasswordField(name, value) }));
    };

    const handlePasswordSave = async () => {
        const allTouched = { currentPassword: true, newPassword: true, confirmPassword: true };
        const allErrors = {
            currentPassword: validatePasswordField('currentPassword', passwordForm.currentPassword),
            newPassword: validatePasswordField('newPassword', passwordForm.newPassword),
            confirmPassword: validatePasswordField('confirmPassword', passwordForm.confirmPassword),
        };
        setPasswordTouched(allTouched);
        setPasswordErrors(allErrors);
        if (Object.values(allErrors).some(e => e)) return;

        setPasswordSave('saving');
        setPasswordErrMsg(null);

        // Re-authenticate then update password
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user!.email!,
            password: passwordForm.currentPassword,
        });

        if (signInError) {
            setPasswordSave('error');
            setPasswordErrMsg('Current password is incorrect.');
            return;
        }

        const { error: updateError } = await supabase.auth.updateUser({
            password: passwordForm.newPassword,
        });

        if (updateError) {
            setPasswordSave('error');
            setPasswordErrMsg(updateError.message);
        } else {
            setPasswordSave('saved');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordTouched({});
            setTimeout(() => setPasswordSave('idle'), 2500);
        }
    };

    const displayName = authProfile
        ? `${authProfile.first_name} ${authProfile.last_name}`
        : user?.email ?? 'User';

    const initials = authProfile
        ? `${authProfile.first_name?.[0] ?? ''}${authProfile.last_name?.[0] ?? ''}`.toUpperCase()
        : '?';

    const JOB_ROLES = [
        { value: 'developer', label: 'Developer' },
        { value: 'security-lead', label: 'Security Lead' },
        { value: 'team-lead', label: 'Team Lead' },
        { value: 'compliance-officer', label: 'Compliance Officer' },
        { value: 'employee', label: 'Employee' },
        ...(isAdmin ? [{ value: 'admin', label: 'Admin' }] : []),
    ];

    return (
        <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            <Sidebar />
            <div className="ml-64">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                    <div className="px-8 py-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
                            <p className="text-sm text-gray-600 mt-1">Manage your account and preferences</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{displayName}</p>
                                <p className="text-xs text-gray-600 capitalize">{authProfile?.role ?? ''}</p>
                            </div>
                            <div className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white font-medium uppercase">
                                {initials}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="p-8 max-w-2xl space-y-6">

                    {/* ── Profile card ── */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                                <User className="w-5 h-5 text-[#1e3a5f]" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">Personal Information</h3>
                                <p className="text-xs text-gray-500">Update your name and job role</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Avatar row */}
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white text-xl font-semibold uppercase flex-shrink-0">
                                    {initials}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{displayName}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
                                    <p className="text-xs text-gray-400 mt-0.5 capitalize">
                                        {authProfile?.organization_id
                                            ? `Organization: ${authProfile.organization_id}`
                                            : ''}
                                    </p>
                                </div>
                            </div>

                            {/* Name row */}
                            <div className="grid grid-cols-2 gap-4">
                                <Field
                                    label="First Name"
                                    error={profileTouched.firstName ? profileErrors.firstName : null}
                                >
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={profileForm.firstName}
                                        onChange={handleProfileChange}
                                        onBlur={handleProfileBlur}
                                        disabled={profileSave === 'saving'}
                                        placeholder="John"
                                        className={`${BASE_INPUT} ${inputClass(
                                            !!profileTouched.firstName,
                                            profileTouched.firstName
                                                ? !profileErrors.firstName
                                                : null
                                        )}`}
                                    />
                                </Field>

                                <Field
                                    label="Last Name"
                                    error={profileTouched.lastName ? profileErrors.lastName : null}
                                >
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={profileForm.lastName}
                                        onChange={handleProfileChange}
                                        onBlur={handleProfileBlur}
                                        disabled={profileSave === 'saving'}
                                        placeholder="Doe"
                                        className={`${BASE_INPUT} ${inputClass(
                                            !!profileTouched.lastName,
                                            profileTouched.lastName
                                                ? !profileErrors.lastName
                                                : null
                                        )}`}
                                    />
                                </Field>
                            </div>

                            {/* Email — read only */}
                            <Field label="Work Email">
                                <input
                                    type="email"
                                    value={user?.email ?? ''}
                                    disabled
                                    className={`${BASE_INPUT} border-gray-300 cursor-not-allowed`}
                                />
                            </Field>

                            {/* Role */}
                            <Field
                                label="Job Role"
                                error={profileTouched.role ? profileErrors.role : null}
                            >
                                <select
                                    name="role"
                                    value={profileForm.role}
                                    onChange={handleProfileChange}
                                    onBlur={handleProfileBlur}
                                    disabled={profileSave === 'saving'}
                                    className={`${BASE_INPUT} ${inputClass(
                                        !!profileTouched.role,
                                        profileTouched.role ? !profileErrors.role : null
                                    )}`}
                                >
                                    <option value="">Select your role</option>
                                    {JOB_ROLES.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </Field>

                            {/* Save button */}
                            {profileErrMsg && (
                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {profileErrMsg}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-1">
                                {profileSave === 'saved' && (
                                    <span className="text-sm text-green-600 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4" /> Profile saved
                                    </span>
                                )}
                                <button
                                    onClick={handleProfileSave}
                                    disabled={profileSave === 'saving'}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#152d4a] disabled:opacity-50 transition-colors"
                                >
                                    {profileSave === 'saving'
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <Save className="w-4 h-4" />
                                    }
                                    {profileSave === 'saving' ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Password card ── */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Lock className="w-5 h-5 text-[#1e3a5f]" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">Change Password</h3>
                                <p className="text-xs text-gray-500">Must be at least 8 characters with uppercase, lowercase, and a number</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Current password */}
                            <Field
                                label="Current Password"
                                error={passwordTouched.currentPassword ? passwordErrors.currentPassword : null}
                            >
                                <div className="relative">
                                    <input
                                        type={showCurrent ? 'text' : 'password'}
                                        name="currentPassword"
                                        value={passwordForm.currentPassword}
                                        onChange={handlePasswordChange}
                                        onBlur={handlePasswordBlur}
                                        disabled={passwordSave === 'saving'}
                                        placeholder="••••••••"
                                        className={`${BASE_INPUT} pr-10 ${inputClass(
                                            !!passwordTouched.currentPassword,
                                            passwordTouched.currentPassword
                                                ? !passwordErrors.currentPassword
                                                : null
                                        )}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrent(s => !s)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </Field>

                            {/* New password */}
                            <Field
                                label="New Password"
                                error={passwordTouched.newPassword ? passwordErrors.newPassword : null}
                            >
                                <div className="relative">
                                    <input
                                        type={showNew ? 'text' : 'password'}
                                        name="newPassword"
                                        value={passwordForm.newPassword}
                                        onChange={handlePasswordChange}
                                        onBlur={handlePasswordBlur}
                                        disabled={passwordSave === 'saving'}
                                        placeholder="••••••••"
                                        className={`${BASE_INPUT} pr-10 ${inputClass(
                                            !!passwordTouched.newPassword,
                                            passwordTouched.newPassword
                                                ? !passwordErrors.newPassword
                                                : null
                                        )}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNew(s => !s)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {passwordTouched.newPassword && !passwordErrors.newPassword && (
                                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Strong password
                                    </p>
                                )}
                            </Field>

                            {/* Confirm password */}
                            <Field
                                label="Confirm New Password"
                                error={passwordTouched.confirmPassword ? passwordErrors.confirmPassword : null}
                            >
                                <div className="relative">
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={passwordForm.confirmPassword}
                                        onChange={handlePasswordChange}
                                        onBlur={handlePasswordBlur}
                                        disabled={passwordSave === 'saving'}
                                        placeholder="••••••••"
                                        className={`${BASE_INPUT} pr-10 ${inputClass(
                                            !!passwordTouched.confirmPassword,
                                            passwordTouched.confirmPassword
                                                ? !passwordErrors.confirmPassword
                                                : null
                                        )}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(s => !s)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {passwordTouched.confirmPassword && !passwordErrors.confirmPassword && (
                                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Passwords match
                                    </p>
                                )}
                            </Field>

                            {/* Error banner */}
                            {passwordErrMsg && (
                                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {passwordErrMsg}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-1">
                                {passwordSave === 'saved' && (
                                    <span className="text-sm text-green-600 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4" /> Password updated
                                    </span>
                                )}
                                <button
                                    onClick={handlePasswordSave}
                                    disabled={passwordSave === 'saving'}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#152d4a] disabled:opacity-50 transition-colors"
                                >
                                    {passwordSave === 'saving'
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <Lock className="w-4 h-4" />
                                    }
                                    {passwordSave === 'saving' ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Account info card ── */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-200">
                            <h3 className="text-base font-semibold text-gray-900">Account Details</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Read-only information about your account</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Account Type</p>
                                    <p className="text-gray-900 capitalize font-medium">
                                        {isAdmin ? 'Administrator' : 'Employee'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Organization ID</p>
                                    <p className="text-gray-900 font-mono text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 inline-block">
                                        {authProfile?.organization_id ?? '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">User ID</p>
                                    <p className="text-gray-900 font-mono text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 inline-block truncate max-w-full">
                                        {user?.id ?? '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Platform</p>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        FedRAMP Compliant
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Recent activity (client-side) ── */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
                                <History className="w-5 h-5 text-[#1e3a5f]" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">Recent activity</h3>
                                <p className="text-xs text-gray-500">
                                    Actions logged in this browser for awareness (not a substitute for a full server audit log).
                                </p>
                            </div>
                        </div>
                        <div className="p-6">
                            {getActivityLog().length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    No activity yet. Complete a training, export analytics CSV, or use other actions to populate this list.
                                </p>
                            ) : (
                                <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                    {getActivityLog().map(entry => (
                                        <li key={entry.id} className="text-sm border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                            <p className="font-medium text-gray-900">{entry.action}</p>
                                            {entry.detail && <p className="text-xs text-gray-600 mt-0.5">{entry.detail}</p>}
                                            <p className="text-xs text-gray-400 mt-1">
                                                {new Date(entry.at).toLocaleString()}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
}