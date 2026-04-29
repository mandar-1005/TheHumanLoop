import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProfileDropdownProps {
    displayName: string;
    role?: string;
    initials: string;
}

export function ProfileDropdown({ displayName, role, initials }: ProfileDropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { signOut } = useAuth();

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2.5 pl-4 border-l border-gray-200 dark:border-gray-700 hover:opacity-80 transition-opacity"
            >
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{displayName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{role ?? ''}</p>
                </div>
                <div className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white font-medium uppercase flex-shrink-0">
                    {initials}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-14 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                        {/* User info header */}
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white text-sm font-medium uppercase flex-shrink-0">
                                    {initials}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{displayName}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">{role}</p>
                                </div>
                            </div>
                        </div>

                        {/* Menu items */}
                        <div className="py-1">
                            <button
                                onClick={() => { setOpen(false); navigate('/settings?tab=profile'); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <User className="w-4 h-4 text-gray-400" />
                                Edit Profile
                            </button>
                            <button
                                onClick={() => { setOpen(false); navigate('/settings'); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <Settings className="w-4 h-4 text-gray-400" />
                                Settings
                            </button>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-800 py-1">
                            <button
                                onClick={() => { setOpen(false); signOut(); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}