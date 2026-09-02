import React, { useState } from 'react';
import { NextGenAPI } from '../api/NextGenAPI';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';

// Public page (no auth) — an invited staff member sets their password here.
// Flow: POST /brain/team/accept-invite (provisions the login account with the
// org + role from the stored invite) → auto-login via /auth/signin → dashboard.
// The invitee's email is NOT typed here; it comes back from the accept response,
// so we sign in with exactly the account the backend just created.
export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { login } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');                // a TRUE, non-failing ending (e.g. link already used)
  const [offerLogin, setOfferLogin] = useState(false); // show a "Go to login" affordance
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setOfferLogin(false);

    // Client-side validation mirrors the backend (>= 8 chars) plus a match check.
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('The two passwords do not match.'); return; }

    setIsLoading(true);
    try {
      // 1. Accept the invitation → creates auth_core.user_profiles (org + role from the invite).
      const acceptRes = await NextGenAPI.post('/brain/team/accept-invite', { token, password, fullName });

      // A LINK CLICKED TWICE IS NOT A FAILED FLOW. People open the invitation on
      // the phone and again on the laptop, and some mail clients pre-fetch the
      // link and spend it before anyone touches it. The backend answers 200 with
      // this flag (and writes nothing, so the original accepted_at stands), so
      // the honest ending is "your account exists, go and sign in" — not the red
      // error box this used to show with no way forward.
      if (acceptRes.data?.data?.alreadyAccepted) {
        setIsLoading(false);
        setInfo(acceptRes.data?.message || 'This invitation has already been used. Your account exists — please sign in.');
        setOfferLogin(true);
        return;
      }

      const email = acceptRes.data?.data?.email;
      if (!acceptRes.data?.success || !email) {
        throw { error: acceptRes.data?.error || 'Could not accept the invitation.' };
      }

      // 2. Auto-login with the same credentials — identical to a normal login.
      try {
        const signinRes = await NextGenAPI.post('/auth/signin', { email, password });
        if (signinRes.data?.success && signinRes.data?.data?.token) {
          login(signinRes.data.data.token);
          navigate('/', { replace: true });
          return;
        }
        throw new Error('signin-returned-no-token');
      } catch {
        // Account exists now, but auto-login didn't complete — never leave a
        // hanging spinner; route them to login with the password they just set.
        setIsLoading(false);
        setError('Your account is ready. Please sign in with the password you just set.');
        setOfferLogin(true);
      }
    } catch (err: any) {
      // The axios interceptor rejects with the response body ({ success, error }),
      // so the backend's specific message is surfaced verbatim.
      const msg: string =
        err?.error ||
        'Could not accept the invitation. The link may be invalid or expired.';
      setError(msg);
      // 409 "already exists" → offer a route to login instead.
      if (/already exists|already been used/i.test(msg)) setOfferLogin(true);
      setIsLoading(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Accept your invitation
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Set a password to join Client Manager
        </p>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">{children}</div>
      </div>
    </div>
  );

  const loginLink = (
    <Link
      to="/login"
      className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      Go to login
    </Link>
  );

  // No token in the URL → the link is malformed; show it immediately, no form.
  if (!token) {
    return shell(
      <div>
        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
          This invitation link is invalid or incomplete. Please use the link from your invitation email.
        </div>
        {loginLink}
      </div>
    );
  }

  return shell(
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm cursor-text">
          {error}
        </div>
      )}
      {info && (
        <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm cursor-text">
          {info}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Full name</label>
        <div className="mt-1">
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <div className="mt-1">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">At least 8 characters.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Confirm password</label>
        <div className="mt-1">
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
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
          {isLoading ? 'Setting up your account...' : 'Set password & continue'}
        </button>
      </div>

      {offerLogin && loginLink}
    </form>
  );
}
