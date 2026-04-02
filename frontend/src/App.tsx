import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleGuard } from './components/RoleGuard';
import { LoginPage } from './pages/Login';
import { RegistrationPage as Register } from './pages/Register';
import { AccountPage } from './pages/Account';
import { Dashboard } from './pages/Dashboard';
import { TrainingModulesPage } from './pages/TrainingModules';
import { SSPDocumentsPage } from './pages/SSPDocuments';
import { MyTrainingPage } from './pages/MyTraining';
import { RolesAssessmentsPage } from './pages/RoleAssessments';




function App() {
    return (
        <AuthProvider>
            <Router>
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
                    <Route path="/account" element={
                        <ProtectedRoute><RoleGuard requireAdmin><AccountPage /></RoleGuard></ProtectedRoute>
                    } />
                    <Route path="/roles" element={
                        <ProtectedRoute><RoleGuard requireAdmin><RolesAssessmentsPage /></RoleGuard></ProtectedRoute>
                    } />

                    {/* Employee */}
                    <Route path="/my-training" element={
                        <ProtectedRoute><MyTrainingPage /></ProtectedRoute>
                    } />

                    <Route path="*" element={<div className="p-10">404 - Page Not Found</div>} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;