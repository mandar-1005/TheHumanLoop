import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  role: string;
  password: string;
  confirmPassword: string;
  acknowledgement: boolean;
}

interface ValidationState {
  [key: string]: { isValid: boolean; message: string } | null;
}

export function RegistrationPage() {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    role: '',
    password: '',
    confirmPassword: '',
    acknowledgement: false,
  });

  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [validationState, setValidationState] = useState<ValidationState>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    const isCompanyEmail = !email.match(/@(gmail|yahoo|hotmail|outlook)\.com$/i);
    
    if (!email) return { isValid: false, message: 'Email is required' };
    if (!isValid) return { isValid: false, message: 'Invalid email format' };
    if (!isCompanyEmail) return { isValid: false, message: 'Please use a company email' };
    return { isValid: true, message: '' };
  };

  const validatePassword = (password: string) => {
    if (!password) return { isValid: false, message: 'Password is required' };
    if (password.length < 8) return { isValid: false, message: 'Minimum 8 characters' };
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { isValid: false, message: 'Must contain uppercase, lowercase, and number' };
    }
    return { isValid: true, message: 'Strong password' };
  };

  const validateConfirmPassword = (confirmPassword: string, password: string) => {
    if (!confirmPassword) return { isValid: false, message: 'Please confirm password' };
    if (confirmPassword !== password) return { isValid: false, message: 'Passwords do not match' };
    return { isValid: true, message: 'Passwords match' };
  };

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'firstName':
        return value.length > 0 ? { isValid: true, message: '' } : { isValid: false, message: 'First name is required' };
      case 'lastName':
        return value.length > 0 ? { isValid: true, message: '' } : { isValid: false, message: 'Last name is required' };
      case 'email':
        return validateEmail(value);
      case 'organization':
        return value.length > 0 ? { isValid: true, message: '' } : { isValid: false, message: 'Organization is required' };
      case 'role':
        return value.length > 0 ? { isValid: true, message: '' } : { isValid: false, message: 'Role is required' };
      case 'password':
        return validatePassword(value);
      case 'confirmPassword':
        return validateConfirmPassword(value, formData.password);
      default:
        return null;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({ ...prev, [name]: newValue }));

    if (touched[name]) {
      const validation = validateField(name, value);
      setValidationState(prev => ({ ...prev, [name]: validation }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const validation = validateField(name, value);
    setValidationState(prev => ({ ...prev, [name]: validation }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const allTouched: { [key: string]: boolean } = {};
    const allValidations: ValidationState = {};
    
    Object.keys(formData).forEach(key => {
      allTouched[key] = true;
      if (key !== 'acknowledgement') {
        allValidations[key] = validateField(key, formData[key as keyof FormData] as string);
      }
    });
    
    setTouched(allTouched);
    setValidationState(allValidations);
    
    const isValid = Object.values(allValidations).every(v => v?.isValid !== false) && formData.acknowledgement;
    
    if (isValid) {
      console.log('Form submitted:', formData);
      alert('Registration successful! (Demo)');
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f172a] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-center px-16 py-24 text-white">
          {/* Logo placeholder */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">MARi</h1>
              <div className="text-xs text-blue-200 tracking-wider">SECURE TRAINING</div>
            </div>
          </div>

          {/* Main content */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-4xl font-semibold leading-tight">
                Role-Based FedRAMP<br />Compliance Training
              </h2>
              <p className="text-blue-200 text-sm">
                Built for SSP-driven security awareness
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4 pt-8">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Federal Compliance Standards</p>
                  <p className="text-sm text-blue-300">FedRAMP authorized training modules</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Role-Based Access Control</p>
                  <p className="text-sm text-blue-300">Tailored content for your team role</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Enterprise-Grade Security</p>
                  <p className="text-sm text-blue-300">SOC 2 Type II certified platform</p>
                </div>
              </div>
            </div>
          </div>

          {/* Shield illustration */}
          <div className="absolute bottom-12 right-12 opacity-10">
            <Shield className="w-64 h-64" strokeWidth={0.5} />
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
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
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Create Your Account</h2>
              <p className="text-sm text-gray-600">
                Join the MARi Secure Training Portal for enterprise-grade compliance training
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                      touched.firstName && validationState.firstName
                        ? validationState.firstName.isValid
                          ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500'
                          : 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                    placeholder="John"
                  />
                  {touched.firstName && validationState.firstName && !validationState.firstName.isValid && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {validationState.firstName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                      touched.lastName && validationState.lastName
                        ? validationState.lastName.isValid
                          ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500'
                          : 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                    placeholder="Doe"
                  />
                  {touched.lastName && validationState.lastName && !validationState.lastName.isValid && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {validationState.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Work Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                    touched.email && validationState.email
                      ? validationState.email.isValid
                        ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500'
                        : 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'
                  }`}
                  placeholder="john.doe@company.com"
                />
                <p className="text-xs text-gray-500 mt-1">Company email only</p>
                {touched.email && validationState.email && !validationState.email.isValid && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationState.email.message}
                  </p>
                )}
              </div>

              {/* Organization */}
              <div>
                <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Organization Name
                </label>
                <input
                  type="text"
                  id="organization"
                  name="organization"
                  value={formData.organization}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                    touched.organization && validationState.organization
                      ? validationState.organization.isValid
                        ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500'
                        : 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'
                  }`}
                  placeholder="Your Company Inc."
                />
                {touched.organization && validationState.organization && !validationState.organization.isValid && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationState.organization.message}
                  </p>
                )}
              </div>

              {/* Role */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                    touched.role && validationState.role
                      ? validationState.role.isValid
                        ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500'
                        : 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'
                  }`}
                >
                  <option value="">Select your role</option>
                  <option value="developer">Developer</option>
                  <option value="security-lead">Security Lead</option>
                  <option value="team-lead">Team Lead</option>
                  <option value="compliance-officer">Compliance Officer</option>
                </select>
                {touched.role && validationState.role && !validationState.role.isValid && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationState.role.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-3.5 py-2.5 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                      touched.password && validationState.password
                        ? validationState.password.isValid
                          ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500'
                          : 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                    placeholder="••••••••"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                {touched.password && validationState.password && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${
                    validationState.password.isValid ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {validationState.password.isValid ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    {validationState.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-3.5 py-2.5 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                      touched.confirmPassword && validationState.confirmPassword
                        ? validationState.confirmPassword.isValid
                          ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500'
                          : 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                    placeholder="••••••••"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                {touched.confirmPassword && validationState.confirmPassword && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${
                    validationState.confirmPassword.isValid ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {validationState.confirmPassword.isValid ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    {validationState.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Acknowledgement */}
              <div className="flex items-start gap-3 pt-2">
                <input
                  type="checkbox"
                  id="acknowledgement"
                  name="acknowledgement"
                  checked={formData.acknowledgement}
                  onChange={handleChange}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="acknowledgement" className="text-sm text-gray-700 cursor-pointer select-none">
                  I acknowledge compliance training requirements
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-[#1e3a5f] hover:bg-[#152d4a] text-white py-3 rounded-lg font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!formData.acknowledgement}
              >
                Create Secure Account
              </button>

              {/* Sign in link */}
              <div className="text-center pt-4">
                <p className="text-sm text-gray-600">
                  Already registered?{' '}
                  <Link to="/login" className="text-[#1e3a5f] hover:text-[#152d4a] font-medium hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-500">
            <p>© 2026 MARi Secure Training Portal. FedRAMP Compliant.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
