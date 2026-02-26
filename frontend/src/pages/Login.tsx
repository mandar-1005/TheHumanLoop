import { useState } from 'react';
import { Shield, Lock, AlertCircle, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface ValidationState {
  [key: string]: { isValid: boolean; message: string } | null;
}

export function LoginPage() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [validationState, setValidationState] = useState<ValidationState>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);

    if (!email) return { isValid: false, message: 'Email is required' };
    if (!isValid) return { isValid: false, message: 'Invalid email format' };
    return { isValid: true, message: '' };
  };

  const validatePassword = (password: string) => {
    if (!password) return { isValid: false, message: 'Password is required' };
    return { isValid: true, message: '' };
  };

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'email':
        return validateEmail(value);
      case 'password':
        return validatePassword(value);
      default:
        return null;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? e.target.checked : value;

    setFormData(prev => ({ ...prev, [name]: newValue }));

    if (touched[name]) {
      const validation = validateField(name, value);
      setValidationState(prev => ({ ...prev, [name]: validation }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
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
      if (key !== 'rememberMe') {
        allValidations[key] = validateField(key, formData[key as keyof FormData] as string);
      }
    });

    setTouched(allTouched);
    setValidationState(allValidations);

    const isValid = Object.values(allValidations).every(v => v?.isValid !== false);

    if (isValid) {
      console.log('Login submitted:', formData);
      alert('Login successful! (Demo)');
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
                Welcome Back to<br />Secure Training
              </h2>
              <p className="text-blue-200 text-sm">
                Access your FedRAMP compliance training dashboard
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="space-y-1">
                <div className="text-3xl font-bold">99.9%</div>
                <div className="text-sm text-blue-300">Uptime SLA</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold">24/7</div>
                <div className="text-sm text-blue-300">Support</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold">SOC 2</div>
                <div className="text-sm text-blue-300">Certified</div>
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
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Sign In</h2>
              <p className="text-sm text-gray-600">
                Access your compliance training portal
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Work Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`w-full px-3.5 py-2.5 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                      touched.email && validationState.email
                        ? validationState.email.isValid
                          ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500'
                          : 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                    placeholder="john.doe@company.com"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                {touched.email && validationState.email && !validationState.email.isValid && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationState.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <a href="#" className="text-xs text-[#1e3a5f] hover:text-[#152d4a] font-medium hover:underline">
                    Forgot password?
                  </a>
                </div>
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
                {touched.password && validationState.password && !validationState.password.isValid && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationState.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="rememberMe" className="text-sm text-gray-700 cursor-pointer select-none">
                  Remember me for 30 days
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-[#1e3a5f] hover:bg-[#152d4a] text-white py-3 rounded-lg font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
              >
                Sign In Securely
              </button>

              {/* Divider */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-500">New to MARi?</span>
                </div>
              </div>

              {/* Register link */}
              <Link
                to="/register"
                className="block w-full text-center border border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white py-3 rounded-lg font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
              >
                Create Secure Account
              </Link>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-500">
            <p>© 2026 MARi Secure Training Portal. FedRAMP Compliant.</p>
            <div className="mt-2 space-x-4">
              <a href="#" className="hover:text-gray-700 hover:underline">Privacy Policy</a>
              <a href="#" className="hover:text-gray-700 hover:underline">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
