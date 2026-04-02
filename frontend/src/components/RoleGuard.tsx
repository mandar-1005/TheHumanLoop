import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RoleGuardProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

export function RoleGuard({ children, requireAdmin = false }: RoleGuardProps) {
    const { isAdmin, loading, profile } = useAuth();

    // Wait for profile to load before deciding
    if (loading || !profile) return null;

    if (requireAdmin && !isAdmin) {
        return <Navigate to="/my-training" replace />;
    }

    return <>{children}</>;
}