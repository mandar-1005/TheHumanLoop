import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CommandPalette } from './components/CommandPalette';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleGuard } from './components/RoleGuard';
import { LoginPage } from './pages/Login';
import { RegistrationPage as Register } from './pages/Register';

import { Dashboard } from './pages/Dashboard';
import { TrainingModulesPage } from './pages/TrainingModules';
import { SSPDocumentsPage } from './pages/SSPDocuments';
import { MyTrainingPage } from './pages/MyTraining';
import { RolesAssessmentsPage } from './pages/RoleAssessments';
import { SettingsPage } from './pages/Settings';
import { MyAnalyticsPage } from './pages/MyAnalytics';
import { ProgressDashboardPage } from './pages/ProgressDashboard';

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <Router>
                    <CommandPalette />
                    <Routes>
                        <Route path="/" element={<Navigate to="/login" replace />} />

                        {/* Public */}
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<Register />} />

                        {/* Admin-only */}
                        <Route path="/dashboard" element={
                            <ProtectedRoute><RoleGuard requireAdmin><Dashboard /></RoleGuard></ProtectedRoute>
                        } />
                        <Route path="/training-modules" element={
                            <ProtectedRoute><RoleGuard requireAdmin><TrainingModulesPage /></RoleGuard></ProtectedRoute>
                        } />
                        <Route path="/ssp-documents" element={
                            <ProtectedRoute><RoleGuard requireAdmin><SSPDocumentsPage /></RoleGuard></ProtectedRoute>
                        } />
                        <Route path="/account" element={<Navigate to="/settings" replace />} />
                        <Route path="/roles" element={
                            <ProtectedRoute><RoleGuard requireAdmin><RolesAssessmentsPage /></RoleGuard></ProtectedRoute>
                        } />
                        <Route path="/progress" element={
                            <ProtectedRoute><RoleGuard requireAdmin><ProgressDashboardPage /></RoleGuard></ProtectedRoute>
                        } />

                        {/* Employee-only */}
                        <Route path="/my-training" element={
                            <ProtectedRoute>
                                <RoleGuard requireAdmin={false} redirectAdminTo="/dashboard">
                                    <MyTrainingPage />
                                </RoleGuard>
                            </ProtectedRoute>
                        } />
                        <Route path="/my-analytics" element={
                            <ProtectedRoute>
                                <RoleGuard requireAdmin={false} redirectAdminTo="/progress">
                                    <MyAnalyticsPage />
                                </RoleGuard>
                            </ProtectedRoute>
                        } />

                        {/* All authenticated users */}
                        <Route path="/settings" element={
                            <ProtectedRoute><SettingsPage /></ProtectedRoute>
                        } />

                        <Route path="*" element={<div className="p-10">404 - Page Not Found</div>} />
                    </Routes>
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;