import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { usePageMeta } from '../../lib/seo';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { Button, Card, Input, Skeleton } from '../../components/ui/Primitives';
import { Logo } from '../../components/brand/Logo';

function getSafeRedirect(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return null;
}

export function LoginPage({ adminMode = false }: { adminMode?: boolean }) {
  const { settings } = useSettings();
  const { user, isStaff, isLoading, authError, signIn, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const safeRedirect = getSafeRedirect(params.get('redirect'));

  usePageMeta({
    title: `${adminMode ? 'Staff Login' : 'Customer Login'} | ${settings.brand_name}`,
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // If already logged in with valid role state, handle redirects safely without loops
  if (!isLoading && user && !authError) {
    if (!adminMode) {
      const target = safeRedirect || (isStaff ? '/admin' : '/account');
      return <Navigate to={target} replace />;
    }
    if (isStaff) {
      const target = safeRedirect && safeRedirect.startsWith('/admin') ? safeRedirect : '/admin';
      return <Navigate to={target} replace />;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
      toast({ title: 'Signed in successfully', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Sign in failed',
        description: err instanceof Error ? err.message : 'Check your credentials',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRetryRoles = async () => {
    setBusy(true);
    try {
      await refreshProfile();
    } catch (err) {
      toast({
        title: 'Retry failed',
        description: err instanceof Error ? err.message : 'Unable to load roles',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
    } catch (err) {
      toast({
        title: 'Sign out failed',
        description: err instanceof Error ? err.message : 'Unable to sign out',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card className="p-6 sm:p-8 space-y-5">
        <div>
          <Logo variant="full" height={34} className="mb-4" />
          <h1 className="font-display text-3xl font-bold text-[#111214]">
            {adminMode ? 'Showroom Staff Portal' : 'Customer Sign In'}
          </h1>
          <p className="mt-1 text-sm text-[#6B7078]">
            {adminMode
              ? 'Authorized showroom staff only.'
              : 'Access your bookings, orders, service history, and loyalty points.'}
          </p>
        </div>

        {authError && (
          <div className="rounded-lg border border-[#C0262D]/30 bg-[#C0262D]/5 p-4 text-sm text-[#111214] space-y-3">
            <p className="font-medium text-[#C0262D]">{authError}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" loading={busy} onClick={() => void handleRetryRoles()}>
                Dobara Try Karein
              </Button>
              <Button size="sm" variant="ghost" loading={busy} onClick={() => void handleSignOut()}>
                Sign Out
              </Button>
            </div>
          </div>
        )}

        {adminMode && !isLoading && user && !isStaff && !authError ? (
          <div className="rounded-lg border border-[#E3E4E7] bg-[#F5F5F6] p-5 space-y-3">
            <p className="text-sm font-semibold text-[#111214]">This account is not staff</p>
            <p className="text-xs text-[#6B7078]">
              You are signed in as {user.email}, which does not have showroom staff access. Sign out to switch to a staff account or return to the customer portal.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" loading={busy} onClick={() => void handleSignOut()}>
                Sign Out
              </Button>
              <Link to="/account">
                <Button size="sm">Customer Account</Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" size="lg" className="w-full" loading={busy} disabled={busy}>
              Sign In
            </Button>
          </form>
        )}

        {!isSupabaseConfigured && (
          <div className="rounded-lg border border-[#E3E4E7] bg-[#F5F5F6] p-3.5 text-xs text-[#26282C] space-y-1.5">
            <p className="font-semibold text-[#111214]">Demo Preview Accounts (Supabase Unconfigured)</p>
            {adminMode ? (
              <>
                <p>Super Admin: <code>admin@demo.pk</code> / <code>Password123!</code></p>
                <p>Sales Staff: <code>sales@demo.pk</code> / <code>Password123!</code></p>
              </>
            ) : (
              <p>Customer: <code>customer@demo.pk</code> / <code>Password123!</code></p>
            )}
            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail(adminMode ? 'admin@demo.pk' : 'customer@demo.pk');
                  setPassword('Password123!');
                }}
                className="text-xs font-semibold text-[#D71920] hover:underline cursor-pointer"
              >
                Fill Demo Credentials
              </button>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-[#E3E4E7] flex items-center justify-between text-xs">
          <Link to="/forgot-password" className="text-[#6B7078] hover:text-[#111214]">
            Forgot password?
          </Link>
          {!adminMode && (
            <Link to="/signup" className="font-semibold text-[#D71920] hover:underline">
              Create account
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}

export function SignupPage() {
  const { settings } = useSettings();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  usePageMeta({ title: `Create Account | ${settings.brand_name}` });

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      const result = await signUp({ email, password, fullName, phone });
      if (result.needsEmailConfirmation) {
        setConfirmationSentTo(email);
        toast({
          title: 'Confirm your email',
          description: 'Check your email to confirm your account before signing in.',
          variant: 'info',
        });
        return;
      }
      toast({ title: 'Account created', variant: 'success' });
      navigate('/account');
    } catch (err) {
      toast({
        title: 'Signup failed',
        description: err instanceof Error ? err.message : 'Unable to register',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card className="p-6 sm:p-8 space-y-5">
        <div>
          <Logo variant="full" height={34} className="mb-4" />
          <h1 className="font-display text-3xl font-bold text-[#111214]">Create Account</h1>
          <p className="mt-1 text-sm text-[#6B7078]">
            Book motorcycles, track registration, and earn loyalty points on gear &amp; service.
          </p>
        </div>

        {confirmationSentTo ? (
          <div className="rounded-lg border border-[#1E8E4E]/30 bg-[#1E8E4E]/5 p-5 space-y-3">
            <h2 className="text-base font-semibold text-[#111214]">Check Your Email</h2>
            <p className="text-sm text-[#26282C]">
              We sent a confirmation link to <strong>{confirmationSentTo}</strong>. Check your email to confirm your account, then sign in.
            </p>
            <Link to="/login" className="block">
              <Button className="w-full">Go to Sign In</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full Name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Input label="Phone Number" required placeholder="+92 300 ..." value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Email Address" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input
              label="Password"
              type="password"
              required
              hint="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" size="lg" className="w-full" loading={busy} disabled={busy}>
              Create Customer Account
            </Button>
          </form>
        )}

        <p className="text-xs text-center text-[#6B7078]">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-[#D71920] hover:underline">
            Sign In
          </Link>
        </p>
      </Card>
    </div>
  );
}

export function ForgotPasswordPage() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  usePageMeta({ title: `Forgot Password | ${settings.brand_name}` });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
      }
      setSent(true);
      toast({ title: 'Password reset link sent if account exists', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Unable to send reset link',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card className="p-6 sm:p-8 space-y-4">
        <h1 className="font-display text-3xl font-bold text-[#111214]">Reset Password</h1>
        {sent ? (
          <div className="space-y-3">
            <p className="text-sm text-[#1E8E4E]">
              Check your inbox for a password reset link directing back to this site.
            </p>
            <Link to="/login" className="inline-block text-xs font-semibold text-[#D71920] hover:underline">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Account Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" className="w-full" loading={busy} disabled={busy}>
              Send Reset Link
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

export function ResetPasswordPage() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  usePageMeta({ title: `Set New Password | ${settings.brand_name}` });

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured || !supabase) {
      setHasSession(true);
      setChecking(false);
      return;
    }

    const client = supabase;
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setHasSession(true);
        setLinkError(null);
        setChecking(false);
      }
    });

    const verifyRecovery = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashRaw = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
        const hashParams = new URLSearchParams(hashRaw);

        const errParam =
          hashParams.get('error_description') ||
          hashParams.get('error') ||
          searchParams.get('error_description') ||
          searchParams.get('error');

        if (errParam) {
          if (active) {
            setLinkError('Link expired or invalid. Please request a new reset link.');
            setHasSession(false);
          }
          return;
        }

        const code = searchParams.get('code');
        if (code) {
          const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            if (active) {
              setLinkError('Link expired or invalid. Please request a new reset link.');
              setHasSession(false);
            }
            return;
          }
        }

        const { data, error: sessionErr } = await client.auth.getSession();
        if (sessionErr) throw sessionErr;
        if (active && data.session) {
          setHasSession(true);
        }
      } catch {
        if (active) {
          setLinkError('Unable to verify recovery link. Please request a new reset link.');
        }
      } finally {
        if (active) setChecking(false);
      }
    };

    void verifyRecovery();

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: 'Minimum 8 characters required', variant: 'error' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }
      toast({ title: 'Password updated', variant: 'success' });
      navigate('/login');
    } catch (err) {
      toast({
        title: 'Reset failed',
        description: err instanceof Error ? err.message : 'Unable to update password',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card className="p-6 sm:p-8 space-y-4">
        <h1 className="font-display text-3xl font-bold text-[#111214]">Set New Password</h1>
        {checking ? (
          <Skeleton className="h-32 w-full" />
        ) : linkError || !hasSession ? (
          <div className="space-y-4">
            <p className="text-sm text-[#C0262D]">
              {linkError || 'Please open the password reset link from your email to continue.'}
            </p>
            <Link to="/forgot-password" className="block">
              <Button className="w-full">Request New Reset Link</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              required
              hint="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              label="Confirm Password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button type="submit" className="w-full" loading={busy} disabled={busy}>
              Save New Password
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
