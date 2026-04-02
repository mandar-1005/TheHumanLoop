import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RoleGuardProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
    requireEmployee?: boolean;
}

export function RoleGuard({ children, requireAdmin = false, requireEmployee = false }: RoleGuardProps) {
    const { isAdmin, loading, profile } = useAuth();

    // Wait for profile to load before deciding
    if (loading || !profile) return null;

    // Admin-only route — non-admins go to their training page
    if (requireAdmin && !isAdmin) {
        return <Navigate to="/my-training" replace />;
    }

    // Employee-only route — admins go to dashboard
    if (requireEmployee && isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}