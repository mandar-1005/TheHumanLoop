import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/Login';
import { RegistrationPage as Register } from './pages/Register';

/**
 * MARi Main Application Entry
 * This setup uses React Router to manage navigation between the
 * Login page and the main application features.
 */

function App() {
    return (
        <Router>
            <Routes>
                {/* Redirect base URL to login for now */}
                <Route path="/" element={<Navigate to="/login" />} />


                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<Register />} />

                {/* Placeholder for future routes:
          <Route path="/dashboard" element={<Dashboard />} />
        */}

                {/* Catch-all route for 404s */}
                <Route path="*" element={<div className="p-10">404 - Page Not Found</div>} />
            </Routes>
        </Router>
    );
}

export default App;