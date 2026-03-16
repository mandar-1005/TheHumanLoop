import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/Login';
import { RegistrationPage as Register } from './pages/Register';
import { AccountPage } from './pages/Account';
import { Dashboard } from './pages/Dashboard';

/**
 * MARi Main Application Entry
 * This setup uses React Router to manage navigation between the
 * Login page and the main application features.
 */

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Redirect base URL to login */}
                    <Route path="/" element={<Navigate to="/login" replace />} />

                    {/* Public routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<Register />} />

                    {/* Protected routes */}
                    <Route path="/account" element={
                        <ProtectedRoute>
                            <AccountPage />
                        </ProtectedRoute>
                    } />
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    } />

                    {/* Catch-all route for 404s */}
                    <Route path="*" element={<div className="p-10">404 - Page Not Found</div>} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;