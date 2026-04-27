import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Shield, Lock, AlertCircle, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface FormData {
    email: string;
    password: string;
    rememberMe: boolean;
}

interface ValidationState {
    [key: string]: { isValid: boolean; message: string } | null;
}

export function LoginPage() {
    const navigate = useNavigate();

    const { session } = useAuth();


    const [formData, setFormData] = useState<FormData>({
        email: '',
        password: '',
        rememberMe: false,
    });

    const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
    const [validationState, setValidationState] = useState<ValidationState>({});
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [showPolicy, setShowPolicy] = useState<'privacy' | 'terms' | null>(null);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [resetError, setResetError] = useState('');

    const handleForgotPassword = async () => {
        if (!resetEmail.trim()) { setResetError('Please enter your email address.'); return; }
        setResetStatus('sending');
        setResetError('');
        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
            redirectTo: `${window.location.origin}/settings`,
        });
        if (error) {
            setResetStatus('error');
            setResetError(error.message);
        } else {
            setResetStatus('sent');
        }
    };

    const { isAdmin } = useAuth();

    if (session) {
        return <Navigate to={isAdmin ? '/dashboard' : '/my-training'} replace />;
    }
    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(email);

        if (!email) return { isValid: false, message: 'Email is required' };
        if (!isValid) return { isValid: false, message: 'Invalid email format' };
        return { isValid: true, message: '' };
    };

    const validatePassword = (password: string) => {
        if (!password) return { isValid: false, message: 'Password is required' };
        return { isValid: true, message: '' };
    };

    const validateField = (name: string, value: string) => {
        switch (name) {
            case 'email':
                return validateEmail(value);
            case 'password':
                return validatePassword(value);
            default:
                return null;
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        const newValue = type === 'checkbox' ? e.target.checked : value;

        setFormData(prev => ({ ...prev, [name]: newValue }));
        setAuthError(null); // clear server error on input change

        if (touched[name]) {
            const validation = validateField(name, value);
            setValidationState(prev => ({ ...prev, [name]: validation }));
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        const validation = validateField(name, value);
        setValidationState(prev => ({ ...prev, [name]: validation }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);

        // Validate all fields
        const allTouched: { [key: string]: boolean } = {};
        const allValidations: ValidationState = {};

        Object.keys(formData).forEach(key => {
            allTouched[key] = true;
            if (key !== 'rememberMe') {
                allValidations[key] = validateField(key, formData[key as keyof FormData] as string);
            }
        });

        setTouched(allTouched);
        setValidationState(allValidations);

        const isValid = Object.values(allValidations).every(v => v?.isValid !== false);
        if (!isValid) return;

        setIsLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (error) {
                const isInvalidCredentials =
                    error.message.toLowerCase().includes('invalid') ||
                    error.message.toLowerCase().includes('credentials') ||
                    error.status === 400;
                setAuthError(
                    isInvalidCredentials
                        ? 'Invalid email or password. Please check your credentials and try again.'
                        : 'An error occurred. Please try again.'
                );
                return;
            }

            // Redirect based on role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .single();

            if (profile?.role === 'admin') {
                navigate('/dashboard');
            } else {
                navigate('/my-training');
            }
        } catch (err) {
            setAuthError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f172a] relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />

                <div className="relative z-10 flex flex-col justify-center px-16 py-24 text-white">
                    {/* Logo placeholder */}
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                            <Shield className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">MARi</h1>
                            <div className="text-xs text-blue-200 tracking-wider">SECURE TRAINING</div>
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-4xl font-semibold leading-tight">
                                Welcome Back to<br />Secure Training
                            </h2>
                            <p className="text-blue-200 text-sm">
                                Access your FedRAMP compliance training dashboard
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-6 pt-8">
                            <div className="space-y-1">
                                <div className="text-3xl font-bold">99.9%</div>
                                <div className="text-sm text-blue-300">Uptime SLA</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-3xl font-bold">24/7</div>
                                <div className="text-sm text-blue-300">Support</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-3xl font-bold">SOC 2</div>
                                <div className="text-sm text-blue-300">Certified</div>
                            </div>
                        </div>
                    </div>

                    {/* Shield illustration */}
                    <div className="absolute bottom-12 right-12 opacity-10">
                        <Shield className="w-64 h-64" strokeWidth={0.5} />
                    </div>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">MARi Secure Training</h1>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                        <div className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Sign In</h2>
                            <p className="text-sm text-gray-600">
                                Access your compliance training portal
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Auth Error Banner */}
                            {authError && (
                                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{authError}</span>
                                </div>
                            )}

                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Work Email
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        disabled={isLoading}
                                        className={`w-full px-3.5 py-2.5 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                                            touched.email && validationState.email
                                                ? validationState.email.isValid
                                                    ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500'
                                                    : 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                                                : 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'
                                        }`}
                                        placeholder="john.doe@company.com"
                                    />
                                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                </div>
                                {touched.email && validationState.email && !validationState.email.isValid && (
                                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {validationState.email.message}
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => { setShowForgotPassword(true); setResetEmail(formData.email); setResetStatus('idle'); setResetError(''); }}
                                        className="text-xs text-[#1e3a5f] hover:text-[#152d4a] font-medium hover:underline"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        disabled={isLoading}
                                        className={`w-full px-3.5 py-2.5 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                                            touched.password && validationState.password
                                                ? validationState.password.isValid
                                                    ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500'
                                                    : 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                                                : 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'
                                        }`}
                                        placeholder="••••••••"
                                    />
                                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                </div>
                                {touched.password && validationState.password && !validationState.password.isValid && (
                                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        {validationState.password.message}
                                    </p>
                                )}
                            </div>

                            {/* Remember Me */}
                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="rememberMe"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleChange}
                                    disabled={isLoading}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0 cursor-pointer disabled:cursor-not-allowed"
                                />
                                <label htmlFor="rememberMe" className="text-sm text-gray-700 cursor-pointer select-none">
                                    Remember me for 30 days
                                </label>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[#1e3a5f] hover:bg-[#152d4a] disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Signing In...
                                    </>
                                ) : (
                                    'Sign In Securely'
                                )}
                            </button>

                            {/* Divider */}
                            <div className="relative py-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="bg-white px-2 text-gray-500">New to MARi?</span>
                                </div>
                            </div>

                            {/* Register link */}
                            <Link
                                to="/register"
                                className="block w-full text-center border border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white py-3 rounded-lg font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
                            >
                                Create Secure Account
                            </Link>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center text-xs text-gray-500">
                        <p>© 2026 MARi Secure Training Portal. FedRAMP Compliant.</p>
                        <div className="mt-2 space-x-4">
                            <button onClick={() => setShowPolicy('privacy')} className="hover:text-gray-700 hover:underline">Privacy Policy</button>
                            <button onClick={() => setShowPolicy('terms')} className="hover:text-gray-700 hover:underline">Terms of Service</button>
                        </div>
                    </div>
                </div>
            </div>
            {/* Policy Modal */}
            {showPolicy && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-white rounded-xl shadow-xl p-6 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {showPolicy === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                            </h3>
                            <button onClick={() => setShowPolicy(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                        </div>
                        <div className="overflow-y-auto text-sm text-gray-600 space-y-3 flex-1">
                            {showPolicy === 'privacy' ? (
                                <>
                                    <p><strong>Last Updated:</strong> January 1, 2026</p>
                                    <p>MARi Secure Training Platform ("Platform") is committed to protecting your privacy and ensuring the security of your personal information in compliance with FedRAMP requirements.</p>
                                    <p><strong>Data Collection:</strong> We collect only the information necessary to provide secure training services, including your name, email address, organizational role, and training completion records.</p>
                                    <p><strong>Data Usage:</strong> Your data is used exclusively for training delivery, progress tracking, compliance reporting, and platform improvement. We do not sell or share your data with third parties.</p>
                                    <p><strong>Data Security:</strong> All data is encrypted in transit and at rest. Access is controlled through role-based permissions in accordance with FedRAMP security standards.</p>
                                    <p><strong>Data Retention:</strong> Training records are retained for the duration required by your organization's compliance obligations. You may request data deletion by contacting your organization administrator.</p>
                                    <p><strong>Contact:</strong> For privacy inquiries, contact your organization's security administrator or email privacy@mari-platform.com.</p>
                                </>
                            ) : (
                                <>
                                    <p><strong>Last Updated:</strong> January 1, 2026</p>
                                    <p>By accessing and using the MARi Secure Training Platform, you agree to be bound by these Terms of Service.</p>
                                    <p><strong>Acceptable Use:</strong> You agree to use the Platform solely for authorized security training and compliance activities. You will not attempt to circumvent security controls, share credentials, or misuse training content.</p>
                                    <p><strong>Account Responsibility:</strong> You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
                                    <p><strong>Training Content:</strong> All training materials are proprietary and protected by copyright. You may not reproduce, distribute, or modify training content without authorization.</p>
                                    <p><strong>Compliance:</strong> Users must comply with all applicable federal regulations, organizational policies, and FedRAMP requirements while using the Platform.</p>
                                    <p><strong>Termination:</strong> Access may be suspended or terminated for violations of these terms or at the discretion of your organization administrator.</p>
                                </>
                            )}
                        </div>
                        <button onClick={() => setShowPolicy(null)} className="w-full mt-4 px-4 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#152d4a]">Close</button>
                    </div>
                </div>
            )}

            {/* Forgot Password Modal */}
            {showForgotPassword && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Mail className="w-5 h-5 text-[#1e3a5f]" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
                                <p className="text-xs text-gray-500">We'll send you a reset link</p>
                            </div>
                        </div>

                        {resetStatus === 'sent' ? (
                            <div className="text-center py-4">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Mail className="w-6 h-6 text-green-600" />
                                </div>
                                <p className="text-sm font-medium text-gray-900 mb-1">Check your email</p>
                                <p className="text-xs text-gray-500 mb-4">We've sent a password reset link to <strong>{resetEmail}</strong></p>
                                <button
                                    onClick={() => setShowForgotPassword(false)}
                                    className="w-full px-4 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#152d4a]"
                                >
                                    Back to Login
                                </button>
                            </div>
                        ) : (
                            <>
                                <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={e => { setResetEmail(e.target.value); setResetError(''); }}
                                    placeholder="Enter your email address"
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#1e3a5f] mb-3"
                                />
                                {resetError && (
                                    <div className="flex items-center gap-2 text-red-600 text-xs mb-3">
                                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                        {resetError}
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowForgotPassword(false)}
                                        className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleForgotPassword}
                                        disabled={resetStatus === 'sending'}
                                        className="flex-1 px-4 py-2.5 bg-[#1e3a5f] text-white text-sm font-medium rounded-lg hover:bg-[#152d4a] disabled:opacity-50"
                                    >
                                        {resetStatus === 'sending' ? 'Sending...' : 'Send Reset Link'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}