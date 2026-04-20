import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Shield, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

export function MfaVerifyPage() {
    const navigate = useNavigate();
    const { session, aal, refreshAAL } = useAuth();

    const [verifyCode, setVerifyCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [factorId, setFactorId] = useState<string | null>(null);
    const [loadingFactors, setLoadingFactors] = useState(true);

    useEffect(() => {
        (async () => {
            const { data, error } = await supabase.auth.mfa.listFactors();
            if (error || !data.totp.length) {
                navigate('/login', { replace: true });
                return;
            }
            setFactorId(data.totp[0].id);
            setLoadingFactors(false);
        })();
    }, [navigate]);

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    if (aal && aal.currentLevel === 'aal2') {
        return <Navigate to="/dashboard" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!factorId || !verifyCode.trim()) return;

        setError(null);
        setIsLoading(true);

        try {
            const { data: challengeData, error: challengeError } =
                await supabase.auth.mfa.challenge({ factorId });

            if (challengeError) {
                setError(challengeError.message);
                return;
            }

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challengeData.id,
                code: verifyCode.trim(),
            });

            if (verifyError) {
                setError('Invalid verification code. Please try again.');
                setVerifyCode('');
                return;
            }

            await refreshAAL();

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .single();

            navigate(profile?.role === 'admin' ? '/dashboard' : '/my-training', { replace: true });
        } catch {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (loadingFactors) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 text-[#1e3a5f] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* Left Panel - Branding (matches Login) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f172a] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />

                <div className="relative z-10 flex flex-col justify-center px-16 py-24 text-white">
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                            <Shield className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">MARi</h1>
                            <div className="text-xs text-blue-200 tracking-wider">SECURE TRAINING</div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-4xl font-semibold leading-tight">
                                Two-Factor<br />Verification
                            </h2>
                            <p className="text-blue-200 text-sm">
                                Enter the code from your authenticator app to continue
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-6 pt-8">
                            <div className="space-y-1">
                                <div className="text-3xl font-bold">TOTP</div>
                                <div className="text-sm text-blue-300">Time-Based</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-3xl font-bold">30s</div>
                                <div className="text-sm text-blue-300">Code Refresh</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-3xl font-bold">6</div>
                                <div className="text-sm text-blue-300">Digit Code</div>
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-12 right-12 opacity-10">
                        <Shield className="w-64 h-64" strokeWidth={0.5} />
                    </div>
                </div>
            </div>

            {/* Right Panel - MFA Form */}
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
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                                <Lock className="w-6 h-6 text-[#1e3a5f]" />
                            </div>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                                Two-Factor Authentication
                            </h2>
                            <p className="text-sm text-gray-600">
                                Open your authenticator app and enter the 6-digit verification code to sign in.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Verification Code
                                </label>
                                <input
                                    type="text"
                                    id="mfa-code"
                                    value={verifyCode}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        setVerifyCode(val);
                                        setError(null);
                                    }}
                                    inputMode="numeric"
                                    maxLength={6}
                                    autoComplete="one-time-code"
                                    autoFocus
                                    disabled={isLoading}
                                    placeholder="000000"
                                    className="w-full px-3.5 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500 mt-1.5">
                                    Codes refresh every 30 seconds
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || verifyCode.length !== 6}
                                className="w-full bg-[#1e3a5f] hover:bg-[#152d4a] disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    'Verify & Sign In'
                                )}
                            </button>

                            <div className="relative py-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="bg-white px-2 text-gray-500">Having trouble?</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={async () => {
                                    await supabase.auth.signOut();
                                    navigate('/login', { replace: true });
                                }}
                                className="block w-full text-center border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:ring-offset-2"
                            >
                                Sign in with a different account
                            </button>
                        </form>
                    </div>

                    <div className="mt-8 text-center text-xs text-gray-500">
                        <p>&copy; 2026 MARi Secure Training Portal. FedRAMP Compliant.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
