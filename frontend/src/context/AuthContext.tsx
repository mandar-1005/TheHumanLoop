import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User, AuthenticatorAssuranceLevels } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface Profile {
    first_name: string;
    last_name: string;
    role: string;
    organization_id: string;
}

interface AALInfo {
    currentLevel: AuthenticatorAssuranceLevels;
    nextLevel: AuthenticatorAssuranceLevels;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    role: string | null;
    isAdmin: boolean;
    loading: boolean;
    aal: AALInfo | null;
    refreshAAL: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    role: null,
    isAdmin: false,
    loading: true,
    aal: null,
    refreshAAL: async () => {},
    signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [aal, setAAL] = useState<AALInfo | null>(null);

    const fetchProfile = async (userId: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('first_name, last_name, role, organization_id')
            .eq('id', userId)
            .single();
        if (data) setProfile(data);
    };

    const refreshAAL = useCallback(async () => {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (!error && data) {
            setAAL({ currentLevel: data.currentLevel, nextLevel: data.nextLevel });
        } else {
            setAAL(null);
        }
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session }, error }) => {
            if (error) {
                await supabase.auth.signOut();
                setSession(null);
                setProfile(null);
                setAAL(null);
                setLoading(false);
                return;
            }
            setSession(session);
            if (session?.user) {
                await fetchProfile(session.user.id);
                await refreshAAL();
            }
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'TOKEN_REFRESHED' && !session) {
                setSession(null);
                setProfile(null);
                setAAL(null);
                return;
            }
            setSession(session);
            if (session?.user) {
                fetchProfile(session.user.id);
                await refreshAAL();
            } else {
                setProfile(null);
                setAAL(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setAAL(null);
    };

    const role = profile?.role ?? null;
    const isAdmin = role === 'admin';

    return (
        <AuthContext.Provider value={{
            session,
            user: session?.user ?? null,
            profile,
            role,
            isAdmin,
            loading,
            aal,
            refreshAAL,
            signOut,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);