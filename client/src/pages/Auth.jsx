import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useStudent } from '../context/StudentContext';
import Button from '../components/common/Button';

const Auth = () => {
  const navigate = useNavigate();
  const { fetchStudent } = useStudent();
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (mode === 'register') {
      if (!formData.name.trim()) {
        setError('Please enter your name');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    try {
      setLoading(true);

      if (mode === 'register') {
        const { data } = await authAPI.register({
          name: formData.name,
          email: formData.email,
          password: formData.password
        });
        authAPI.setToken(data.token);
      } else {
        const { data } = await authAPI.login({
          email: formData.email,
          password: formData.password
        });
        authAPI.setToken(data.token);
      }

      // Refresh student data
      await fetchStudent();

      // Redirect to setup or home
      navigate('/setup');
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = () => {
    navigate('/setup');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ICAN IELTS AI Simulator
          </h1>
          <p className="text-gray-600">
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Mode Toggle */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-md font-medium transition-all ${
                mode === 'login'
                  ? 'bg-white text-blue-600 shadow'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-md font-medium transition-all ${
                mode === 'register'
                  ? 'bg-white text-blue-600 shadow'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Register
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your name"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-sm text-gray-500">or</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* Guest Continue */}
          <button
            onClick={handleGuestContinue}
            className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Continue as Guest
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            Guest data is saved on this device only
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-3">Why create an account?</p>
          <div className="flex justify-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="text-green-500">✓</span> Access from any device
            </span>
            <span className="flex items-center gap-1">
              <span className="text-green-500">✓</span> Track all progress
            </span>
            <span className="flex items-center gap-1">
              <span className="text-green-500">✓</span> Never lose data
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
