import React, { useState } from 'react';
import { NextGenAPI } from '../api/NextGenAPI';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2 } from 'lucide-react';

// Public page (outside RequireAuth). Reads the ?token= from the emailed reset link,
// collects + confirms a new password, and posts to the existing /auth/reset-password
// endpoint. On success the backend has already rehashed the password, consumed the
// single-use token, and revoked refresh tokens — so we just send the user to sign in.
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false); // token rejected → offer a fresh request
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setIsLoading(true);
    try {
      await NextGenAPI.post('/auth/reset-password', { token, newPassword: password });
      navigate('/login', {
        replace: true,
        state: { notice: 'Your password has been reset — please sign in with your new password.' },
      });
    } catch (err: any) {
      // Backend returns 400 "Invalid or expired token" for a bad/expired/used token.
      const msg: string = err?.error || '';
      if (/invalid|expired|token/i.test(msg)) {
        setExpired(true);
        setError('This reset link is invalid or has expired.');
      } else {
        setError('Could not reset your password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Choose a new password</h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">{children}</div>
      </div>
    </div>
  );

  // No token in the URL → the link is malformed or was opened directly.
  if (!token) {
    return (
      <Shell>
        <div className="space-y-6">
          <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
            This password-reset link is missing its token. Please request a new one.
          </div>
          <Link to="/forgot-password" className="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-500">
            Request a new reset link
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
            {error}
            {expired && (
              <>
                {' '}
                <Link to="/forgot-password" className="font-medium underline hover:text-red-800">
                  Request a new link
                </Link>.
              </>
            )}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700">New password</label>
          <div className="mt-1">
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">At least 8 characters.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Confirm new password</label>
          <div className="mt-1">
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            {isLoading ? 'Resetting…' : 'Reset password'}
          </button>
        </div>
        <Link to="/login" className="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-500">
          Back to sign in
        </Link>
      </form>
    </Shell>
  );
}