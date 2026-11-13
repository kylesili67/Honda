import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessAdminModule, type AdminModuleKey } from '../../lib/constants';
import { Button, Skeleton } from '../ui/Primitives';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
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

  return <>{children}</>;
}

export function RequireStaff({
  children,
  module,
}: {
  children: React.ReactNode;
  module?: AdminModuleKey;
}) {
  const { user, isStaff, roles, isLoading, signOut } = useAuth();
  const location = useLocation();

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

  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F6] p-6">
        <div className="max-w-md rounded-xl border border-[#E3E4E7] bg-white p-8 text-center">
          <h1 className="font-display text-3xl font-bold text-[#111214]">Not Authorized</h1>
          <p className="mt-2 text-sm text-[#6B7078]">
            Your account does not hold staff permissions for the admin console.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => void signOut()}>
              Switch Account
            </Button>
            <a href="/">
              <Button>Back to Showroom</Button>
            </a>
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
