import React, { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { canAccessAdminModule, type AdminModuleKey } from '../../lib/constants';
import { Button, Skeleton } from '../ui/Primitives';

function AuthRoleErrorCard() {
  const { authError, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleRetry = async () => {
    setBusy(true);
    try {
      await refreshProfile();
    } catch (err) {
      toast({
        title: 'Retry failed',
        description: err instanceof Error ? err.message : 'Unable to load account roles',
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
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F6] p-6">
      <div className="max-w-md w-full rounded-xl border border-[#E3E4E7] bg-white p-8 text-center space-y-4">
        <h1 className="font-display text-3xl font-bold text-[#111214]">Account Verification Issue</h1>
        <p className="text-sm text-[#C0262D]">
          {authError || 'Roles load nahi ho sake, dobara try karein.'}
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Button loading={busy} disabled={busy} onClick={() => void handleRetry()}>
            Dobara Try Karein
          </Button>
          <Button variant="outline" loading={busy} disabled={busy} onClick={() => void handleSignOut()}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading, authError } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (authError) {
    return <AuthRoleErrorCard />;
  }

  return <>{children}</>;
}

export function RequireStaff({
  children,
  module,
}: {
  children: React.ReactNode;
  module?: AdminModuleKey;
}) {
  const { user, isStaff, roles, isLoading, authError, signOut } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [signingOut, setSigningOut] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/admin/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (authError) {
    return <AuthRoleErrorCard />;
  }

  if (!isStaff) {
    const handleSwitch = async () => {
      setSigningOut(true);
      try {
        await signOut();
      } catch (err) {
        toast({
          title: 'Sign out failed',
          description: err instanceof Error ? err.message : 'Unable to sign out',
          variant: 'error',
        });
      } finally {
        setSigningOut(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F6] p-6">
        <div className="max-w-md rounded-xl border border-[#E3E4E7] bg-white p-8 text-center">
          <h1 className="font-display text-3xl font-bold text-[#111214]">Not Authorized</h1>
          <p className="mt-2 text-sm text-[#6B7078]">
            Your account does not hold staff permissions for the admin console.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="outline" loading={signingOut} disabled={signingOut} onClick={() => void handleSwitch()}>
              Switch Account
            </Button>
            <Link to="/">
              <Button>Back to Showroom</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (module && !canAccessAdminModule(roles, module)) {
    return (
      <div className="rounded-xl border border-[#E3E4E7] bg-white p-8 text-center">
        <h2 className="font-display text-2xl font-bold text-[#111214]">Access Denied</h2>
        <p className="mt-2 text-sm text-[#6B7078]">
          Your staff role does not have access to this module.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
