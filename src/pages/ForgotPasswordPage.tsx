import React, { useState } from 'react';
import { NextGenAPI } from '../api/NextGenAPI';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';

// Public page (outside RequireAuth). Requests a password-reset email via the
// existing backend endpoint, passing platform:'web' so the emailed link points at
// this CRM's /reset-password page. Enumeration-safe: the confirmation is identical
// whether or not the address has an account (the backend also responds generically).
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await NextGenAPI.post('/auth/forgot-password', { email, platform: 'web' });
      // Always show the same generic message — never reveal whether the account exists.
      setSubmitted(true);
    } catch {
      // Only transport-level failures surface here; still no account-existence signal.
      setError('Something went wrong sending the reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Reset your password</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {submitted ? (
            <div className="space-y-6">
              <div className="bg-green-50 text-green-800 p-3 rounded-md text-sm">
                If an account exists for <strong>{email}</strong>, we've sent a link to reset your
                password. Check your inbox (and spam) — the link expires in 1 hour.
              </div>
              <Link to="/login" className="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-500">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <p className="text-sm text-gray-600">
                Enter your email address and we'll send you a link to choose a new password.
              </p>
              {error && <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700">Email address</label>
                <div className="mt-1">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isLoading ? 'Sending…' : 'Send reset link'}
                </button>
              </div>
              <Link to="/login" className="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-500">
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}