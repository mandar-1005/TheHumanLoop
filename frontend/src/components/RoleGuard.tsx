import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RoleGuardProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
    redirectAdminTo?: string; // where to send admins if they hit an employee-only route
}

export function RoleGuard({
                              children,
                              requireAdmin = false,
                              redirectAdminTo = '/dashboard',
                          }: RoleGuardProps) {
    const { isAdmin, loading, profile } = useAuth();

    // Wait for profile to load before deciding
    if (loading || !profile) return null;

    // Admin trying to access an admin-only route — allow
    // Non-admin trying to access an admin-only route — send to my-training
    if (requireAdmin && !isAdmin) {
        return <Navigate to="/my-training" replace />;
    }

    // Admin trying to access an employee-only route — redirect them away
    if (!requireAdmin && isAdmin) {
        return <Navigate to={redirectAdminTo} replace />;
    }

    return <>{children}</>;
}