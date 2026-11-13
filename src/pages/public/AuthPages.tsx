import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { usePageMeta } from '../../lib/seo';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { Button, Card, Input } from '../../components/ui/Primitives';
import { Logo } from '../../components/brand/Logo';

export function LoginPage({ adminMode = false }: { adminMode?: boolean }) {
  const { settings } = useSettings();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || (adminMode ? '/admin' : '/account');

  usePageMeta({
    title: `${adminMode ? 'Staff Login' : 'Customer Login'} | ${settings.brand_name}`,
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
      toast({ title: 'Signed in successfully', variant: 'success' });
      navigate(redirect, { replace: true });
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
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Sign In
          </Button>
        </form>

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      await signUp({ email, password, fullName, phone });
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
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            Create Customer Account
          </Button>
        </form>

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
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'error' });
        return;
      }
    }
    setSent(true);
    toast({ title: 'Password reset link sent if account exists', variant: 'success' });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card className="p-6 sm:p-8 space-y-4">
        <h1 className="font-display text-3xl font-bold text-[#111214]">Reset Password</h1>
        {sent ? (
          <p className="text-sm text-[#1E8E4E]">
            Check your inbox for a password reset link directing back to this site.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Account Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" className="w-full">
              Send Reset Link
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

export function ResetPasswordPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: 'Minimum 8 characters required', variant: 'error' });
      return;
    }
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ title: 'Reset failed', description: error.message, variant: 'error' });
        return;
      }
    }
    toast({ title: 'Password updated', variant: 'success' });
    navigate('/login');
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card className="p-6 sm:p-8 space-y-4">
        <h1 className="font-display text-3xl font-bold text-[#111214]">Set New Password</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" className="w-full">
            Save New Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
