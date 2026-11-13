import React, { createContext, useContext, useEffect, useState } from 'react';
import { STAFF_ROLES } from '../lib/constants';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { getDemoState, saveDemoState, uid } from '../services/demoStore';
import type { Profile, UserRole } from '../types/database';

interface AuthContextValue {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  roles: UserRole[];
  isLoading: boolean;
  isStaff: boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; fullName: string; phone: string }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { full_name?: string; phone?: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const DEMO_SESSION_KEY = 'honda_demo_user_id';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSupabaseUser = async (userId: string, email: string) => {
    if (!supabase) return;
    const [{ data: prof }, { data: roleRows }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);
    setUser({ id: userId, email });
    setProfile((prof as Profile) ?? null);
    const parsedRoles = ((roleRows ?? []) as Array<{ role: UserRole }>).map((r) => r.role);
    setRoles(parsedRoles.length > 0 ? parsedRoles : ['customer']);
  };

  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured || !supabase) {
      const savedId = typeof window !== 'undefined' ? window.localStorage.getItem(DEMO_SESSION_KEY) : null;
      if (savedId) {
        const found = getDemoState().users.find((u) => u.id === savedId);
        if (found && active) {
          setUser({ id: found.id, email: found.email });
          setProfile(found.profile);
          setRoles(found.roles);
        }
      }
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (data.session?.user) {
        await loadSupabaseUser(data.session.user.id, data.session.user.email ?? '');
      }
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        void loadSupabaseUser(session.user.id, session.user.email ?? '');
      } else {
        setUser(null);
        setProfile(null);
        setRoles([]);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      const found = getDemoState().users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
      );
      if (!found) throw new Error('Invalid email or password');
      window.localStorage.setItem(DEMO_SESSION_KEY, found.id);
      setUser({ id: found.id, email: found.email });
      setProfile(found.profile);
      setRoles(found.roles);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
      await loadSupabaseUser(data.user.id, data.user.email ?? email);
    }
  };

  const signUp = async (input: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
  }) => {
    if (!isSupabaseConfigured || !supabase) {
      const s = getDemoState();
      const exists = s.users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase());
      if (exists) throw new Error('An account with this email already exists');
      const now = new Date().toISOString();
      const id = uid('user');
      const newRec = {
        id,
        email: input.email.trim(),
        password: input.password,
        roles: ['customer'] as UserRole[],
        profile: {
          id,
          full_name: input.fullName.trim(),
          phone: input.phone.trim(),
          email: input.email.trim(),
          avatar_url: null,
          loyalty_balance: 0,
          notes: null,
          created_at: now,
          updated_at: now,
        },
      };
      s.users.push(newRec);
      saveDemoState();
      window.localStorage.setItem(DEMO_SESSION_KEY, id);
      setUser({ id, email: newRec.email });
      setProfile(newRec.profile);
      setRoles(newRec.roles);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName,
          phone: input.phone,
        },
      },
    });
    if (error) throw error;
    if (data.user && data.session) {
      await supabase
        .from('profiles')
        .update({ full_name: input.fullName, phone: input.phone })
        .eq('id', data.user.id);
      await loadSupabaseUser(data.user.id, data.user.email ?? input.email);
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured || !supabase) {
      window.localStorage.removeItem(DEMO_SESSION_KEY);
      setUser(null);
      setProfile(null);
      setRoles([]);
      return;
    }
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: { full_name?: string; phone?: string }) => {
    if (!user) throw new Error('Not logged in');
    if (!isSupabaseConfigured || !supabase) {
      const s = getDemoState();
      const u = s.users.find((x) => x.id === user.id);
      if (!u) throw new Error('Profile not found');
      Object.assign(u.profile, updates, { updated_at: new Date().toISOString() });
      saveDemoState();
      setProfile({ ...u.profile });
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select('*')
      .single();
    if (error) throw error;
    setProfile(data as Profile);
  };

  const refreshProfile = async () => {
    if (!user) return;
    if (!isSupabaseConfigured || !supabase) {
      const u = getDemoState().users.find((x) => x.id === user.id);
      if (u) {
        setProfile({ ...u.profile });
        setRoles([...u.roles]);
      }
      return;
    }
    await loadSupabaseUser(user.id, user.email);
  };

  const hasRole = (target: UserRole | UserRole[]) => {
    const list = Array.isArray(target) ? target : [target];
    return roles.some((r) => list.includes(r));
  };

  const isStaff = roles.some((r) => STAFF_ROLES.includes(r));

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        roles,
        isLoading,
        isStaff,
        hasRole,
        signIn,
        signUp,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
