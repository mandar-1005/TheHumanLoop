import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, User, Mail, Lock, AlertCircle, Trash2 } from 'lucide-react';

interface ProfileFormData {
  name: string;
  email: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ValidationState {
  [key: string]: { isValid: boolean; message: string } | null;
}

export function AccountPage() {
  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: '',
    email: '',
  });

  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [profileTouched, setProfileTouched] = useState<{ [key: string]: boolean }>({});
  const [passwordTouched, setPasswordTouched] = useState<{ [key: string]: boolean }>({});
  const [profileValidation, setProfileValidation] = useState<ValidationState>({});
  const [passwordValidation, setPasswordValidation] = useState<ValidationState>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return { isValid: false, message: 'Email is required' };
    if (!emailRegex.test(email)) return { isValid: false, message: 'Invalid email format' };
    return { isValid: true, message: '' };
  };

  const validatePassword = (password: string) => {
    if (!password) return { isValid: false, message: 'Password is required' };
    if (password.length < 8) return { isValid: false, message: 'Minimum 8 characters' };
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return { isValid: false, message: 'Must contain uppercase, lowercase, and number' };
    }
    return { isValid: true, message: '' };
  };

  const validateConfirmPassword = (confirm: string, newPassword: string) => {
    if (!confirm) return { isValid: false, message: 'Please confirm password' };
    if (confirm !== newPassword) return { isValid: false, message: 'Passwords do not match' };
    return { isValid: true, message: '' };
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    if (profileTouched[name]) {
      const validation = name === 'email' ? validateEmail(value) : (value.length > 0 ? { isValid: true, message: '' } : { isValid: false, message: 'Name is required' });
      setProfileValidation(prev => ({ ...prev, [name]: validation }));
    }
  };

  const handleProfileBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileTouched(prev => ({ ...prev, [name]: true }));
    const validation = name === 'email' ? validateEmail(value) : (value.length > 0 ? { isValid: true, message: '' } : { isValid: false, message: 'Name is required' });
    setProfileValidation(prev => ({ ...prev, [name]: validation }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (passwordTouched[name]) {
      let validation = null;
      if (name === 'newPassword') validation = validatePassword(value);
      else if (name === 'confirmPassword') validation = validateConfirmPassword(value, passwordData.newPassword);
      else validation = value.length > 0 ? { isValid: true, message: '' } : { isValid: false, message: 'Current password is required' };
      setPasswordValidation(prev => ({ ...prev, [name]: validation }));
      if (name === 'newPassword' && passwordTouched.confirmPassword) {
        setPasswordValidation(prev => ({ ...prev, confirmPassword: validateConfirmPassword(passwordData.confirmPassword, value) }));
      }
    }
  };

  const handlePasswordBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordTouched(prev => ({ ...prev, [name]: true }));
    let validation = null;
    if (name === 'newPassword') validation = validatePassword(value);
    else if (name === 'confirmPassword') validation = validateConfirmPassword(value, passwordData.newPassword);
    else validation = value.length > 0 ? { isValid: true, message: '' } : { isValid: false, message: 'Current password is required' };
    setPasswordValidation(prev => ({ ...prev, [name]: validation }));
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = { name: true, email: true };
    setProfileTouched(allTouched);
    const nameValid = profileData.name.length > 0 ? { isValid: true, message: '' } : { isValid: false, message: 'Name is required' };
    const emailValid = validateEmail(profileData.email);
    setProfileValidation({ name: nameValid, email: emailValid });
    if (nameValid.isValid && emailValid.isValid) {
      // TODO: call backend to update profile
      console.log('Update profile:', profileData);
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = { currentPassword: true, newPassword: true, confirmPassword: true };
    setPasswordTouched(allTouched);
    const currentValid = passwordData.currentPassword.length > 0 ? { isValid: true, message: '' } : { isValid: false, message: 'Current password is required' };
    const newValid = validatePassword(passwordData.newPassword);
    const confirmValid = validateConfirmPassword(passwordData.confirmPassword, passwordData.newPassword);
    setPasswordValidation({ currentPassword: currentValid, newPassword: newValid, confirmPassword: confirmValid });
    if (currentValid.isValid && newValid.isValid && confirmValid.isValid) {
      // TODO: call backend to update password
      console.log('Update password');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordTouched({});
      setPasswordValidation({});
    }
  };

  const handleDeleteAccount = () => {
    // TODO: call backend to delete account
    console.log('Delete account');
    setShowDeleteModal(false);
  };

  const inputClass = (touched: boolean, validation: { isValid: boolean } | null) =>
    `w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
      touched && validation
        ? validation.isValid
          ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500'
          : 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
        : 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'
    }`;

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f172a] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col justify-center px-16 py-24 text-white">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">MARi</h1>
              <div className="text-xs text-blue-200 tracking-wider">SECURE TRAINING</div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-4xl font-semibold leading-tight">
                Account Settings
              </h2>
              <p className="text-blue-200 text-sm">
                Manage your profile and security
              </p>
            </div>
          </div>
          <div className="absolute bottom-12 right-12 opacity-10">
            <Shield className="w-64 h-64" strokeWidth={0.5} />
          </div>
        </div>
      </div>

      {/* Right Panel - Content */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">MARi Secure Training</h1>
            </div>
          </div>

          <div className="space-y-8">
            {/* Profile section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Profile</h2>
                <p className="text-sm text-gray-600">Update your name and email</p>
              </div>
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={profileData.name}
                      onChange={handleProfileChange}
                      onBlur={handleProfileBlur}
                      className={inputClass(!!profileTouched.name, profileValidation.name)}
                      placeholder="John Doe"
                    />
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {profileTouched.name && profileValidation.name && !profileValidation.name.isValid && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {profileValidation.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      onBlur={handleProfileBlur}
                      className={inputClass(!!profileTouched.email, profileValidation.email)}
                      placeholder="john.doe@company.com"
                    />
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {profileTouched.email && profileValidation.email && !profileValidation.email.isValid && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {profileValidation.email.message}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#1e3a5f] hover:bg-[#152d4a] text-white py-3 rounded-lg font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
                >
                  Save profile
                </button>
              </form>
            </div>

            {/* Password section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Change password</h2>
                <p className="text-sm text-gray-600">Update your password</p>
              </div>
              <form onSubmit={handleUpdatePassword} className="space-y-5">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Current password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      onBlur={handlePasswordBlur}
                      className={inputClass(!!passwordTouched.currentPassword, passwordValidation.currentPassword)}
                      placeholder="••••••••"
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {passwordTouched.currentPassword && passwordValidation.currentPassword && !passwordValidation.currentPassword.isValid && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {passwordValidation.currentPassword.message}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      onBlur={handlePasswordBlur}
                      className={inputClass(!!passwordTouched.newPassword, passwordValidation.newPassword)}
                      placeholder="••••••••"
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {passwordTouched.newPassword && passwordValidation.newPassword && !passwordValidation.newPassword.isValid && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {passwordValidation.newPassword.message}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      onBlur={handlePasswordBlur}
                      className={inputClass(!!passwordTouched.confirmPassword, passwordValidation.confirmPassword)}
                      placeholder="••••••••"
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {passwordTouched.confirmPassword && passwordValidation.confirmPassword && !passwordValidation.confirmPassword.isValid && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {passwordValidation.confirmPassword.message}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#1e3a5f] hover:bg-[#152d4a] text-white py-3 rounded-lg font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
                >
                  Update password
                </button>
              </form>
            </div>

            {/* Danger zone */}
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Delete account</h2>
                <p className="text-sm text-gray-600">Permanently delete your account and all data. This cannot be undone.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center justify-center gap-2 w-full border border-red-300 text-red-600 hover:bg-red-50 py-3 rounded-lg font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:ring-offset-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete account
              </button>
            </div>

            <div className="text-center">
              <Link to="/login" className="text-sm text-[#1e3a5f] hover:text-[#152d4a] font-medium hover:underline">
                Back to sign in
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-gray-500">
            <p>© 2026 MARi Secure Training Portal. FedRAMP Compliant.</p>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete account?</h3>
                <p className="text-sm text-gray-600">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              All your data will be permanently removed. Are you sure you want to continue?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-lg font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2"
              >
                Delete account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
